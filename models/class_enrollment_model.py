from datetime import datetime
from sqlalchemy import func, or_
from models import db
from models.class_detail_model import Class_Detail

from models.student_model import Student
from models.subject_model import Subject
from models.system_user_model import System_User
from models.tutor_model import Tutor

class Class_Enrollment(db.Model):
    __tablename__ = 'class_enrollment'

    class_enrollment_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=False)
    set_id = db.Column(db.Integer, db.ForeignKey('schedule_package_set.set_id'), nullable=False)
    class_detail_id = db.Column(db.Integer, db.ForeignKey('class_detail.class_detail_id'), nullable=False)
    enroll_datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(10), nullable=False)

    student = db.relationship('Student', back_populates='enrollments')
    class_detail = db.relationship('Class_Detail', back_populates='enrollments')
    package_set = db.relationship('Schedule_Package_Set', back_populates='enrollments')
    payment_details = db.relationship('Payment_Detail', back_populates='class_enrollment')

    @classmethod
    def get_enrollment_filtered(
        cls,
        student_name_email=None,
        subject_name=None,
        class_id=None,
        status=None,
        intake_year=None,
        min_enroll_date=None,
        max_enroll_date=None,
        sort='enroll_datetime',
        dir='desc'
    ):
        from models.class_model import Class, Class_Detail, Subject
        from models.schedule_package_model import Schedule_Package, Schedule_Package_Set
        from models.system_user_model import System_User

        query = db.session.query(cls)\
            .join(cls.student)\
            .join(Student.user)\
            .join(cls.class_detail)\
            .join(Class, Class.class_id == Class_Detail.class_id)\
            .join(Class.subject)\
            .join(Schedule_Package_Set, Schedule_Package_Set.set_id == cls.set_id)\
            .join(Schedule_Package, Schedule_Package.package_id == Schedule_Package_Set.package_id)

        # --- Filters ---
        if student_name_email:
            query = query.filter(
                or_(
                    System_User.name.ilike(f"%{student_name_email}%"),
                    System_User.email.ilike(f"%{student_name_email}%")
                )
            )

        if subject_name:
            query = query.filter(Subject.name.ilike(f"%{subject_name}%"))

        if class_id:
            query = query.filter(Class.class_id == class_id)

        if status:
            query = query.filter(cls.status == status)

        if intake_year:
            query = query.filter(Schedule_Package.year == intake_year)

        if min_enroll_date:
            query = query.filter(cls.enroll_datetime >= min_enroll_date)
        if max_enroll_date:
            query = query.filter(cls.enroll_datetime <= max_enroll_date)

        # --- Sorting ---
        sort_column = None
        if sort in ['enroll_datetime', 'status']:
            sort_column = getattr(cls, sort)
        elif sort in ['package_id', 'name', 'year']:
            sort_column = getattr(Schedule_Package, sort)
        elif sort == 'student_name':
            sort_column = System_User.name
        elif sort == 'subject_name':
            sort_column = Subject.name
        elif sort == 'class_time':
            sort_column = [Class_Detail.day_of_week, Class_Detail.start_time, Class_Detail.end_time]

        if sort_column is not None:
            if isinstance(sort_column, list):
                query = query.order_by(*(col.desc() if dir == 'desc' else col.asc() for col in sort_column))
            else:
                query = query.order_by(sort_column.desc() if dir == 'desc' else sort_column.asc())
        else:
            query = query.order_by(cls.enroll_datetime.desc())

        return query

    @staticmethod
    def add(data):
        from models import Payment, Payment_Detail, Student, Class_Enrollment
        from datetime import datetime

        student_id = data['student_id']
        status = data['status']
        class_pairs = data['class_pairs']

        try:
            # 1️⃣ Add class enrollments and store mapping for later linking
            enrollment_map = {}  # ✅ key: class_detail_id → value: enrollment_id

            for class_id, set_id in class_pairs:
                new_enroll = Class_Enrollment(
                    student_id=student_id,
                    class_detail_id=class_id,
                    set_id=set_id,
                    status=status,
                    enroll_datetime=datetime.utcnow()
                )
                db.session.add(new_enroll)
                db.session.flush()  # get new_enroll.class_enrollment_id
                enrollment_map[class_id] = new_enroll.class_enrollment_id  # ✅ save mapping

            # 2️⃣ Calculate payment and discount
            total_fee, discount_amt, final_amt, payment_details = Payment.calculate_payment_for_enrollment(
                student_id, class_pairs
            )

            # 3️⃣ Create main payment record
            payment = Payment(
                student_id=student_id,
                discount_amt=discount_amt,
                final_amt=final_amt,
                received_amt=0.00,
                change_amt=0.00,
                payment_method='Pending',
                payment_datetime=datetime.utcnow(),
                created_datetime=datetime.utcnow(),
                payment_status='0'
            )
            db.session.add(payment)
            db.session.flush()  # get payment_id

            # 4️⃣ Add payment details (match enrollment by class_detail_id)
            for (class_detail_id, _), detail in zip(class_pairs, payment_details):
                class_enroll_id = enrollment_map.get(class_detail_id)

                fee_type = detail.get('fee_type')
                if fee_type == 'class':
                    fee_type_db = '1'
                else:
                    fee_type_db = fee_type or '1'

                payment_detail = Payment_Detail(
                    payment_id=payment.payment_id,
                    class_enrollment_id=class_enroll_id,  # ✅ safe match by class_detail_id
                    class_name=detail.get('class_name'),
                    class_fee=detail.get('class_fee'),
                    service_name=detail.get('service_name'),
                    service_fee=detail.get('service_fee'),
                    fee_type=fee_type_db
                )
                db.session.add(payment_detail)

            db.session.commit()

            # 5️⃣ Update student payment status
            student = Student.query.get(student_id)
            if student:
                student.payment_status = '0'
            db.session.commit()

            # 6️⃣ Prepare result for email
            def safe_attr(obj, path, default=None):
                try:
                    for attr in path.split('.'):
                        obj = getattr(obj, attr)
                    return obj
                except Exception:
                    return default

            student_name = safe_attr(student, "user.name", "Student")
            parent_name = safe_attr(student, "parent.user.name", "Parent")
            parent_email = safe_attr(student, "parent.user.email", None)

            result_data = {
                "student_name": student_name,
                "parent_name": parent_name,
                "parent_email": parent_email,
                "total_fee": final_amt,
                "payment_details": payment_details
            }

            return True, result_data

        except Exception as e:
            db.session.rollback()
            print(f"Error adding class enrollments with payment: {e}")
            return False, None



    @classmethod
    def deactivate_class_enrollment(cls, id):
        enrollment = cls.query.get(id)
        if not enrollment:
            return False

        try:
            enrollment.status = '0'
            db.session.commit()

            # NEW: cleanup payment logic
            from models.payment_model import Payment
            Payment.cleanup_after_class_enrollment_deactivation(
                student_id=enrollment.student_id,
                class_enrollment_id=id
            )

            return True

        except Exception as e:
            db.session.rollback()
            return False

        
    @classmethod
    def get_student_enrolled_classes(cls, student_id):
        from models.schedule_package_model import Schedule_Package

        return (
            db.session.query(cls)
            .join(cls.class_detail)
            .join(cls.package_set)
            .join(Schedule_Package)
            .filter(
                cls.student_id == student_id,
                cls.status == '1',    # enrollment.active
                Class_Detail.status == '1',        # class_detail.active
                Schedule_Package.status == '1'     # package.active
            )
            .all()
        )
    

    @classmethod
    def get_enrollment_count_class_detail_set(cls, set_ids):
        results = (
            db.session.query(
                cls.class_detail_id,
                cls.set_id,
                func.count(cls.class_enrollment_id)
            )
            .filter(cls.set_id.in_(set_ids))
            .group_by(cls.class_detail_id, cls.set_id)
            .all()
        )

        # Convert [(cid, sid, count), ...] → { (cid, sid): count }
        return { (cid, sid): count for cid, sid, count in results }

    @classmethod
    def get_active_by_student(cls, student_id):
        """Return all active class enrollments for a student."""
        return cls.query.filter_by(student_id=student_id, status='1').all()

    # -----------------------------------------
    # 🧩 NEW VALIDATION FUNCTIONS
    # -----------------------------------------
    @classmethod
    def validate_package_and_class(cls, class_pairs, edu_lvl_id, intake_year):
        from models.schedule_package_model import Package_Set_Detail, Schedule_Package, Schedule_Package_Set

        """
        Validate that:
        1. The package of each set is active (status='1')
        and matches the given edu_lvl_id & intake_year.
        2. The class belongs to the set in package_set_detail.
        3. The class itself is active (status='1').
        """
        invalid_pairs = []

        for class_id, set_id in class_pairs:
            class_id = int(class_id)
            set_id = int(set_id)

            # 1️⃣ Validate package via set (joins all necessary tables)
            valid_package = (
                db.session.query(Schedule_Package_Set)
                .join(Schedule_Package, Schedule_Package_Set.package_id == Schedule_Package.package_id)
                .filter(
                    Schedule_Package_Set.set_id == set_id,
                    Schedule_Package.status == '1',
                    Schedule_Package.edu_lvl_id == edu_lvl_id,
                    Schedule_Package.year == intake_year
                )
                .first()
            )

            if not valid_package:
                invalid_pairs.append(
                    f"Set {set_id} belongs to inactive or mismatched package (education level/year)."
                )
                continue

            # 2️⃣ Check that the class belongs to that set
            class_in_set = (
                db.session.query(Package_Set_Detail)
                .filter_by(set_id=set_id, class_detail_id=class_id)
                .first()
            )
            if not class_in_set:
                invalid_pairs.append(f"Class {class_id} not found in Set {set_id}.")
                continue

            # 3️⃣ Check that the class itself is active
            active_class = (
                db.session.query(Class_Detail)
                .filter_by(class_detail_id=class_id, status='1')
                .first()
            )
            if not active_class:
                invalid_pairs.append(f"Class {class_id} is inactive.")
                continue

        return invalid_pairs

    @classmethod
    def get_by_payment(cls, payment_id):
        """
        Return all class enrollments linked to a given payment_id.
        These are the newly enrolled classes for mobile enrollment.
        """
        from models.payment_model import Payment_Detail

        return (
            cls.query
            .join(Payment_Detail, Payment_Detail.class_enrollment_id == cls.class_enrollment_id)
            .filter(Payment_Detail.payment_id == payment_id)
            .all()
        )
    

    @classmethod
    def bulk_create_from_pairs(cls, payment_id, class_pairs):
        """
        Create class enrollments after payment success.
        Return a list of { enrollment_id, class_detail_id, set_id }.
        """
        from models.payment_model import Payment

        try:
            # Find student ID from payment
            payment = Payment.get_by_id(payment_id)
            student_id = payment.student_id

            result = []

            for pair in class_pairs:
                class_detail_id = int(pair["class_detail_id"])
                set_id = int(pair["set_id"])

                new_enroll = Class_Enrollment(
                    student_id=student_id,
                    class_detail_id=class_detail_id,
                    set_id=set_id,
                    enroll_datetime=datetime.utcnow(),
                    status='1'
                )

                db.session.add(new_enroll)
                db.session.flush()   # get new_enroll.class_enrollment_id

                result.append({
                    "enrollment_id": new_enroll.class_enrollment_id,
                    "class_detail_id": class_detail_id,
                    "set_id": set_id
                })

            db.session.commit()
            return result

        except Exception as e:
            db.session.rollback()
            print("❌ bulk_create_from_pairs error:", e)
            return []