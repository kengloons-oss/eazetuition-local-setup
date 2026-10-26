from datetime import datetime
import math
import threading
import time
from flask import Blueprint, current_app, json, render_template, request, redirect, url_for, jsonify, send_file
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from flask_mail import Message
from flask_paginate import Pagination
from sqlalchemy import func

from helper import Helper
from models.class_enrollment_model import Class_Enrollment
from models.payment_model import Payment, Payment_Detail
from models.service_enrollment_model import Service_Enrollment
from models.student_model import Student
from utils.email_service import (
    send_enrollment_email,
    send_enrollment_email_service,
    send_monthly_payment_email,
    send_manual_payment_email
)
from middlewares.admin_required import admin_required, admin_api_required


payment_bp = Blueprint('payment', __name__, url_prefix='/payment')

@payment_bp.route('/list')
@admin_required
def payment_list():
    # Safe parsing for per_page
    try:
        per_page = int(request.args.get('per_page', 7))
    except (TypeError, ValueError):
        per_page = 7
    per_page = max(1, per_page)

    # Safe parsing for page
    try:
        page = int(request.args.get('page', 1))
    except (TypeError, ValueError):
        page = 1
    page = max(1, page)

    # Get filters
    student_name_email = request.args.get('search_student_name_email')
    payment_status = request.args.get('payment_status')
    amt_min = request.args.get('amt_min')
    amt_max = request.args.get('amt_max')
    min_created_at = request.args.get('created_at_min')
    max_created_at = request.args.get('created_at_max')
    pay_at_min = request.args.get('pay_at_min')
    pay_at_max = request.args.get('pay_at_max')
    sort = request.args.get('sort') or 'payment_id'
    dir = request.args.get('dir') or 'desc'

    # Filtered and sorted query
    query = Payment.get_filtered(
        student_name_email=student_name_email,
        payment_status=payment_status,
        amt_min=amt_min,
        amt_max=amt_max,
        min_created_at=min_created_at,
        max_created_at=max_created_at,
        pay_at_min=pay_at_min,
        pay_at_max=pay_at_max,
        sort=sort,
        dir=dir
    )
        
    total = query.distinct(Payment.payment_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    payments = query.offset(offset).limit(per_page).all()


    pagination = Pagination(
        page=page,
        total=total,
        per_page=per_page,
        css_framework='bootstrap5',
        show_first_last=True,
        inner_window = 3,
        outer_window=3,
        prev_label='<i class="fas fa-chevron-left"></i>',
        next_label='<i class="fas fa-chevron-right"></i>',
        href=f"?student_name_email={student_name_email or ''}&payment_status={payment_status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'payments': payments,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'packastudent_name_emailge_name': student_name_email,
        'payment_status': payment_status,
        'title': 'Payment | List',
        'page_count' : max_page,
        'current_count' : len(payments),
        'total_count' : total
    }

    fields = [
        {"name": "payment_id", "label": "Payment ID"},
        {"name": "student_name", "label": "Student"},
        {"name": "final_amt", "label": "Amount (RM)"},
        {"name": "created_datetime", "label": "Created At"},
        {"name": "payment_status", "label": "Payment Status"}
    ]

    #Header
    breadcrumbs = [
        ('Payment', url_for('payment.payment_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/payment/_payment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/payment/payment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

@payment_bp.route('/add', defaults={'payment_id': None}, methods=['GET', 'POST'])
@payment_bp.route('/add/<int:payment_id>', methods=['GET', 'POST'])
@admin_required
def add_payment(payment_id=None):
    from app import app
    from flask import current_app

    students = Student.get_active_student()

    breadcrumbs = [
        ('Payment', url_for('payment.payment_list')),
        ('Add', None)
    ]
    title = 'Payment | Add'

    # ============================================================
    # POST: Submit payment form
    # ============================================================
    if request.method == 'POST':
        try:
            data = request.get_json()
            try:
                student_id = int(data.get('student_id'))
                payment_id = int(data.get('payment_id'))
            except (TypeError, ValueError):
                return jsonify({'status': 'error', 'title': 'Invalid Data', 'message': 'Invalid student or payment ID format.'})

            method = data.get('payment_method')
            received_amt = float(data.get('received_amount', 0) or 0)

            # --------------------------------------------------------
            # Validation: Required fields
            # --------------------------------------------------------
            if not student_id:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Student is required.'})
            if not payment_id:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Payment is required.'})
            if not method:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Payment Method is required.'})

            # --------------------------------------------------------
            # Validation: Student existence and active status
            # --------------------------------------------------------
            student = Student.get_by_id(student_id)
            if not student:
                return jsonify({'status': 'error', 'title': 'Invalid Student', 'message': 'Selected student does not exist.'})

            if not student.user or student.user.status != '1':
                return jsonify({'status': 'error', 'title': 'Inactive Student', 'message': 'Selected student is not active.'})

            # --------------------------------------------------------
            # Validation: Payment existence and ownership
            # --------------------------------------------------------
            payment = Payment.get_by_id(payment_id)
            if not payment:
                return jsonify({'status': 'error', 'title': 'Invalid Payment', 'message': 'Selected payment does not exist.'})

            if payment.student_id != student_id:
                return jsonify({'status': 'error', 'title': 'Ownership Error', 'message': 'This payment does not belong to the selected student.'})
            
            if payment.payment_status != '0' and payment.payment_status != '2':
                return jsonify({'status': 'error', 'title': 'Invalid Status', 'message': 'This payment is already completed or cancelled.'})

            # --------------------------------------------------------
            # Validation: Payment method and received amount
            # --------------------------------------------------------
            change_amt = 0.00
            total_amt = float(payment.final_amt or 0)

            if method == '1':  # Cash
                if received_amt <= 0:
                    return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Received amount is required for cash payments.'})
                if received_amt < total_amt:
                    return jsonify({'status': 'error', 'title': 'Insufficient Amount', 'message': f'Received amount (RM{received_amt:.2f}) must be at least RM{total_amt:.2f}.'})
                change_amt = round(received_amt - total_amt, 2)
            else:
                # For non-cash methods, always 0 received & change
                received_amt = total_amt
                change_amt = 0.00

            # --------------------------------------------------------
            # Database Update: Mark as paid
            # --------------------------------------------------------
            success = Payment.update_status(
                payment_id=payment_id,
                status='1',  # Paid
                method=method,
                received_amt=received_amt,
                change_amt=change_amt
            )

            if not success:
                return jsonify({'status': 'error', 'title': 'Database Error', 'message': 'Failed to update payment record.'})

            # --------------------------------------------------------
            # Send confirmation email to parent
            # --------------------------------------------------------
            if student.parent and student.parent.user.email:
                send_manual_payment_email(payment_id, method, received_amt, change_amt)

            return jsonify({
                'status': 'success',
                'title': 'Payment Successful',
                'message': f'Payment #{payment_id} successfully recorded.',
                'redirectUrl': url_for('payment.payment_list')
            })

        except Exception as e:
            current_app.logger.error(f"Add Payment Error: {e}", exc_info=True)
            return jsonify({
                'status': 'error',
                'title': 'Unexpected Error',
                'message': 'An unexpected error occurred while processing payment. Please try again.'
            })

    # ============================================================
    # GET: Load Add Payment page
    # ============================================================

    payment = None
    if payment_id:
        payment = Payment.get_by_id(payment_id)
    
    return render_template(
        '/admin/payment/make_payment.html',
        students=students,
        payment=payment,
        breadcrumbs=breadcrumbs,
        title=title
    )


@payment_bp.route('/detail/<int:id>', methods=['GET', 'POST'])
@admin_required
def view_payment(id):
    # =============================
    # Fetch and Validate Service
    # =============================
    payment = Payment.get_by_id(id)
    if payment is None:
        return redirect(url_for(
            'payment.payment_list',
            status='error',
            title='Payment Not Found',
            message='The payment you are trying to view does not exist.'
        ))

    breadcrumbs = [
        ('Payment', url_for('payment.payment_list')),
        ('Detail', None)
    ]
    title = f'Payment | PM{id:04d}'

    # =============================
    # GET Request → Render Page
    # =============================
    return render_template(
        '/admin/payment/view_payment.html',
        payment=payment,
        breadcrumbs=breadcrumbs,
        title=title
    )


@payment_bp.route('/get_unpaid/<int:student_id>')
@admin_api_required
def get_unpaid_payments(student_id):
    from models.student_model import Student

    unpaid_payments = (
        Payment.query
        .filter_by(student_id=student_id, payment_status='0')  # unpaid
        .order_by(Payment.created_datetime.desc())
        .all()
    )

    result = [
        {
            "payment_id": p.payment_id,
            "final_amt": float(p.final_amt),
            "created_datetime": p.created_datetime.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for p in unpaid_payments
    ]

    return jsonify(result)

@payment_bp.route('/get_payment_details/<int:payment_id>')
@admin_api_required
def get_payment_details(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify([])

    details = []
    for d in payment.details:
        details.append({
            "class_name": d.class_name,
            "class_fee": float(d.class_fee) if d.class_fee else 0,
            "service_name": d.service_name,
            "service_fee": float(d.service_fee) if d.service_fee else 0,
            "service_attend_time": d.service_attend_time,
            "fee_type": d.fee_type,
        })
    return jsonify(details)


#======================================================================================
# Periodicly Generate Payment
#======================================================================================
def check_and_create_monthly_payments():
    """
    Runs daily but executes generation only on the 3rd of each month.
    Creates payments for missing class/service enrollments for the current month.
    """
    from app import app, mail
    from datetime import datetime, timedelta
    from models import db
    from models.discount_metrics_model import Discount_Metric
    from models.class_model import Class as ClassModel
    from models.subject_model import Subject
    from models.other_service_model import Other_Service
    from models.other_service_attendance_model import Other_Service_Attendance
    from models.other_service_session_model import Other_Service_Session

    print(f"\n\n[Scheduler] check_and_create_monthly_payments() triggered at {datetime.now()}")  # ✅ Log run

    with app.app_context():
        now = datetime.now()
        if now.day != 3:
            return
        
        # month range for "current month"
        month_start = datetime(now.year, now.month, 1)
        if now.month == 12:
            month_end = datetime(now.year + 1, 1, 1)
        else:
            month_end = datetime(now.year, now.month + 1, 1)

        # previous month range (for service deposit adjustments)
        prev_month_date = month_start - timedelta(days=1)
        prev_month_start = datetime(prev_month_date.year, prev_month_date.month, 1)
        if prev_month_date.month == 12:
            prev_month_end = datetime(prev_month_date.year + 1, 1, 1)
        else:
            prev_month_end = datetime(prev_month_date.year, prev_month_date.month + 1, 1)
        last_day_prev_month = prev_month_end - timedelta(days=1)
        last_3_start_prev_month = last_day_prev_month - timedelta(days=2)

        def is_last_3_days_of_prev_month(dt: datetime) -> bool:
            """判断一个 enroll_datetime 是否在『上个月的最后三天』"""
            if dt is None:
                return False
            d = dt.date()
            return last_3_start_prev_month.date() <= d <= last_day_prev_month.date()
        
        students = Student.get_active_student()

        for student in students:
            try:
                # fetch active enrollments
                enrolled_classes = Class_Enrollment.get_active_by_student(student.student_id)
                enrolled_services = Service_Enrollment.get_active_by_student(student.student_id)

                # payments for this student created this month
                payments = Payment.query.filter(
                    Payment.student_id == student.student_id,
                    Payment.created_datetime >= month_start,
                    Payment.created_datetime < month_end
                ).all()

                # collect existing PKs present in payment details this month
                existing_class_enroll_ids = {
                    d.class_enrollment_id
                    for p in payments for d in p.details
                    if d.class_enrollment_id is not None
                }
                existing_service_ids = {
                    d.service_id
                    for p in payments for d in p.details
                    if d.service_id is not None
                }

                # find missing items (only valid/active enrollments)
                missing_items = []  # tuples ('class'|'service', enrollment_obj)

                # ==== FILTER CLASS ENROLLMENTS ====
                for ce in enrolled_classes:
                    class_detail = getattr(ce, 'class_detail', None)
                    package_set = getattr(ce, 'package_set', None)

                    # Skip if invalid or inactive
                    if not class_detail or class_detail.status != '1':
                        continue
                    if not package_set or not getattr(package_set.package, 'status', None) == '1':
                        continue

                    # Already paid this month => skip
                    if ce.class_enrollment_id in existing_class_enroll_ids:
                        continue

                    enroll_dt = getattr(ce, "enroll_datetime", None)

                    # ① Current month enrollment => skip (first-month payment already done at enrollment)
                    if enroll_dt and month_start <= enroll_dt < month_end:
                        continue

                    # ② Intake logic
                    # package_set.package.year = intake year (stored as string)
                    intake_year_str = getattr(package_set.package, "year", None)
                    intake_year = None
                    try:
                        intake_year = int(intake_year_str)
                    except:
                        pass  # If year is not numeric, ignore intake logic entirely

                    if intake_year is not None:
                        # A. student enrolled BEFORE intake year
                        if enroll_dt and enroll_dt.year < intake_year:

                            # This month is intake year's January
                            is_first_month_of_intake = (now.year == intake_year and now.month == 1)

                            if is_first_month_of_intake:
                                # Check if student already paid any class payment BEFORE intake_month
                                has_prev_payment = (
                                    db.session.query(Payment_Detail)
                                    .join(Payment, Payment.payment_id == Payment_Detail.payment_id)
                                    .filter(
                                        Payment_Detail.class_enrollment_id == ce.class_enrollment_id,
                                        Payment.created_datetime < month_start
                                    )
                                    .first()
                                )

                                if has_prev_payment:
                                    # Already paid before intake; do not charge in intake's first month
                                    continue

                    # If reached here => class must be charged this month
                    missing_items.append(('class', ce))


                # ---------- SERVICE ENROLLMENTS ----------
                for se in enrolled_services:
                    service = getattr(se, 'service', None)
                    if not service or service.status != '1':
                        continue

                    # Current month payment generated
                    if se.service_id in existing_service_ids:
                        continue

                    fee_type = getattr(service, 'fee_type', None)
                    enroll_dt = getattr(se, "enroll_datetime", None)

                    # fee_type = '1': Only monthly fee
                    if fee_type == '1':
                        # Current month is enroll month
                        if enroll_dt and month_start <= enroll_dt < month_end:
                            continue

                        #  If enrollment is at last month last 3 days
                        if enroll_dt and prev_month_start <= enroll_dt < month_start:
                            if is_last_3_days_of_prev_month(enroll_dt):
                                # current month does not charge monthly fee
                                continue

                        missing_items.append(('service', se))

                    # fee_type = '2': Deposit + Pay by Attend
                    elif fee_type == '2':
                        missing_items.append(('service', se))

                    else:
                        app.logger.warning(
                            f"[Payments] Unknown service.fee_type for service_id={se.service_id}: {fee_type}"
                        )
                        continue

                if not missing_items:
                    continue

                # Build payment details and compute amounts
                total_fee = 0.00
                payment_details = []

                # ----- CLASSES -----
                class_count_for_discount = 0
                class_details_for_discount = []
                for (typ, obj) in [mi for mi in missing_items if mi[0] == 'class']:
                    class_enroll = obj
                    class_detail = getattr(class_enroll, 'class_detail', None)
                    if not class_detail:
                        app.logger.warning(
                            f"[Payments] Class_Detail missing for enrollment {class_enroll.class_enrollment_id}"
                        )
                        continue

                    class_parent = (
                        getattr(class_detail, 'class_', None)
                        or ClassModel.query.filter_by(class_id=class_detail.class_id).first()
                    )
                    subject = (
                        getattr(class_parent, 'subject', None)
                        or Subject.query.filter_by(subject_id=class_parent.subject_id).first()
                    )

                    # determine base fee
                    class_type = getattr(class_parent, 'class_type', '').lower() if class_parent else ''
                    if class_type == 'n':
                        class_fee = float(getattr(subject, 'normal_class_fee', 0) or 0)
                    elif class_type == 'f':
                        class_fee = float(getattr(subject, 'focus_class_fee', 0) or 0)
                    else:
                        class_fee = 0.0

                    material_fee = float(getattr(subject, 'material_fee', 0) or 0)
                    fee_qty = class_fee + material_fee

                    class_count_for_discount += 1
                    class_details_for_discount.append(fee_qty)
                    total_fee += fee_qty

                    payment_details.append({
                        'class_enrollment_id': class_enroll.class_enrollment_id,
                        'class_name': getattr(subject, 'name', None),
                        'class_fee': fee_qty,
                        'fee_type': '1'   # Monthly Fee
                    })

                if class_count_for_discount > 0:
                    discount_record = (
                        Discount_Metric.query
                        .filter(Discount_Metric.num_of_enrolment <= class_count_for_discount)
                        .order_by(Discount_Metric.num_of_enrolment.desc())
                        .first()
                    )
                    discount_amt = float(discount_record.discount_amt) if discount_record else 0.0
                    total_fee -= discount_amt
                else:
                    discount_amt = 0.0

                # ---------- SERVICES ----------
                for (typ, obj) in [mi for mi in missing_items if mi[0] == 'service']:
                    service_enroll = obj
                    service = (
                        getattr(service_enroll, 'service', None)
                        or Other_Service.get_by_id(service_enroll.service_id)
                    )
                    if not service:
                        app.logger.warning(
                            f"[Payments] Service missing for enrollment: student {student.student_id}, "
                            f"service_id {service_enroll.service_id}"
                        )
                        continue

                    fee_type = getattr(service, 'fee_type', None)
                    enroll_dt = service_enroll.enroll_datetime

                    if fee_type == '1':
                        monthly_fee = float(getattr(service, 'service_fee_per_month', 0) or 0)
                        total_fee += monthly_fee
                        payment_details.append({
                            'service_id': service.service_id,
                            'service_name': service.name,
                            'service_fee': monthly_fee,
                            'fee_type': '1',          # 月费
                            'service_attend_time': None
                        })

                    elif fee_type == '2':
                        deposit_fee = float(getattr(service, 'deposit_fee', 0) or 0)
                        fee_per_attend = float(getattr(service, 'service_fee_per_attend', 0) or 0)

                        # ===============================
                        # Find payment during enrollment
                        # ===============================
                        deposit_payment_detail = (
                            db.session.query(Payment_Detail)
                            .join(Payment, Payment.payment_id == Payment_Detail.payment_id)
                            .filter(
                                Payment.student_id == student.student_id,
                                Payment_Detail.service_id == service.service_id,
                                Payment_Detail.fee_type == '2',  # deposit
                                db.func.date(Payment.created_datetime) == enroll_dt.date()
                            )
                            .first()
                        )

                        if deposit_payment_detail:
                            deposit_paid = float(deposit_payment_detail.service_fee or 0)
                        else:
                            # fallback to service.deposit_fee
                            deposit_paid = deposit_fee

                        # ===============================
                        # Find all attendance payment after the enrollment payment
                        # ===============================
                        past_attendance_charges = (
                            db.session.query(Payment_Detail)
                            .join(Payment, Payment.payment_id == Payment_Detail.payment_id)
                            .filter(
                                Payment.student_id == student.student_id,
                                Payment_Detail.service_id == service.service_id,
                                Payment_Detail.fee_type == '3',
                                Payment.created_datetime > enroll_dt
                            )
                            .order_by(Payment.created_datetime.asc())
                            .all()
                        )

                        # Deduct the attend fee by deposit see whather have remain or not
                        deposit_remaining = deposit_paid
                        for pd in past_attendance_charges:
                            used_amount = float(pd.service_fee or 0)
                            deposit_remaining -= used_amount

                        if deposit_remaining < 0:
                            deposit_remaining = 0.0

                        # ===============================
                        # Calculate last month attendance
                        # ===============================
                        attendance_prev_month = (
                            db.session.query(Other_Service_Attendance)
                            .join(
                                Other_Service_Session,
                                Other_Service_Attendance.session_id == Other_Service_Session.session_id
                            )
                            .filter(
                                Other_Service_Attendance.student_id == student.student_id,
                                Other_Service_Session.service_id == service.service_id,
                                Other_Service_Attendance.status == '1',
                                Other_Service_Attendance.attendance_time >= prev_month_start,
                                Other_Service_Attendance.attendance_time < month_start
                            )
                            .count()
                        )

                        # Skip if last month no attend
                        if attendance_prev_month <= 0:
                            continue

                        # ===============================
                        # Calculate exact fee should pay
                        # ===============================
                        value_prev_month = attendance_prev_month * fee_per_attend

                        # 5) How much deposit deducts this month
                        deposit_deduct_amount = min(deposit_remaining, value_prev_month)

                        # (A) Insert raw attendance fee (正数)
                        payment_details.append({
                            'service_id': service.service_id,
                            'service_name': service.name,
                            'service_fee': round(value_prev_month, 2),
                            'fee_type': '3',
                            'service_attend_time': attendance_prev_month
                        })
                        total_fee += value_prev_month

                        # (B) Insert deposit deduction 
                        if deposit_deduct_amount > 0:
                            payment_details.append({
                                'service_id': service.service_id,
                                'service_name': service.name + " (Deposit Deduct)",
                                'service_fee': round(-deposit_deduct_amount, 2),
                                'fee_type': '4',           # deposit deduction
                                'service_attend_time': None
                            })
                            total_fee += -deposit_deduct_amount

                    else:
                        app.logger.warning(
                            f"[Payments] Unknown service fee_type when computing details, service_id={service.service_id}"
                        )
                        continue

                # If does not have any payment detail, then no payment created
                if not payment_details:
                    print("No payment details")
                    continue

                # --- CREATE PAYMENT ---
                new_payment = Payment(
                    student_id=student.student_id,
                    discount_amt=round(discount_amt, 2),
                    final_amt=round(total_fee, 2),
                    received_amt=0.0,
                    change_amt=0.0,
                    payment_method=None,
                    payment_datetime=None,
                    created_datetime=datetime.utcnow(),
                    payment_status='0',
                    payment_type='monthly'
                )
                print(new_payment)
                db.session.add(new_payment)
                db.session.flush()  # 获取 new_payment.payment_id

                for d in payment_details:
                    db.session.add(Payment_Detail(payment_id=new_payment.payment_id, **d))

                db.session.commit()
                app.logger.info(
                    f"[Payments] Created payment {new_payment.payment_id} for student "
                    f"{student.student_id}, RM {new_payment.final_amt:.2f}"
                )

                # ===== Email & Socket 通知部份保持不变 =====
                try:
                    if student.parent and getattr(student.parent, 'user', None) and student.parent.user.email:
                        msg = Message(
                            subject=f"[EazeTuition] New Payment Created for {student.user.name}",
                            recipients=[student.parent.user.email],
                            html=f"""
                                <p>Dear {student.parent.user.name},</p>
                                <p>A new payment for <strong>{student.user.name}</strong> has been created.</p>
                                <p><strong>Amount:</strong> RM {new_payment.final_amt:.2f}</p>
                                <p>Please login to your account to proceed with payment.</p>
                                <p>EazeTuition Team</p>
                            """
                        )
                        threading.Thread(target=Helper.send_async_email, args=(app, msg)).start()
                except Exception as exc:
                    app.logger.error(
                        f"[Payments] Failed to send payment email for payment {new_payment.payment_id}: {exc}"
                    )

                try:
                    parent_user = getattr(student.parent, 'user', None)
                    if parent_user:
                        from app import socketio
                        socketio.emit(
                            'new_payment_notification',
                            {
                                "user_id": parent_user.user_id,
                                "title": "New Payment Created",
                                "message": (
                                    f"A new payment of RM {new_payment.final_amt:.2f} has been "
                                    f"created for {student.user.name}. Please proceed with payment."
                                ),
                            },
                            namespace="/notifications"
                        )
                except Exception as exc:
                    app.logger.error(
                        f"[Payments] Failed to emit app notification for payment {new_payment.payment_id}: {exc}"
                    )

            except Exception as e:
                db.session.rollback()
                app.logger.error(
                    f"[Payments] Error processing student {student.student_id}: {e}",
                    exc_info=True
                )

def handle_payment_status(payment):
    """
    Handle status checks, reminders, overdue, termination.
    Called once per payment by scheduler.
    """
    from app import app

    now = datetime.utcnow()
    created = payment.created_datetime

    if not created:
        return

    days = (now - created).days

    parent = getattr(payment.student, 'parent', None)
    parent_user = getattr(parent, 'user', None)
    parent_email = getattr(parent_user, 'email', None)
    parent_name = getattr(parent_user, 'name', "Parent")
    student_name = getattr(payment.student.user, 'name', "Student")

    # Safe send email
    def send(parent_email, subject, html):
        if not parent_email:
            return
        try:
            msg = Message(subject=subject, recipients=[parent_email], html=html)
            Helper.send_async_email(app, msg)
        except Exception as e:
            print(f"[Email Error] payment {payment.payment_id}: {e}")

    # -----------------------------
    # (1) 3-Day Reminder
    # -----------------------------
    if days == 3 and payment.payment_status == "0":
        send(parent_email,
            f"[EazeTuition] Payment Reminder for {student_name}",
            f"<p>Dear {parent_name},</p><p>Your payment of RM {payment.final_amt:.2f} is still pending.</p>"
        )
        return

    # -----------------------------
    # (2) 7-Day Overdue → status=2
    # -----------------------------
    if days == 7 and payment.payment_status == "0":
        Payment.update_status_when_check(payment.payment_id, "2")

        send(parent_email,
            f"[EazeTuition] Payment Overdue for {student_name}",
            f"<p>Dear {parent_name},</p><p>Your payment is now overdue.</p>"
        )
        return

    # -----------------------------
    # (3) After 14 days → Weekly Monday Reminder
    # -----------------------------
    if 14 <= days < 30 and payment.payment_status == "0":
        Payment.update_status_when_check(payment.payment_id, "2")
        if now.weekday() == 0:  # Monday only
            send(parent_email,
                f"[EazeTuition] Weekly Reminder for {student_name}",
                f"<p>Dear {parent_name},</p><p>Your payment is still unpaid. If your payment have overdue one month, your child will be barred from current class.</p>",
                f"<br><p>Check on your apps for pending payment or go to the tuition central for make payment.</p>"

            )
        return

    # -----------------------------
    # (4) 30 Days → Terminate & status=3
    # -----------------------------
    if days >= 30 and payment.payment_status in ("0", "2"):
        Payment.update_status_when_check(payment.payment_id, "3")

        # Terminate all related enrollments
        for detail in payment.details:
            if detail.class_enrollment_id:
                Class_Enrollment.deactivate_class_enrollment(detail.class_enrollment_id)
            if detail.service_id:
                Service_Enrollment.deactivate_enrollment_for_barred(payment.student_id, detail.service_id)

        send(parent_email,
            f"[EazeTuition] Enrollment Terminated for {student_name}",
            f"<p>Dear {parent_name},</p><p>Due to 30 days non-payment, your child's enrollment has been barred.</p>"
        )
        return

def check_and_update_payment_status():
    from app import app

    with app.app_context():
        # Only handle unpaid / overdue
        payments = Payment.query.filter(
            Payment.payment_status.in_(["0", "2"])
        ).all()

        for p in payments:
            handle_payment_status(p)


#======================================================================================
# Payment Mobile Control
#======================================================================================
@payment_bp.route('/pending-payment/<int:parent_id>', methods=['GET'])
def get_pending_payment_by_parent(parent_id):
    """
    Return all pending payments for students belonging to a given parent.
    Each record includes:
      - id
      - name: "<student_name>'s <Month> <Year> Payment"
      - amount: total final_amt
      - description: all service_name/class_name combined
      - status
      - created_at
    """
    try:
        pending_payments = Payment.get_pending_by_parent(parent_id)


        results = []
        for p in pending_payments:
            student_user = getattr(p.student, "user", None)
            student_name = getattr(student_user, "name", "Student")

            # ✅ Format month & year from created_datetime
            created_dt = p.created_datetime or datetime.utcnow()
            payment_month = created_dt.strftime("%b")   # e.g. "December"
            payment_year = created_dt.strftime("%Y")    # e.g. "2025"

            # ✅ Collect all class_name + service_name from details
            detail_names = []
            for d in getattr(p, "details", []):
                if d.class_name:
                    detail_names.append(d.class_name)
                if d.service_name:
                    detail_names.append(d.service_name)

            # Combine into a single line (comma-separated)
            description = ", ".join(detail_names) if detail_names else "No details available"

            # ✅ Final record
            results.append({
                "payment_id": p.payment_id,
                "name": f"{student_name}'s {payment_month} {payment_year} Payment",
                "amount": float(p.final_amt or 0),
                "description": description,
                "payment_status": (
                    "pending" if p.payment_status == "0"
                    else "overdue" if p.payment_status == "2"
                    else "paid" if p.payment_status == "1"
                    else "barred"
                ),
                "created_at": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
            })

        return jsonify(results), 200

    except Exception as e:
        current_app.logger.error(f"❌ Error fetching pending payments: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch pending payments"}), 500

@payment_bp.route('/all/<int:parent_id>', methods=['GET'])
def get_all_payments_by_parent(parent_id):
    """
    📱 Return payments for a parent.
    Optional filters:
      - from_date=YYYY-MM-DD (only payments created after or on this date)
      - to_date=YYYY-MM-DD (only payments created before or on this date)
    """
    try:
        # ✅ 解析参数
        from_date_str = request.args.get("from_date")
        to_date_str = request.args.get("to_date")

        from_date = datetime.strptime(from_date_str, "%Y-%m-%d") if from_date_str else None
        to_date = datetime.strptime(to_date_str, "%Y-%m-%d") if to_date_str else None

        # ✅ 构造查询
        query = Payment.query.join(Student).filter(Student.parent_id == parent_id)

        if from_date:
            query = query.filter(func.date(Payment.created_datetime) >= from_date)
        if to_date:
            query = query.filter(func.date(Payment.created_datetime) <= to_date)

        payments = query.order_by(Payment.created_datetime.desc()).all()

        results = []
        for p in payments:
            student_user = getattr(p.student, "user", None)
            student_name = getattr(student_user, "name", "Student")

            created_dt = p.created_datetime or datetime.utcnow()
            payment_month = created_dt.strftime("%b")
            payment_year = created_dt.strftime("%Y")

            # ✅ 获取每个 payment 的明细列表
            
            details_data = []
            details = p.details or []
            for d in details:
                details_data.append({
                    "payment_detail_id": d.payment_detail_id,
                    "payment_id": d.payment_id,  # <-- 外键非常重要
                    "class_name": d.class_name,
                    "class_fee": float(d.class_fee or 0),
                    "service_name": d.service_name,
                    "service_fee": float(d.service_fee or 0),
                    "service_attend_time": d.service_attend_time,
                    "fee_type": d.fee_type,
                    "class_detail_id": d.class_detail_id,
                    "set_id": d.set_id,
                    "class_enrollment_id": d.class_enrollment_id,
                })
                
            # ✅ 汇总 description
            detail_names = [
                n for d in getattr(p, "details", [])
                for n in (d.class_name, d.service_name) if n
            ]
            description = ", ".join(detail_names) if detail_names else "No details available"

            status_map = {
                '0': 'pending',
                '1': 'paid',
                '2': 'overdue',
                '3': 'barred'
            }
            status_label = status_map.get(p.payment_status, "unknown")

            results.append({
                "payment_id": p.payment_id,
                "student_id": p.student_id,
                "name": f"{student_name}'s {payment_month} {payment_year} Payment",
                "amount": float(p.final_amt or 0),
                "discount_amt": float(p.discount_amt or 0),
                "received_amt": float(p.received_amt or 0),
                "change_amt": float(p.change_amt or 0),
                "method": p.payment_method,
                "payment_status": status_label,
                "created_at": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_datetime": (
                    p.payment_datetime.strftime("%Y-%m-%d %H:%M:%S")
                    if p.payment_datetime else None
                ),
                "description": description,
                "details": details_data,
            })


        return jsonify(results), 200

    except Exception as e:
        current_app.logger.error(
            f"❌ Error fetching filtered payments for parent {parent_id}: {e}",
            exc_info=True
        )
        return jsonify({"error": "Failed to fetch payments"}), 500


@payment_bp.route('/mobile/detail/<int:payment_id>', methods=['GET'])
def mobile_payment_detail(payment_id):
    """
    📱 Mobile: return a single payment with full details (JSON only)
    """
    try:
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        student_user = getattr(payment.student, "user", None)
        student_name = getattr(student_user, "name", "Student")

        created_dt = payment.created_datetime or datetime.utcnow()
        payment_month = created_dt.strftime("%b")
        payment_year = created_dt.strftime("%Y")

        # --- Build details ---
        details_data = []
        for d in getattr(payment, "details", []):
            details_data.append({
                "payment_detail_id": d.payment_detail_id,
                "payment_id": d.payment_id,
                "class_name": d.class_name,
                "class_fee": float(d.class_fee or 0),
                "service_name": d.service_name,
                "service_fee": float(d.service_fee or 0),
                "service_attend_time": d.service_attend_time,
                "fee_type": d.fee_type,
                "class_detail_id": d.class_detail_id,
                "set_id": d.set_id,
                "class_enrollment_id": d.class_enrollment_id,
            })

        # --- Build description ---
        detail_names = [
            n
            for d in getattr(payment, "details", [])
            for n in (d.class_name, d.service_name)
            if n
        ]
        description = ", ".join(detail_names) if detail_names else "No details available"

        status_map = {
            '0': 'pending',
            '1': 'paid',
            '2': 'overdue',
            '3': 'barred'
        }
        status_label = status_map.get(payment.payment_status, "unknown")

        # --- Final output ---
        result = {
            "payment_id": payment.payment_id,
            "student_id": payment.student_id,
            "name": f"{student_name}'s {payment_month} {payment_year} Payment",
            "final_amt": float(payment.final_amt or 0),
            "discount_amt": float(payment.discount_amt or 0),
            "received_amt": float(payment.received_amt or 0),
            "change_amt": float(payment.change_amt or 0),
            "method": payment.payment_method,
            "payment_status": status_label,
            "created_at": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "payment_datetime": (
                payment.payment_datetime.strftime("%Y-%m-%d %H:%M:%S")
                if payment.payment_datetime else None
            ),
            "description": description,
            "details": details_data,
        }

        return jsonify(result), 200

    except Exception as e:
        print("❌ Mobile payment detail error:", e)
        return jsonify({"error": "Failed to load payment detail"}), 500


@payment_bp.route('/delete-pending/<int:payment_id>', methods=['DELETE'])
def delete_pending_payment(payment_id):
    result, status = Payment.delete_payment(payment_id)
    return jsonify(result), status


#========================================================================
# Stripe Handle
#========================================================================
import stripe
from config import Config
stripe.api_key = Config.STRIPE_SECRET_KEY

# For new class enrollment
@payment_bp.route('/stripe/create-sheet', methods=['POST'])
def create_payment_sheet():
    data = request.get_json()
    payment_id = data.get("payment_id")
    class_pairs = data.get("class_pairs", [])  # mobile enrollment 才会传

    if not payment_id:
        return jsonify({"error": "Missing payment_id"}), 400

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    amount = int(float(payment.final_amt) * 100)

    try:
        # 1️⃣ Create customer
        customer = stripe.Customer.create()

        # 2️⃣ Create ephemeral key
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer["id"],
            stripe_version="2022-11-15"
        )

        # ⭐ 先建 metadata
        metadata = {
            "payment_id": str(payment_id),
            "payment_type": payment.payment_type or "manual"
        }

        # ⭐ enrollment extra data
        if payment.payment_type == "enrollment":
            details = Payment_Detail.query.filter_by(payment_id=payment_id).all()
            class_pairs = [
                {"class_detail_id": d.class_detail_id, "set_id": d.set_id}
                for d in details
            ]

            metadata["class_pairs"] = json.dumps(class_pairs)

        # 3️⃣ Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="myr",
            customer=customer["id"],
            automatic_payment_methods={"enabled": True},
            metadata=metadata
        )

        return jsonify({
            "paymentIntent": payment_intent.client_secret,
            "ephemeralKey": ephemeral_key.secret,
            "customer": customer["id"],
        })

    except Exception as e:
        print("Stripe error:", e)
        return jsonify({"error": str(e)}), 500


# For new service enrollment
@payment_bp.route('/stripe/create-sheet-service', methods=['POST'])
def create_payment_sheet_service():
    """
    Create Stripe PaymentSheet for SERVICE enrollment.
    """
    data = request.get_json()
    payment_id = data.get("payment_id")
    address = data.get("address")

    if not payment_id:
        return jsonify({"error": "Missing payment_id"}), 400

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    # Convert RM → sen
    amount = int(float(payment.final_amt) * 100)

    try:
        # 1️⃣ Create customer
        customer = stripe.Customer.create()

        # 2️⃣ Ephemeral key
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer["id"],
            stripe_version="2022-11-15"
        )

        # 3️⃣ Build metadata
        details = Payment_Detail.query.filter_by(payment_id=payment_id).all()

        service_ids = [d.service_id for d in details if d.service_id]

        metadata = {
            "payment_id": str(payment_id),
            "payment_type": "service_enrollment",
            "service_ids": json.dumps(service_ids),
            "transport_address": address or ""
        }

        # 4️⃣ Create PaymentIntent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="myr",
            customer=customer["id"],
            automatic_payment_methods={"enabled": True},
            metadata=metadata
        )

        return jsonify({
            "paymentIntent": payment_intent.client_secret,
            "ephemeralKey": ephemeral_key.secret,
            "customer": customer["id"],
        })

    except Exception as e:
        print("Stripe error:", e)
        return jsonify({"error": str(e)}), 500


@payment_bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, Config.STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        return "Webhook error", 400

    event_type = event["type"]
    intent = event["data"]["object"]
    metadata = intent.get("metadata", {})

    payment_id = metadata.get("payment_id")
    payment_type = metadata.get("payment_type", "manual")

    # If payment_id missing, skip (Stripe test events)
    if not payment_id:
        return "OK", 200

    # -------------------------------
    # Payment Intent Succeeded
    # -------------------------------
    if event_type == "payment_intent.succeeded":

        Payment.update_status(
            payment_id=payment_id,
            status='1',
            method='2',
            received_amt=intent["amount_received"] / 100,
        )

        if payment_type == "enrollment":
            class_pairs = json.loads(metadata.get("class_pairs", "[]"))

            # create enrollment
            enrollment_list = Class_Enrollment.bulk_create_from_pairs(payment_id, class_pairs)

            # 回填 payment_detail
            for e in enrollment_list:
                Payment_Detail.update_enrollment_link(
                    payment_id,
                    e["class_detail_id"],
                    e["set_id"],
                    e["enrollment_id"]
                )

            send_enrollment_email(payment_id)

        elif payment_type == "service_enrollment":
            service_ids = json.loads(metadata.get("service_ids", "[]"))

            # create service enrollment
            service_ids = json.loads(metadata.get("service_ids", "[]"))
            address = metadata.get("transport_address")  # 取出 metadata

            enrollment_list = Service_Enrollment.bulk_create_from_payment(
                payment_id,
                service_ids,
                address
            )

            # 3️⃣ send email
            send_enrollment_email_service(payment_id)

        elif payment_type == "monthly":
            send_monthly_payment_email(payment_id)

        return "OK", 200

    # -------------------------------
    # Payment Intent Failed
    # -------------------------------
    if event_type == "payment_intent.payment_failed":
        Payment.update_status(
            payment_id=payment_id,
            status='-1',
            method='2',
            received_amt=0
        )
        return "OK", 200

    # -------------------------------
    # Payment Intent Canceled
    # -------------------------------
    if event_type == "payment_intent.canceled":
        Payment.update_status(
            payment_id=payment_id,
            status='-2',
            method='2',
            received_amt=0
        )
        return "OK", 200

    return "OK", 200

#========================================================================
# Receipt PDF Generate
#========================================================================
@payment_bp.route('/<int:payment_id>/receipt', methods=['GET'])
def download_receipt(payment_id):
    payment = Payment.query.get(payment_id)

    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    buffer = generate_receipt_pdf(payment)

    return send_file(
        buffer,
        as_attachment=True,  # mobile must download
        download_name=f"receipt_{payment_id}.pdf",
        mimetype="application/pdf"
    )

@payment_bp.route('/<int:payment_id>/receipt/preview', methods=['GET'])
def preview_receipt(payment_id):
    payment = Payment.query.get(payment_id)

    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    buffer = generate_receipt_pdf(payment)
    print("Generating PDF...", buffer.getbuffer().nbytes)


    return send_file(
        buffer,
        as_attachment=False,   # allow inline preview
        download_name=f"receipt_{payment_id}.pdf",
        mimetype="application/pdf"
    )


def generate_receipt_pdf(payment):
    details = payment.details  # ensure relationship exists

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    x_left = 25
    y = 800

    def line(y_pos):
        pdf.line(25, y_pos, 570, y_pos)

    pdf.setTitle(f"Receipt_{payment.payment_id}")

    # BUSINESS HEADER
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(x_left, y, "EazeTuition")
    y -= 18

    pdf.setFont("Helvetica", 10)
    pdf.drawString(x_left, y, "Address: No. 123, Jalan Education, Kuala Lumpur, Malaysia")
    y -= 14
    pdf.drawString(x_left, y, "Email: contact@eazetuition.com    Phone: +60 12-345 6789")
    y -= 20

    line(y)
    y -= 24

    # RECEIPT INFO
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(x_left, y, "Payment Receipt")
    y -= 20

    pdf.setFont("Helvetica", 11)
    pdf.drawString(x_left, y, f"Receipt No: {payment.payment_id}")
    y -= 14

    pdf.drawString(x_left, y, f"Student: {payment.student.user.name}")
    y -= 14

    parent_name = payment.student.parent.user.name if payment.student.parent else "N/A"
    pdf.drawString(x_left, y, f"Parent: {parent_name}")
    y -= 14

    if payment.payment_datetime:
        paid_date = Helper.format_full_datetime_12h(payment.payment_datetime)
    else:
        paid_date = Helper.format_full_datetime_12h(payment.created_datetime)

    pdf.drawString(x_left, y, f"Paid Date: {paid_date}")
    y -= 14

    pdf.drawString(x_left, y, f"Payment Method: {Helper.format_payment_method(payment.payment_method)}")
    y -= 20

    line(y)
    y -= 25

    # ITEMIZED DETAILS
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(x_left, y, "Item")
    pdf.drawString(350, y, "Qty")
    pdf.drawString(420, y, "Amount (RM)")
    y -= 15
    line(y)
    y -= 15

    pdf.setFont("Helvetica", 11)

    for d in details:
        if d.class_name:
            name = d.class_name
            qty = "1"
            amt = f"{d.class_fee:.2f}"
        elif d.service_name:
            qty = str(d.service_attend_time or 1)
            name = d.service_name
            unit = float(d.service_fee or 0)
            amt = f"{(unit * int(qty)):.2f}"
        else:
            name = "Item"
            qty = "1"
            amt = "0.00"

        pdf.drawString(x_left, y, name[:40])
        pdf.drawString(350, y, qty)
        pdf.drawRightString(550, y, amt)
        y -= 15

    y -= 10
    line(y)
    y -= 20

    # SUMMARY
    pdf.setFont("Helvetica", 11)
    pdf.drawString(350, y, "Subtotal:")
    pdf.drawRightString(550, y, f"{(payment.final_amt + payment.discount_amt):.2f}")
    y -= 14

    pdf.drawString(350, y, "Discount:")
    pdf.drawRightString(550, y, f"-{payment.discount_amt:.2f}")
    y -= 14

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(350, y, "Total Paid:")
    pdf.drawRightString(550, y, f"{payment.final_amt:.2f}")
    y -= 25

    line(y)
    y -= 25

    # FOOTER
    pdf.setFont("Helvetica-Oblique", 11)
    pdf.drawString(x_left, y, "Thank you for choosing EazeTuition!")
    y -= 14
    pdf.drawString(x_left, y, "This is a system-generated receipt.")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return buffer
