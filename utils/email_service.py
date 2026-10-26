from flask_mail import Message
from flask import current_app
import threading
from models.student_model import Student
from models.payment_model import Payment, Payment_Detail
from models.class_enrollment_model import Class_Enrollment
from helper import Helper


# ================================================================
# Generic Sender
# ================================================================
def send_payment_email(parent_email, subject, html_body, app):
    """Reusable async email sender."""
    if not parent_email:
        return False

    msg = Message(subject=subject, recipients=[parent_email], html=html_body)
    threading.Thread(target=Helper.send_async_email, args=(app, msg)).start()
    return True


# ================================================================
# Enrollment Email
# ================================================================
def send_enrollment_email(payment_id):
    """Send class enrollment confirmation email."""
    from app import app

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return False

    student = Student.get_by_id(payment.student_id)
    parent_email = student.parent.user.email if student.parent and student.parent.user else None

    # Get all newly enrolled classes from payment
    enrollments = Class_Enrollment.get_by_payment(payment_id)

    class_list_html = ""
    for e in enrollments:
        class_list_html += f"""
            <li>
                <strong>{e.class_detail.class_.subject.name}</strong> 
                ({e.class_detail.class_.class_type})
                — {e.class_detail.start_time} to {e.class_detail.end_time}
            </li>
        """

    html_body = f"""
    <p>Dear {student.parent.user.name},</p>
    <p>Your enrolment for <strong>{student.user.name}</strong> has been successfully processed.</p>

    <p><strong>Payment ID:</strong> {payment_id}<br>
       <strong>Total Paid:</strong> RM {payment.final_amt:.2f}</p>

    <p><strong>Enrolled Classes:</strong></p>
    <ul>
        {class_list_html}
    </ul>

    <p>Thank you for choosing EazeTuition.</p>
    """

    return send_payment_email(
        parent_email,
        f"[EazeTuition] Enrollment Confirmation for {student.user.name}",
        html_body,
        app
    )

def send_enrollment_email_service(payment_id, transport_address=None):
    """Send service enrollment confirmation email."""
    from app import app

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return False

    student = Student.get_by_id(payment.student_id)
    parent_email = student.parent.user.email if student.parent and student.parent.user else None

    # Get newly enrolled services
    details = Payment_Detail.query.filter_by(payment_id=payment_id).all()

    service_items_html = ""
    for d in details:
        service_items_html += f"""
            <li>
                <strong>{d.service_name}</strong> — RM {d.service_fee:.2f}
            </li>
        """

    # Extra section for transport
    transport_html = ""
    if transport_address:
        transport_html = f"""
            <p><strong>Transport Address:</strong><br>
            {transport_address}</p>
        """

    html_body = f"""
    <p>Dear {student.parent.user.name},</p>
    <p>The service enrolment for <strong>{student.user.name}</strong> has been successfully processed.</p>

    <p><strong>Payment ID:</strong> {payment_id}<br>
       <strong>Total Paid:</strong> RM {payment.final_amt:.2f}</p>

    <p><strong>Enrolled Services:</strong></p>
    <ul>
        {service_items_html}
    </ul>

    {transport_html}

    <p>Thank you for choosing EazeTuition.</p>
    """

    return send_payment_email(
        parent_email,
        f"[EazeTuition] Service Enrollment Confirmation for {student.user.name}",
        html_body,
        app
    )


# ================================================================
# Monthly Payment Email
# ================================================================
def send_monthly_payment_email(payment_id):
    """Send monthly payment invoice email."""
    from app import app

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return False

    student = payment.student
    parent_user = student.parent.user if student.parent else None
    parent_email = parent_user.email if parent_user else None

    # Build description text
    detail_lines = []
    for d in payment.details:
        if d.class_name:
            detail_lines.append(f"<li>{d.class_name} — RM {d.class_fee:.2f}</li>")
        if d.service_name:
            detail_lines.append(f"<li>{d.service_name} — RM {d.service_fee:.2f}</li>")

    html_body = f"""
    <p>Dear {parent_user.name},</p>
    <p>A new monthly payment has been generated for <strong>{student.user.name}</strong>.</p>

    <p><strong>Total Amount:</strong> RM {payment.final_amt:.2f}</p>

    <p><strong>Included Items:</strong></p>
    <ul>
        {''.join(detail_lines)}
    </ul>

    <p>Please log in to your account to proceed with payment.</p>
    <p>EazeTuition Team</p>
    """

    return send_payment_email(
        parent_email,
        f"[EazeTuition] Monthly Payment for {student.user.name}",
        html_body,
        app
    )


# ================================================================
# Manual Payment Email (Admin recorded payment)
# ================================================================
def send_manual_payment_email(payment_id, method, received_amt, change_amt):
    """Send email when admin manually collects payment."""
    from app import app

    payment = Payment.get_by_id(payment_id)
    if not payment:
        return False

    student = payment.student
    parent = student.parent.user if student.parent else None
    parent_email = parent.email if parent else None

    html_body = f"""
    <p>Dear {parent.name},</p>
    <p>Your payment for <strong>{student.user.name}</strong> has been recorded.</p>

    <p><strong>Payment ID:</strong> {payment_id}<br>
       <strong>Amount Paid:</strong> RM {received_amt:.2f}<br>
       <strong>Payment Method:</strong> {method}<br>
       <strong>Change Returned:</strong> RM {change_amt:.2f}</p>

    <p>Thank you!</p>
    """

    return send_payment_email(
        parent_email,
        f"[EazeTuition] Payment Confirmation for {student.user.name}",
        html_body,
        app
    )

