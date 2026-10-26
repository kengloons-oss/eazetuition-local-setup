from datetime import datetime
import math
from flask import Blueprint, json, render_template, request, redirect, url_for, jsonify
from flask_paginate import Pagination
from flask_mail import Message
import threading

from helper import Helper
from models.other_service_model import Other_Service
from models.payment_model import Payment
from models.service_enrollment_model import Service_Enrollment
from models.student_model import Student
from middlewares.admin_required import admin_required, admin_api_required

service_bp = Blueprint('service', __name__, url_prefix='/service')


@service_bp.route('/list')
@admin_required
def service_list():
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
    service_name = request.args.get('search_service_name')
    status = request.args.get('status')
    service_type = request.args.get('service_type')
    fee_type = request.args.get('fee_type')
    sort = request.args.get('sort') or 'class_id'
    dir = request.args.get('dir') or 'asc'

    range_filters = {
        'fee_per_month_min': request.args.get('fee_per_month_min', type=int),
        'fee_per_month_max': request.args.get('fee_per_month_max', type=int),
        'fee_per_att_min': request.args.get('fee_per_att_min', type=int),
        'fee_per_att_max': request.args.get('fee_per_att_max', type=int),
    }

    if status is None:
        status = '1'

    # Filtered and sorted query
    query = Other_Service.get_filtered(service_name, status, service_type, fee_type, range_filters, sort, dir)
    total = query.distinct(Other_Service.service_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    services = query.offset(offset).limit(per_page).all()


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
        href=f"?name={service_name or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'services': services,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'name': service_name,
        'status': status,
        'title': 'Other Service | List',
        'page_count' : max_page,
        'current_count' : len(services),
        'total_count' : total
    }

    fields = [
        {"name": "service_id", "label": "Service ID"},
        {"name": "service_name", "label": "Name"},
        {"name": "service_type", "label": "Service Type"},
        {"name": "fee_type", "label": "Fee Type"},
    ]

    #Header
    breadcrumbs = [
        ('Other Service', url_for('service.service_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/other_service/_service_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/other_service/service_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

@service_bp.route('/add', methods=['GET', 'POST'])
@admin_required
def add_service():

    # =============================
    # Page Header
    # =============================
    breadcrumbs = [
        ('Other Service', url_for('service.service_list')),
        ('Add', None)
    ]
    title = 'Other Service | Add'

    # =============================
    # Handle POST (AJAX)
    # =============================
    if request.method == 'POST':
        try:
            data = request.get_json()

            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            service_type = data.get('service_type')
            fee_type = data.get('fee_type')
            deposit_fee = data.get('deposit_fee')
            fee_per_month = data.get('fee_per_month')
            fee_per_att = data.get('fee_per_att')

            # =============================
            # Basic Validation
            # =============================
            if not name:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Service name is required.'})

            if not description:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Description is required.'})

            if not service_type:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Service type is required.'})

            if not fee_type:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Fee type is required.'})

            # =============================
            # Fee Type Validation
            # =============================
            if fee_type == '1':  # Pay Direct
                # fee_per_month is required, deposit and attendance must be None
                if not fee_per_month:
                    return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Fee per month is required for Pay Direct type.'})
                deposit_fee = None
                fee_per_att = None

            elif fee_type == '2':  # Deposit + Per Attendance
                # deposit_fee and fee_per_att required, fee_per_month must be None
                if not deposit_fee or not fee_per_att:
                    return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Deposit fee and fee per attendance are required for Deposit + Per Attendance type.'})
                fee_per_month = None

            else:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Invalid fee type selected.'})

            # =============================
            # Prepare Service Data
            # =============================
            service_data = {
                'name': name,
                'description': description,
                'service_type': service_type,
                'fee_type': fee_type,
                'deposit_fee': deposit_fee,
                'service_fee_per_month': fee_per_month,
                'service_fee_per_attend': fee_per_att,
                'status': '1'
            }

            # =============================
            # Add to Database
            # =============================
            Other_Service.add(service_data)

            return jsonify({
                'status': 'success',
                'title': 'Service Added',
                'message': 'The service has been successfully added.',
                'redirectUrl': '/service/list'
            })

        except Exception as e:
            print(f"Add Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Oops...',
                'message': 'Failed to add the service. Please try again.'
            })

    # =============================
    # GET Request → Render Page
    # =============================
    return render_template('/admin/other_service/add_service.html',
                           breadcrumbs=breadcrumbs, title=title)

@service_bp.route('/detail/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_service(id):
    # =============================
    # Fetch and Validate Service
    # =============================
    service = Other_Service.get_by_id(id)
    if service is None:
        return redirect(url_for(
            'service.service_list',
            status='error',
            title='Service Not Found',
            message='The service you are trying to view does not exist.'
        ))

    breadcrumbs = [
        ('Other Service', url_for('service.service_list')),
        ('Edit', None)
    ]
    title = f'Other Service | OS{id:04d}'

    # =============================
    # Handle POST (AJAX)
    # =============================
    if request.method == 'POST':
        try:
            data = request.get_json()

            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            service_type = data.get('service_type')
            fee_type = data.get('fee_type')
            deposit_fee = data.get('deposit_fee')
            fee_per_month = data.get('fee_per_month')
            fee_per_att = data.get('fee_per_att')

            # =============================
            # Basic Validation
            # =============================
            if not name:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Service name is required.'})

            if not description:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Description is required.'})

            if not service_type:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Service type is required.'})

            if not fee_type:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Fee type is required.'})

            # =============================
            # Fee Type Validation
            # =============================
            if fee_type == '1':  # Pay Direct
                if not fee_per_month:
                    return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Fee per month is required for Pay Direct type.'})
                deposit_fee = None
                fee_per_att = None

            elif fee_type == '2':  # Deposit + Per Attendance
                if not deposit_fee or not fee_per_att:
                    return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Deposit fee and fee per attendance are required for Deposit + Per Attendance type.'})
                fee_per_month = None

            else:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Invalid fee type selected.'})

            # =============================
            # Prepare Service Data
            # =============================
            service_data = {
                'service_id': id,
                'name': name,
                'description': description,
                'service_type': service_type,
                'fee_type': fee_type,
                'deposit_fee': deposit_fee,
                'service_fee_per_month': fee_per_month,
                'service_fee_per_attend': fee_per_att,
                'status': '1'
            }

            # =============================
            # Update Database
            # =============================
            Other_Service.update(id, service_data)

            return jsonify({
                'status': 'success',
                'title': 'Service Updated',
                'message': 'The service has been successfully updated.',
                'redirectUrl': '/service/list'
            })

        except Exception as e:
            print(f"Edit Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Oops...',
                'message': 'Failed to update the service. Please try again.'
            })

    # =============================
    # GET Request → Render Page
    # =============================
    return render_template(
        '/admin/other_service/edit_service.html',
        service=service,
        breadcrumbs=breadcrumbs,
        title=title
    )


@service_bp.route('/deactivate/<int:id>', methods=['POST'])
@admin_required
def deactivate_service(id):
    service = Other_Service.query.get(id)
    if not service:
        return jsonify(success=False, error="Service not found")

    service.update_status(id, '0')
    return jsonify(success=True)


#=================================================================================================================
# Service Enrollment Control
#=================================================================================================================
@service_bp.route('/enrollment/list')
@admin_required
def service_enrollment_list():
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
    service_name = request.args.get('search_service_name')
    status = request.args.get('status')
    min_enroll_date = request.args.get('enrollment_date_min')
    max_enroll_date = request.args.get('enrollment_date_max')
    sort = request.args.get('sort') or 'enroll_datetime'
    dir = request.args.get('dir') or 'desc'

    if status is None:
        status = '1'

    # Filtered and sorted query
    query = Service_Enrollment.get_enrollment_filtered(
        student_name_email=student_name_email,
        service_name=service_name,
        status=status,
        min_enroll_date=min_enroll_date,
        max_enroll_date=max_enroll_date,
        sort=sort,
        dir=dir
    )

    total = query.distinct(Service_Enrollment.student_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    enrollments = query.offset(offset).limit(per_page).all()


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
        href=f"?student_name_email={student_name_email or ''}&service_name={service_name or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'enrollments': enrollments,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'student_name_email': student_name_email,
        'service_name': service_name,
        'status': status,
        'title': 'Service Enrollment | List',
        'page_count' : max_page,
        'current_count' : len(enrollments),
        'total_count' : total
    }

    fields = [
        {"name": "name", "label": "Service"},
        {"name": "student_name", "label": "Student"},
        {"name": "enroll_datetime", "label": "Enroll Date"}
    ]

    #Header
    breadcrumbs = [
        ('Service Enrollment', url_for('service.service_enrollment_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/other_service/_enrollment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/other_service/enrollment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)



@service_bp.route('/enrollment/add', methods=['GET', 'POST'])
@admin_required
def add_service_enrollment():
    from app import app

    students = Student.get_active_student()

    breadcrumbs = [
        ('Other Service', url_for('service.service_list')),
        ('Enrollment', url_for('service.service_enrollment_list')),
        ('Add', None)
    ]
    title = 'Service Enrollment | Add'

    if request.method == 'POST':
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            selected_services = data.get('selectedServices', [])
            service_type = data.get('service_type')
            address = data.get('address')

            # ✅ Validation
            if not student_id:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Student is required.'})
            if not service_type:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Service type is required.'})
            if not selected_services:
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'At least one service must be selected.'})
            if service_type == '2' and (not address or not address.strip()):
                return jsonify({'status': 'error', 'title': 'Validation Error', 'message': 'Address is required for Transport services.'})

            student = Student.get_by_id(student_id)
            if not student:
                return jsonify({'status': 'error', 'title': 'Invalid Student', 'message': 'Selected student does not exist.'})

            valid_services = Other_Service.get_active_service(service_type)
            valid_service_ids = {str(s.service_id) for s in valid_services}
            invalid_services = [sid for sid in selected_services if str(sid) not in valid_service_ids]
            if invalid_services:
                return jsonify({'status': 'error', 'title': 'Invalid Service(s)', 'message': f"Invalid service(s): {', '.join(map(str, invalid_services))}"})

            enrolled_service_ids = {str(sid) for (sid,) in Service_Enrollment.get_enrolled_service(student_id)}
            duplicate_services = [sid for sid in selected_services if str(sid) in enrolled_service_ids]
            if duplicate_services:
                return jsonify({'status': 'error', 'title': 'Duplicate Enrollment', 'message': f"The student is already enrolled in: {', '.join(map(str, duplicate_services))}"})

            # ✅ Build data list
            enrollments_data = [
                {
                    'student_id': student_id,
                    'service_id': sid,
                    'address': address if service_type == '2' else None,
                    'status': '1'
                }
                for sid in selected_services
            ]

            # ✅ Insert all at once
            success, result_data = Service_Enrollment.add_multiple(enrollments_data)

            if not success:
                return jsonify({
                    'status': 'error',
                    'title': 'Database Error',
                    'message': 'Failed to add service enrollments. Please try again.'
                })

            # ✅ Send email to parent
            if result_data and result_data['parent_email']:
                services_html = "".join(
                    f"<li>{d['service_name']} — RM {d['service_fee']:.2f}</li>"
                    for d in result_data['payment_details']
                )

                msg = Message(
                    subject=f"[EazeTuition] New Payment Created for {result_data['student_name']}",
                    recipients=[result_data['parent_email']],
                    html=f"""
                    <p>Dear {result_data['parent_name']},</p>
                    <p>A new payment record has been created for <strong>{result_data['student_name']}</strong>:</p>
                    <ul>{services_html}</ul>
                    <p><strong>Total Fee:</strong> RM {result_data['total_fee']:.2f}</p>
                    <p>Status: <strong>Pending</strong></p>
                    <p>Thank you,<br/>EazeTuition Team</p>
                    """
                )
                threading.Thread(target=Helper.send_async_email, args=(app, msg)).start()

            return jsonify({
                'status': 'success',
                'title': 'Service Enrollment Added',
                'message': 'Service enrollment(s) successfully added.',
                'redirectUrl': '/service/enrollment/list'
            })

        except Exception as e:
            print(f"Add Service Enrollment Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Unexpected Error',
                'message': 'An unexpected error occurred while adding enrollment. Please try again.'
            })

    return render_template(
        '/admin/other_service/add_enrollment.html',
        students=students,
        breadcrumbs=breadcrumbs,
        title=title
    )


@service_bp.route('/enrollment/detail', methods=['GET', 'POST'])
@admin_required
def service_enrollment_detail():
    if request.method == 'POST':
        data = request.get_json() or {}
        service_enrollment_id = data.get('service_enrollment_id')
        address = data.get('address', '').strip()
    else:
        # for GET (page load)
        service_enrollment_id = request.args.get('service_enrollment_id')

    enrollment = Service_Enrollment.query.filter_by(
        service_enrollment_id=service_enrollment_id
    ).first()

    if enrollment is None:
        # return JSON error for POST, redirect for GET
        if request.method == 'POST':
            return jsonify({
                'status': 'error',
                'title': 'Service Enrollment Not Found',
                'message': 'The enrollment you are trying to view does not exist.'
            }), 404
        else:
            return redirect(url_for(
                'service.service_enrollment_list',
                status='error',
                title='Service Enrollment Not Found',
                message='The enrollment you are trying to view does not exist.'
            ))

    # For POST: handle update
    if request.method == 'POST':
        # ✅ Validation
        if not address or len(address) < 5:
            return jsonify({
                'status': 'error',
                'title': 'Invalid Address',
                'message': 'Address must be at least 5 characters long.'
            }), 400

        success, message = Service_Enrollment.update_address(service_enrollment_id, address)

        if success:
            return jsonify({
                'status': 'success',
                'title': 'Address Updated',
                'message': message,
                'redirectUrl': '/service/enrollment/list'
            })
        else:
            return jsonify({
                'status': 'error',
                'title': 'Update Failed',
                'message': message
            }), 500

    # For GET: render page
    breadcrumbs = [
        ('Other Service', url_for('service.service_list')),
        ('Enrollment', url_for('service.service_enrollment_list')),
        ('Edit', None)
    ]
    title = f'Service Enrollment | {enrollment.student.user.name}'

    return render_template(
        'admin/other_service/edit_enrollment.html',
        enrollment=enrollment,
        breadcrumbs=breadcrumbs,
        title=title
    )


@service_bp.route('/available_services/<int:student_id>', methods=['GET'])
@admin_api_required
def get_available_services(student_id):
    service_type = request.args.get('service_type', type=str)

    # 1️⃣ Validate student existence
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    # 2️⃣ Get all active services of the given type
    active_services = Other_Service.get_active_service(service_type)

    if not active_services:
        return jsonify({'available_services': []})

    # 3️⃣ Get all active enrollments for the student
    enrolled_service_ids = Service_Enrollment.get_enrolled_service(student_id)

    enrolled_service_ids = [sid for (sid,) in enrolled_service_ids]

    # 4️⃣ Filter out already enrolled services
    available_services = [
        s for s in active_services if s.service_id not in enrolled_service_ids
    ]

    # 5️⃣ Build response
    available_list = [
        {
            'service_id': s.service_id,
            'name': s.name,
            'description': s.description,
            'fee_type': s.fee_type,
            'deposit_fee': s.deposit_fee,
            'service_fee_per_month': s.service_fee_per_month,
            'service_fee_per_attend': s.service_fee_per_attend,
            'service_type': s.service_type
        }
        for s in available_services
    ]

    return jsonify({'available_services': available_list})


@service_bp.route('/enrollment/deactivate/<int:service_enrollment_id>', methods=['POST'])
@admin_required
def deactivate_service_enrollment(service_enrollment_id):

    if not service_enrollment_id:
        return jsonify(success=False, error="Missing service ID")

    result = Service_Enrollment.deactivate_enrollment(service_enrollment_id)

    if not result:
        return jsonify(success=False, error="Enrollment not found or could not be updated")

    return jsonify(success=True)


#=================================================================================================================
# Service Control (Mobile Site)
#=================================================================================================================
@service_bp.route('/enrollment/mobile/<int:student_id>', methods=['GET'])
def mobile_get_service_enrollment(student_id):
    """
    Lightweight mobile API — returns flattened service enrollment info
    """
    from models.service_enrollment_model import Service_Enrollment
    from models.other_service_model import Other_Service

    # 1️⃣ Validate student
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify([]), 200  # Mobile expects empty list instead of 404

    # 2️⃣ Get active enrollments (or include status=0? Up to you)
    enrollments = Service_Enrollment.query.filter_by(student_id=student_id).all()

    result = []
    for e in enrollments:
        service = e.service  # Joined via relationship

        result.append({
            "service_enrollment_id": e.service_enrollment_id,
            "student_id": e.student_id,
            "service_id": e.service_id,
            "service_name": service.name,
            "description": service.description, 
            "service_type": service.service_type,
            "fee_type": service.fee_type,
            "deposit_fee": float(service.deposit_fee or 0),
            "fee_month": float(service.service_fee_per_month or 0),
            "fee_attend": float(service.service_fee_per_attend or 0),
            "enroll_datetime": e.enroll_datetime.strftime("%Y-%m-%d %H:%M:%S") 
                if e.enroll_datetime else None,
            "address": e.address or "",
            "status": e.status
        })

    return jsonify(result), 200

@service_bp.route('/enrollment/mobile/detail/<int:service_enrollment_id>', methods=['GET'])
def mobile_get_enrollment_detail(service_enrollment_id):
    """
    Mobile API:
    Return ONE service enrollment record by service_enrollment_id
    """
    from models.service_enrollment_model import Service_Enrollment

    enrollment = Service_Enrollment.query.filter_by(
        service_enrollment_id=service_enrollment_id
    ).first()

    if not enrollment:
        return jsonify({"error": "Enrollment not found"}), 404

    service = enrollment.service

    return jsonify({
        "service_enrollment_id": enrollment.service_enrollment_id,
        "student_id": enrollment.student_id,
        "service_id": enrollment.service_id,
        "service_name": service.name,
        "description": service.description,
        "service_type": service.service_type,
        "fee_type": enrollment.fee_type,
        "deposit_fee": float(service.deposit_fee or 0),
        "fee_month": float(service.service_fee_per_month or 0),
        "fee_attend": float(service.service_fee_per_attend or 0),
        "enroll_datetime": enrollment.enroll_datetime.strftime("%Y-%m-%d %H:%M:%S")
            if enrollment.enroll_datetime else None,
        "address": enrollment.address,
        "status": enrollment.status
    }), 200


@service_bp.route('/enrollment/update_address', methods=['POST'])
def update_address():
    data = request.get_json()
    service_enrollment_id = data.get("service_enrollment_id")
    address = data.get("address")

    # 1️⃣ Use the model's update function
    ok, msg = Service_Enrollment.update_address(service_enrollment_id, address)

    if not ok:
        return jsonify({"error": msg}), 404

    # 2️⃣ Retrieve updated enrollment to return latest info
    enroll = Service_Enrollment.query.filter_by(
        service_enrollment_id=service_enrollment_id
    ).first()

    service = enroll.service

    # 3️⃣ Return full detail structure (mobile expected format)
    return jsonify({
        "service_enrollment_id": enroll.service_enrollment_id,
        "student_id": enroll.student_id,
        "service_id": enroll.service_id,
        "service_name": service.name,
        "description": service.description, 
        "fee_type": service.fee_type,
        "service_type": service.service_type,
        "deposit_fee": float(service.deposit_fee or 0),
        "fee_month": float(service.service_fee_per_month or 0),
        "fee_attend": float(service.service_fee_per_attend or 0),
        "enroll_datetime": enroll.enroll_datetime.strftime("%Y-%m-%d %H:%M:%S"),
        "address": enroll.address,
        "status": enroll.status,
    }), 200

@service_bp.route('/enrollment/mobile/available', methods=['GET'])
def mobile_get_available_services():
    """
    Mobile API:
    Returns all services filtered by service_type + status,
    AND includes is_enrolled for the given student_id.
    Example:
        /service/available?student_id=5&service_type=2&status=1
    """

    student_id = request.args.get("student_id", type=int)
    service_type = request.args.get("service_type")

    # 🛑 Validate
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    if not service_type:
        return jsonify({"error": "service_type is required"}), 400

    # 1️⃣ Query base services
    query = Other_Service.query.filter_by(service_type=service_type, status="1")

    services = query.all()

    # 2️⃣ Get student's enrolled service IDs
    enrolled_rows = Service_Enrollment.get_enrolled_service(student_id)
    enrolled_ids = {row.service_id for row in enrolled_rows}  # convert to set for speed

    # 3️⃣ Build result
    result = []
    for s in services:
        result.append({
            "service_id": s.service_id,
            "name": s.name,
            "description": s.description,
            "service_type": s.service_type,
            "fee_type": s.fee_type,
            "deposit_fee": float(s.deposit_fee or 0),
            "fee_month": float(s.service_fee_per_month or 0),
            "fee_attend": float(s.service_fee_per_attend or 0),
            "status": s.status,

            # ⭐ YOU WANT THIS
            "is_enrolled": s.service_id in enrolled_ids
        })

    return jsonify(result), 200

@service_bp.route('/enrollment/mobile-create', methods=['POST'])
def mobile_create_service_enrollment():
    result = Payment.add_mobile_service_enrollment_payment(request.get_json())
    return jsonify(result)
