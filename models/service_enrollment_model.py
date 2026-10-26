from datetime import datetime

from sqlalchemy import or_
from models import db
from models.other_service_model import Other_Service
from models.payment_model import Payment
from models.student_model import Student

class Service_Enrollment(db.Model):
    __tablename__ = 'service_enrollment'

    service_enrollment_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'))
    service_id = db.Column(db.Integer, db.ForeignKey('other_service.service_id'))
    enroll_datetime = db.Column(db.DateTime, nullable=False)
    address = db.Column(db.Text)
    status = db.Column(db.String(10), nullable=False)

    student = db.relationship("Student", back_populates="service_enrollments")
    service = db.relationship("Other_Service", back_populates="enrollments")
    

    @classmethod
    def get_enrollment_filtered(
        cls,
        student_name_email=None,
        service_name=None,
        status=None,
        min_enroll_date=None,
        max_enroll_date=None,
        sort='enroll_datetime',
        dir='desc'
    ):
        from models.system_user_model import System_User
        from models.other_service_model import Other_Service
        from models.student_model import Student

        query = db.session.query(cls)\
            .join(cls.student)\
            .join(Student.user)\
            .join(cls.service)

        # --- Filters ---
        if student_name_email:
            query = query.filter(
                or_(
                    System_User.name.ilike(f"%{student_name_email}%"),
                    System_User.email.ilike(f"%{student_name_email}%")
                )
            )

        if service_name:
            query = query.filter(Other_Service.name.ilike(f"%{service_name}%"))

        if status:
            query = query.filter(cls.status == status)

        if min_enroll_date:
            query = query.filter(cls.enroll_datetime >= min_enroll_date)
        if max_enroll_date:
            query = query.filter(cls.enroll_datetime <= max_enroll_date)

        # --- Sorting ---
        sort_column = None
        if sort in ['enroll_datetime', 'status']:
            sort_column = getattr(cls, sort)
        elif sort == 'student_name':
            sort_column = System_User.name
        elif sort == 'service_name':
            sort_column = Other_Service.name

        if sort_column is not None:
            query = query.order_by(sort_column.desc() if dir == 'desc' else sort_column.asc())
        else:
            query = query.order_by(cls.enroll_datetime.desc())

        return query
    
    @classmethod
    def get_enrolled_service(cls, student_id):
        return (
        db.session.query(cls.service_id)
            .filter(
                cls.student_id == student_id,
                cls.status == '1'
            )
            .all()
        )

    @classmethod
    def add_multiple(cls, enrollments_data):
        """
        Add multiple service enrollments + create a combined pending payment.
        Returns tuple (success, result_data) for controller to handle email.
        """
        from models import Payment, Payment_Detail, Other_Service, Student
        from datetime import datetime

        try:
            total_fee = 0.00
            payment_details = []
            student_id = None

            # 1️⃣ Create all enrollments and calculate total fees
            for data in enrollments_data:
                student_id = data['student_id']
                service_id = data['service_id']
                address = data.get('address')
                status = data.get('status', '1')

                # Add enrollment
                new_enrollment = cls(
                    student_id=student_id,
                    service_id=service_id,
                    address=address,
                    status=status,
                    enroll_datetime=datetime.utcnow()
                )
                db.session.add(new_enrollment)

                # Fetch service info
                service = Other_Service.get_by_id(service_id)
                if not service:
                    continue

                # Determine applicable fee
                if service.fee_type == '1':
                    fee = float(service.service_fee_per_month)
                elif service.fee_type == '2':
                    fee = float(service.deposit_fee)
                else:
                    fee = 0.00

                total_fee += fee
                payment_details.append({
                    'service_name': service.name,
                    'service_fee': fee
                })

            if not payment_details:
                db.session.rollback()
                print("No valid services found to enroll.")
                return False, None

            # 2️⃣ Create payment
            payment = Payment(
                student_id=student_id,
                discount_amt=0.00,
                final_amt=total_fee,
                received_amt=0.00,
                change_amt=0.00,
                payment_method=None,
                payment_datetime=None,
                created_datetime=datetime.utcnow(),
                payment_status='0'
            )
            db.session.add(payment)
            db.session.flush()

            # 3️⃣ Add payment details
            for detail_data, service in zip(payment_details, [Other_Service.get_by_id(d['service_id']) for d in enrollments_data]):
                service_id = data['service_id']
                if not service:
                    continue

                # Determine Payment_Detail fee_type based on service.fee_type
                if service.fee_type == '1':
                    fee_type = '1'
                else:
                    fee_type = '2'

                db.session.add(Payment_Detail(
                    payment_id=payment.payment_id,
                    service_id=service_id,
                    service_name=detail_data['service_name'],
                    service_fee=detail_data['service_fee'],
                    fee_type=fee_type
                ))


            db.session.commit()

            # 4️⃣ Prepare return data for controller
            student = Student.get_by_id(student_id)
            if student:
                student.payment_status = '0'

            # safe helpers
            def safe_attr(obj, attr, default=None):
                try:
                    val = getattr(obj, attr)
                    return val if val is not None else default
                except Exception:
                    return default

            parent_name = None
            parent_email = None
            student_name = safe_attr(student, "user.name", None)  # will not work directly; do relationship access below

            # Proper safe access following relations:
            student_name = None
            try:
                if student and student.user:
                    student_name = safe_attr(student.user, "name", "Student")
            except Exception:
                student_name = "Student"

            try:
                if student and student.parent and getattr(student.parent, "user", None):
                    parent_user = student.parent.user
                    parent_name = safe_attr(parent_user, "name", "Parent")
                    parent_email = safe_attr(parent_user, "email", None)
            except Exception:
                parent_name = parent_name or "Parent"
                parent_email = parent_email or None

            result_data = {
                "student_name": student_name,
                "parent_name": parent_name,
                "parent_email": parent_email,
                "total_fee": total_fee,
                "payment_details": payment_details
            }

            return True, result_data

        except Exception as e:
            db.session.rollback()
            print(f"Error inserting service enrollments with payment: {e}")
            return False, None


    @classmethod
    def update_address(cls, service_enrollment_id, new_address):
        """
        Update only the address of a service enrollment.
        Returns True if successful, or False if enrollment not found or fails.
        """
        try:
            enrollment = cls.query.filter_by(service_enrollment_id=service_enrollment_id).first()

            if not enrollment:
                return False, "Enrollment not found."

            enrollment.address = new_address

            db.session.commit()
            return True, "Address updated successfully."

        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] update_address(): {e}")
            return False, "Database error occurred."
        

    @classmethod
    def deactivate_enrollment(cls, service_enrollment_id):
        enrollment = cls.query.filter_by(service_enrollment_id=service_enrollment_id).first()
        if not enrollment:
            return False  # Enrollment not found

        try:
            enrollment.status = '0'
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error deactivating enrollment: {e}")
            return False
        
    @classmethod
    def deactivate_enrollment_for_barred(cls, student_id, service_id):
        enrollments = cls.query.filter_by(
            student_id=student_id,
            service_id=service_id,
            status="1"
        ).all()

        if not enrollments:
            return False

        try:
            for e in enrollments:
                e.status = "0"

            db.session.commit()
            return True

        except Exception as e:
            db.session.rollback()
            print(f"Error deactivating enrollment: {e}")
            return False

    @classmethod
    def get_active_by_student(cls, student_id):
        """Return all active service enrollments for a student."""
        return cls.query.filter_by(student_id=student_id, status='1').all()

    @staticmethod
    def bulk_create_from_payment(payment_id, service_ids, address=None):

        created = []

        payment = Payment.query.get(payment_id)
        student_id = payment.student_id

        for sid in service_ids:
            svc = Other_Service.query.get(sid)

            # Transport ONLY
            if svc.service_type == "2":
                enroll = Service_Enrollment(
                    student_id=student_id,
                    service_id=sid,
                    enroll_datetime=datetime.utcnow(),
                    status="1",
                    address=address
                )
            else:
                enroll = Service_Enrollment(
                    student_id=student_id,
                    service_id=sid,
                    enroll_datetime=datetime.utcnow(),
                    status="1"
                )

            db.session.add(enroll)
            db.session.flush()

            created.append({
                "service_id": sid,
            })

        db.session.commit()
        return created


