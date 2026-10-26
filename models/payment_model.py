from datetime import datetime
from sqlalchemy import or_
from helper import Helper
from models import db

from models.class_detail_model import Class_Detail
from models.other_service_model import Other_Service
from models.parent_model import Parent
from models.student_model import Student

class Payment_Detail(db.Model):
    __tablename__ = 'payment_detail'

    payment_detail_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payment.payment_id'), nullable=False)
    class_enrollment_id = db.Column(db.Integer, db.ForeignKey('class_enrollment.class_enrollment_id'), nullable=True)
    class_detail_id = db.Column(db.Integer, nullable=True)
    set_id = db.Column(db.Integer, nullable=True)
    service_id = db.Column(db.Integer, db.ForeignKey('other_service.service_id'), nullable=True)
    service_name = db.Column(db.String(100), nullable=True)
    service_fee = db.Column(db.Numeric(10, 2), nullable=True)
    service_attend_time = db.Column(db.Integer, nullable=True)
    class_name = db.Column(db.String(100), nullable=True)
    class_fee = db.Column(db.Numeric(10, 2), nullable=True)
    fee_type = db.Column(db.String(10), nullable=False)

    payment = db.relationship("Payment", back_populates="details")
    class_enrollment = db.relationship("Class_Enrollment", back_populates="payment_details")
    service = db.relationship("Other_Service", back_populates="payment_details")

    @staticmethod
    def update_enrollment_link(payment_id, class_detail_id, set_id, enrollment_id):
        row = Payment_Detail.query.filter_by(
            payment_id=payment_id,
            class_detail_id=class_detail_id,
            set_id=set_id
        ).first()

        if row:
            row.class_enrollment_id = enrollment_id
            db.session.commit()

class Payment(db.Model):
    __tablename__ = 'payment'

    payment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=False)
    discount_amt = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    final_amt = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    received_amt = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    change_amt = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    payment_method = db.Column(db.String(10), nullable=True)
    payment_datetime = db.Column(db.DateTime, nullable=True)
    created_datetime = db.Column(db.DateTime, nullable=False)
    payment_type = db.Column(db.String(20), nullable=True)
    payment_status = db.Column(db.Enum('0', '1', '2', '3'), nullable=False, default='1')

    student = db.relationship("Student", back_populates="payments")
    details = db.relationship("Payment_Detail", back_populates="payment")

    @classmethod
    def get_filtered(
        cls,
        student_name_email=None,
        payment_status=None,
        amt_min=None,
        amt_max=None,
        min_created_at=None,
        max_created_at=None,
        pay_at_min=None,
        pay_at_max=None,
        sort="payment_id",
        dir="desc",
    ):
        from models.student_model import Student
        from models.system_user_model import System_User  # if needed

        # Aliases for clarity
        StudentUser = db.aliased(System_User)
        ParentUser = db.aliased(System_User)

        query = (
            db.session.query(cls)
            .join(Student, cls.student_id == Student.student_id)
            .join(StudentUser, Student.user_id == StudentUser.user_id)
            .outerjoin(Parent, Student.parent_id == Parent.parent_id)
            .outerjoin(ParentUser, Parent.user_id == ParentUser.user_id)
        )

        # --- Filtering by student name or email ---
        if student_name_email:
            keyword = f"%{student_name_email}%"
            query = query.filter(
                or_(
                    StudentUser.name.ilike(keyword),
                    StudentUser.email.ilike(keyword)
                )
            )

        # --- Filtering by payment status ---
        if payment_status in ['0', '1', '2', '3']:
            query = query.filter(cls.payment_status == payment_status)

        # --- Filter by amount ---
        if amt_min:
            try:
                amt_min_val = float(amt_min)
                query = query.filter(cls.final_amt >= amt_min_val)
            except:
                pass

        if amt_max:
            try:
                amt_max_val = float(amt_max)
                query = query.filter(cls.final_amt <= amt_max_val)
            except:
                pass

        # --- Filtering by created date range ---
        if min_created_at:
            utc_min = Helper.local_to_utc(min_created_at)
            if utc_min:
                query = query.filter(cls.created_datetime >= utc_min)

        if max_created_at:
            utc_max = Helper.local_to_utc(max_created_at)
            if utc_max:
                query = query.filter(cls.created_datetime <= utc_max)

        # --- Filtering by payment date range ---
        if pay_at_min:
            utc_pay_min = Helper.local_to_utc(pay_at_min)
            if utc_pay_min:
                query = query.filter(cls.payment_datetime >= utc_pay_min)

        if pay_at_max:
            utc_pay_max = Helper.local_to_utc(pay_at_max)
            if utc_pay_max:
                query = query.filter(cls.payment_datetime <= utc_pay_max)

        # --- Sorting ---
        sort_column = getattr(cls, sort, None)
        if sort_column is not None:
            if dir == "desc":
                sort_column = sort_column.desc()
            else:
                sort_column = sort_column.asc()
            query = query.order_by(sort_column)
        else:
            query = query.order_by(cls.payment_id.desc())

        return query
   
    # For after make payment
    @staticmethod
    def update_status(payment_id, status, method, received_amt=0.00, change_amt=0.00):
        payment = Payment.query.get(payment_id)
        if not payment:
            return False  # payment not found

        try:
            # ✅ Step 1: Update this payment
            payment.payment_status = status
            payment.payment_method = method
            payment.received_amt = received_amt
            payment.change_amt = change_amt
            payment.payment_datetime = datetime.utcnow()  # store UTC time

            # ✅ Step 2: Commit the payment update first
            db.session.commit()

            # ✅ Step 3: Check all payments for this student
            student_id = payment.student_id
            unpaid_exists = (
                Payment.query.filter_by(student_id=student_id, payment_status='0').count() > 0
            )

            # ✅ Step 4: If no unpaid payment remains, mark student as fully paid
            if not unpaid_exists:
                student = Student.query.get(student_id)
                if student:
                    student.payment_status = '1'

                else: 
                    student.payment_status = '0'
                
                db.session.commit()

            return True

        except Exception as e:
            db.session.rollback()
            print(f"Error updating payment {payment_id}: {e}")
            return False

    @staticmethod
    def update_status_when_check(payment_id, status):
        payment = Payment.query.get(payment_id)
        if not payment:
            return False  # or raise exception

        payment.payment_status = str(status)
        db.session.commit()
        return True

    @staticmethod
    def delete_payment(payment_id):
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return {"error": "Payment not found"}, 404

        # 只能删除 pending / failed / canceled
        if payment.payment_status not in ['0', '-1', '-2']:
            return {"error": "Cannot delete a completed payment"}, 400

        try:
            # 删除明细
            Payment_Detail.query.filter_by(payment_id=payment_id).delete()

            # 删除主记录
            db.session.delete(payment)
            db.session.commit()

            return {"success": True}, 200

        except Exception as e:
            print("❌ delete_payment error:", e)
            db.session.rollback()
            return {"error": "Database error"}, 500

    @staticmethod
    def cleanup_after_class_enrollment_deactivation(student_id, class_enrollment_id):
        from models.payment_model import Payment, Payment_Detail
        from models.discount_metrics_model import Discount_Metric
        from models.class_enrollment_model import Class_Enrollment
        from models.subject_model import Subject
        from models.class_model import Class
        from models.class_detail_model import Class_Detail

        payments = Payment.query.filter(
            Payment.student_id == student_id,
            Payment.payment_status == "0"   # only unpaid
        ).all()

        for payment in payments:
            detail = Payment_Detail.query.filter_by(
                payment_id=payment.payment_id,
                class_enrollment_id=class_enrollment_id
            ).first()

            if not detail:
                continue

            db.session.delete(detail)
            db.session.flush()

            remaining_details = Payment_Detail.query.filter_by(payment_id=payment.payment_id).all()

            if not remaining_details:
                db.session.delete(payment)
                continue

            # ------------------------------
            # 4. Recalculate payment left
            # ------------------------------

            total_fee = 0
            class_fee_items = []

            for d in remaining_details:
                # class
                if d.class_enrollment_id:
                    class_fee_items.append(float(d.class_fee or 0))
                    total_fee += float(d.class_fee or 0)

                # service
                elif d.service_id:
                    total_fee += float(d.service_fee or 0)

            # ---- discount calculation ----
            discount_amt = 0
            if class_fee_items:
                class_count = len(class_fee_items)

                metric = (
                    Discount_Metric.query
                    .filter(Discount_Metric.num_of_enrolment <= class_count)
                    .order_by(Discount_Metric.num_of_enrolment.desc())
                    .first()
                )

                if metric:
                    discount_amt = float(metric.discount_amt)

            # Apply discount
            final_amt = max(0, total_fee - discount_amt)

            # update payment
            payment.discount_amt = discount_amt
            payment.final_amt = final_amt

        # finally commit
        db.session.commit()


    @staticmethod
    def get_by_id(id):
        return Payment.query.get(id)

    @staticmethod
    def calculate_payment_for_enrollment(student_id, class_pairs):
        from models import Class, Subject, Discount_Metric

        total_fee = 0
        payment_details = []

        for class_detail_id, set_id in class_pairs:
            # Start from Class_Detail
            class_detail = Class_Detail.query.filter_by(class_detail_id=class_detail_id).first()
            if not class_detail:
                print(f"[Payment] Class_Detail not found: {class_detail_id}")
                continue

            # Get the parent Class
            class_obj = Class.query.filter_by(class_id=class_detail.class_id).first()
            if not class_obj:
                print(f"[Payment] Class not found for Class_Detail {class_detail_id}, class_id={class_detail.class_id}")
                continue

            # Get the subject
            subject = Subject.query.filter_by(subject_id=class_obj.subject_id).first()
            if not subject:
                print(f"[Payment] Subject not found for Class {class_obj.class_id}, subject_id={class_obj.subject_id}")
                continue

            # Determine base class fee based on class type
            if class_obj.class_type.lower() == 'n':
                class_fee = subject.normal_class_fee or 0
            elif class_obj.class_type.lower() == 'f':
                class_fee = subject.focus_class_fee or 0
            else:
                class_fee = 0

            # Add material fee together
            total_class_fee = (class_fee or 0) + (subject.material_fee or 0)
            total_fee += total_class_fee

            # Record detail for this class enrollment
            payment_details.append({
                'class_name': subject.name,  # ✅ subject name = class name
                'class_fee': total_class_fee,
                'service_name': None,        # ✅ all service fields null
                'service_fee': None,
                'fee_type': 'class'
            })


        # Step 2: Apply discount based on number of enrolled classes
        num_classes = len(payment_details)
        discount_record = (
            Discount_Metric.query
            .filter(Discount_Metric.num_of_enrolment <= num_classes)
            .order_by(Discount_Metric.num_of_enrolment.desc())
            .first()
        )

        discount_amt = float(discount_record.discount_amt) if discount_record else 0
        final_amt = total_fee - discount_amt

        return total_fee, discount_amt, final_amt, payment_details

    @staticmethod
    def get_pending_by_parent(parent_id):
        """Get all unpaid payments for active students of a parent"""
        from models.student_model import Student
        from models.system_user_model import System_User

        # ✅ Join Student → System_User 以确认 user.status == '1'
        active_students = (
            Student.query
            .join(System_User, Student.user_id == System_User.user_id)
            .filter(
                Student.parent_id == parent_id,
                System_User.status == '1'  # only active student users
            )
            .all()
        )

        if not active_students:
            return []

        # ✅ 拿出 active student 的 student_id
        student_ids = [s.student_id for s in active_students]

        # ✅ 找这些学生的未付款记录
        pending_payments = (
            Payment.query
            .filter(Payment.student_id.in_(student_ids))
            .filter(Payment.payment_status.in_(['0', '2']))
            .order_by(Payment.created_datetime.desc())
            .all()
        )

        return pending_payments

    @staticmethod
    def add_mobile_service_enrollment_payment(data):
        from models.service_enrollment_model import Service_Enrollment

        try:
            student_id = data.get("student_id")
            service_ids = data.get("service_ids", [])
            service_type = data.get("service_type")
            total_fee = float(data.get("total_fee", 0))

            # -------------------------
            # 1) Validate
            # -------------------------
            if not student_id or not service_ids:
                return {"status": "error", "message": "Missing student_id or service_ids."}

            student = Student.get_by_id(student_id)
            if not student:
                return {"status": "error", "message": "Invalid student."}

            valid_services = Other_Service.get_active_service(service_type)
            valid_ids = {s.service_id for s in valid_services}

            invalid = [sid for sid in service_ids if sid not in valid_ids]
            if invalid:
                return {"status": "error", "message": f"Invalid service IDs: {invalid}"}

            # Duplicate check
            enrolled = Service_Enrollment.get_enrolled_service(student_id)
            enrolled_ids = {sid for (sid,) in enrolled}

            duplicates = [sid for sid in service_ids if sid in enrolled_ids]
            if duplicates:
                return {"status": "error", "message": f"Already enrolled: {duplicates}"}

            # -------------------------
            # 2) Create Payment
            # -------------------------
            new_payment = Payment(
                student_id=student_id,
                final_amt=round(total_fee, 2),
                discount_amt=0,
                received_amt=0,
                change_amt=0,
                payment_method=None,
                payment_status='0',
                created_datetime=datetime.utcnow(),
                payment_type='service_enrollment'
            )
            db.session.add(new_payment)
            db.session.flush()  # get payment_id

            # -------------------------
            # 3) Build Payment_Detail
            # -------------------------
            for sid in service_ids:
                svc = next(s for s in valid_services if s.service_id == sid)

                # Determine fee
                if svc.service_type == "1":
                    fee = float(svc.service_fee_per_month or 0)
                elif svc.service_type == "2":
                    fee = float(svc.deposit_fee or 0)
                else:
                    fee = float(svc.service_fee_per_month or 0)

                db.session.add(Payment_Detail(
                    payment_id=new_payment.payment_id,
                    service_name=svc.name,
                    service_fee=fee,
                    fee_type="1" if svc.service_type == "1" else "2",
                    service_id=sid
                ))

            db.session.commit()

            # -------------------------
            # Return
            # -------------------------
            return {
                "status": "success",
                "payment_id": new_payment.payment_id,
                "amount": new_payment.final_amt
            }

        except Exception as e:
            db.session.rollback()
            print("❌ Service Enrollment create error:", e)
            return {"status": "error", "message": "Unexpected error."}
