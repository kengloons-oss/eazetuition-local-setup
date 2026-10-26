from flask import Blueprint, json, render_template, request, redirect, url_for, jsonify
from flask_paginate import Pagination
from datetime import datetime

from middlewares.admin_required import admin_required, admin_api_required
from models.class_detail_model import Class_Detail
from models.class_enrollment_model import Class_Enrollment
from models.class_model import Class

import math

from models.discount_metrics_model import Discount_Metric
from models.education_lvl_model import Education_Lvl
from models.schedule_package_model import Package_Set_Detail, Schedule_Package, Schedule_Package_Set
from models.student_model import Student
from models.subject_model import Subject
from models.time_schedule_model import Time_Schedule
from models.tutor_model import Tutor
from helper import Helper


class_bp = Blueprint('class', __name__, url_prefix='/class')

#=================================================================================================================
# Class Control
#=================================================================================================================
@class_bp.route('/list')
@admin_required
def class_list():
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
    subject_name = request.args.get('search_subject_name')
    tutor_name = request.args.get('search_tutor_name')
    status = request.args.get('status')
    # day_of_week = request.args.get('day_of_week')
    class_type = request.args.get('class_type')
    sort = request.args.get('sort') or 'class_id'
    dir = request.args.get('dir') or 'asc'

    range_filters = {
        # 'max_capacity_min': request.args.get('max_capacity_min', type=int),
        # 'max_capacity_max': request.args.get('max_capacity_max', type=int),
        'min_time_per_week': request.args.get('time_per_week_min', type=int),
        'max_time_per_week': request.args.get('time_per_week_max', type=int),
    }

    if status is None:
        status = '1'

    # Filtered and sorted query
    query = Class.get_filtered(subject_name, tutor_name, status, class_type, range_filters, sort, dir)
    total = query.distinct(Class.class_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    classes = query.offset(offset).limit(per_page).all()

    for c in classes:
        c.class_type = Helper.format_class_type(c.class_type)


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
        href=f"?subject_name={subject_name or ''}&tutor_name={tutor_name or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'classes': classes,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'subject_name': subject_name,
        'tutor_name': tutor_name,
        'status': status,
        'title': 'Class | List',
        'page_count' : max_page,
        'current_count' : len(classes),
        'total_count' : total
    }

    fields = [
        {"name": "class_id", "label": "Class ID"},
        {"name": "subject.name", "label": "Name"},
        {"name": "tutor.name", "label": "Tutor"},
        {"name": "time_per_week", "label": "Time Per Week"},
        {"name": "class_type", "label": "Type"}
    ]

    #Header
    breadcrumbs = [
        ('Class', url_for('class.class_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/class/_class_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/class/class_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)


@class_bp.route('/add', methods=['GET', 'POST'])
@admin_required
def add_class():
    subjects = Subject.get_filtered(status=1, sort="education_level", dir="asc")
    tutors = Tutor.get_active_tutors()

    #header
    breadcrumbs = [
        ('Class', url_for('class.class_list')),
        ('Add', None)
    ]

    title = 'Class | Add'

    if request.method == 'POST':
        # Step 1: Basic form data
        data = {
            'subject_id': request.form.get('subject_id'),
            'tutor_id': request.form.get('tutor_id'),
            'class_type': request.form.get('class_type'),
            'time_per_week': request.form.get('time_per_week'),
            'duration': request.form.get('duration'),
            'is_open_for_schedule': '1' if request.form.get('is_open_for_schedule') == 'on' else '0',
            'status': '1'
        }

        # Auto schedule toggle
        auto_schedule = bool(request.form.get('schedule_mode'))

        try:
            class_time_pairs = []

            if not auto_schedule:
                # Step 2: Get arrays from form
                days = request.form.getlist('day_of_week_pair[]')
                starts = request.form.getlist('start_time_pair[]')
                ends = request.form.getlist('end_time_pair[]')

                for day, start, end in zip(days, starts, ends):
                    if not day or not start or not end:
                        return jsonify({'status':'error', 'title': 'Create Failed', 'message':'Incomplete time pair'})
                    class_time_pairs.append({
                        'day_of_week': day,
                        'start_time': start,
                        'end_time': end
                    })
            
                # Step 3: Check conflict
                for pair in class_time_pairs:
                    is_valid = Class.check_tutor_class_execute(
                        data['tutor_id'],
                        pair.get('day_of_week'),
                        pair.get('start_time'),
                        pair.get('end_time')
                    )
                    if not is_valid:
                        return jsonify({
                            'status': 'error',
                            'title': 'Create Failed',
                            'message': f"Time conflict detected for tutor on day {pair.get('day_of_week')}. Please choose another time.",
                        })
            else:
                # Auto schedule → create empty pairs based on time_per_week
                time_per_week = int(data.get('time_per_week', 0))
                for _ in range(time_per_week):
                    class_time_pairs.append({
                        'day_of_week': None,
                        'start_time': None,
                        'end_time': None
                    })


            # If no conflict, add to DB
            Class.add(data, class_time_pairs)

            return jsonify({
                'status': 'success',
                'title': 'Class Added',
                'message': 'The class has been successfully added. <br/> <small>*Remember to schedule class to package for student to register.</small>',
                'redirectUrl': '/class/list'
            })

        except Exception as e:
            print(f"Add Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Opps...',
                'message': 'Failed to add the class. Please try again.'
            })

    return render_template('/admin/class/add_class.html', subjects=subjects, tutors=tutors, breadcrumbs=breadcrumbs, title=title)


@class_bp.route('/detail/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_class(id):
    class_ = Class.get_by_id(id)
    packages = Class.get_related_packages(id)

    #header
    breadcrumbs = [
        ('Class', url_for('class.class_list')),
        ('Edit', None)
    ]

    title = 'Class | CL%04d' % class_.class_id

    #verify is the subject exist
    if class_ is None:
        # Redirect to list with alert details
        return redirect(url_for('class.class_list', 
            status='error',
            title='Class Not Found',
            message='The class you are trying to view does not exist.',
        ))
    
    for cd in class_.class_details:
        cd.start_time = Helper.format_time_12h(cd.start_time)
        cd.end_time = Helper.format_time_12h(cd.end_time)

    if request.method == 'POST':

        class_id = request.form.get('class_id')

        # Step 1: Basic form data
        class_type = request.form.get('class_type')
        is_open_for_schedule = '1' if request.form.get('is_open_for_schedule') in ['on', '1', True, 'true'] else '0'
        

        try:
            # Step 2: Get all details from form
            detail_ids = request.form.getlist('class_detail_id[]')
            days = request.form.getlist('day_of_week_pair[]')
            starts = request.form.getlist('start_time_pair[]')
            ends = request.form.getlist('end_time_pair[]')

            class_time_pairs = []

            # Step 3: Detect auto-schedule (if all pairs are blank)
            all_empty = all(
                (not d or not s or not e)
                for d, s, e in zip(days, starts, ends)
            )

            if not all_empty:
                # Step 4: Check conflict (excluding this class itself)
                for detail_id, day, start, end in zip(detail_ids, days, starts, ends):
                    if not day or not start or not end:
                        return jsonify({'status':'error', 'title': 'Update Failed', 'message':'Incomplete time pair'})

                    # Exclude this class + also skip its own pending changes
                    is_valid = Class.check_tutor_class_execute(
                        class_.tutor_id,
                        day,
                        start,
                        end,
                        exclude_class_id=detail_id
                    )

                    # Extra in-memory check:
                    # Avoid comparing this time with other details of the same class within this same edit
                    for temp_pair in class_time_pairs:
                        if temp_pair.get('day_of_week') == day:
                            try:
                                from datetime import datetime
                                start_time_obj = datetime.strptime(start, "%I:%M %p").time()
                                end_time_obj = datetime.strptime(end, "%I:%M %p").time()
                                other_start = datetime.strptime(temp_pair['start_time'], "%I:%M %p").time()
                                other_end = datetime.strptime(temp_pair['end_time'], "%I:%M %p").time()
                                if start_time_obj < other_end and end_time_obj > other_start:
                                    is_valid = False
                                    break
                            except Exception:
                                pass

                    if not is_valid:
                        return jsonify({
                            'status': 'error',
                            'title': 'Update Failed',
                            'message': f"Time conflict detected for tutor on day {day}. Please choose another time."
                        })

                    class_time_pairs.append({
                        'class_detail_id': detail_id,
                        'day_of_week': day,
                        'start_time': start,
                        'end_time': end
                    })

            else:
                # Auto schedule → create empty pairs based on time_per_week
                for detail_id in detail_ids:
                    class_time_pairs.append({
                        'class_detail_id': detail_id,
                        'day_of_week': None,
                        'start_time': None,
                        'end_time': None
                    })


            # Step 5: Perform batch update inside a transaction
            Class.update_batch(class_id, class_type, is_open_for_schedule, class_time_pairs)

            return jsonify({
                'status': 'success',
                'title': 'Class Updated',
                'message': 'The class has been successfully updated.',
                'redirectUrl': '/class/list'
            })

        except Exception as e:
            print(f"Add Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Opps...',
                'message': 'Failed to update the class. Please try again.'
            })

    return render_template('/admin/class/edit_class.html', class_=class_, packages=packages, breadcrumbs=breadcrumbs, title=title)


@class_bp.route('/deactivate/<int:id>', methods=['POST'])
@admin_required
def deactivate_class(id):
    result = Class.deactivate_class(id)
    
    if not result:
        return jsonify(success=False, error="Class not found")


    return jsonify(success=True)


@class_bp.route('/validate_class_time', methods=['POST'])
@admin_api_required
def validate_class_time():
    day_of_week = request.json.get('day_of_week')
    start_time = request.json.get('start_time')
    end_time = request.json.get('end_time')
    tutor_id = request.json.get('tutor_id')
    class_detail_id = request.json.get('class_detail_id')
    print(class_detail_id)

    result = Class.check_tutor_class_execute(tutor_id, day_of_week, start_time, end_time, class_detail_id)

    print(result)
    return jsonify({'valid': bool(result)})


def parse_time(param):
    time_str = request.args.get(param)
    if time_str:
        try:
            return datetime.strptime(time_str, '%H:%M').time()
        except ValueError:
            pass  # or log error if needed
    return None


#=================================================================================================================
# Class Enrollment Control
#=================================================================================================================
@class_bp.route('/enrollment/list')
@admin_required
def class_enrollment_list():
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
    class_id = request.args.get('search_class_id')
    subject_name = request.args.get('search_subject_name')
    status = request.args.get('status')
    intake_year = request.args.get('year')
    min_enroll_date = request.args.get('enrollment_date_min')
    max_enroll_date = request.args.get('enrollment_date_max')
    sort = request.args.get('sort') or 'enroll_datetime'
    dir = request.args.get('dir') or 'desc'

    if status is None:
        status = '1'

    # Filtered and sorted query
    query = Class_Enrollment.get_enrollment_filtered(
        student_name_email=student_name_email,
        class_id=class_id,
        subject_name=subject_name,
        status=status,
        intake_year=intake_year,
        min_enroll_date=min_enroll_date,
        max_enroll_date=max_enroll_date,
        sort=sort,
        dir=dir
    )

    total = query.distinct(Class_Enrollment.student_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    enrollments = query.offset(offset).limit(per_page).all()
    print([e.class_enrollment_id for e in enrollments])


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
        href=f"?student_name_email={student_name_email or ''}&subject_name={subject_name or ''}&class_id={class_id or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
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
        'subject_name': subject_name,
        'class_id': class_id,
        'status': status,
        'title': 'Class Enrollment | List',
        'page_count' : max_page,
        'current_count' : len(enrollments),
        'total_count' : total
    }

    fields = [
        {"name": "subject_name", "label": "Subject"},
        {"name": "class_time", "label": "Class Time"},
        {"name": "intake_year", "label": "Intake Year"},
        {"name": "student_name", "label": "Student"},
        {"name": "enroll_datetime", "label": "Enroll Date"}
    ]

    #Header
    breadcrumbs = [
        ('Class Enrollment', url_for('class.class_enrollment_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/class/_enrollment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/class/enrollment_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

@class_bp.route('/enrollment/deactivate/<int:id>', methods=['POST'])
@admin_required
def deactivate_class_enrollment(id):
    result = Class_Enrollment.deactivate_class_enrollment(id)
    
    if not result:
        return jsonify(success=False, error="Enrollment not found")


    return jsonify(success=True)

@class_bp.route('/enrollment/add', methods=['GET', 'POST'])
@admin_required
def add_class_enrollment():
    edu_lvls = Education_Lvl.get_active_lvl()
    current_year = datetime.now().year

    breadcrumbs = [
        ('Class ', url_for('class.class_list')),
        ('Enrollment', url_for('class.class_enrollment_list')),
        ('Add', None)
    ]

    title = 'Class Enrollment | Add'

    if request.method == 'POST':
        data = request.get_json()

        edu_lvl_id = data.get('edu_lvl_id')
        intake_year = data.get('intake_year')
        student_id = data.get('student_id')
        class_pairs = data.get('class_pairs', [])

        if not class_pairs:
            return jsonify({
                'status': 'error',
                'title': 'No Classes Selected',
                'message': 'Please select at least one class.'
            })

        class_ids = [str(pair['class_id']) for pair in class_pairs if 'class_id' in pair]

        # 🔎 Duplicate check
        existing_enrollments = Class_Enrollment.get_student_enrolled_classes(student_id)
        existing_class_ids = {str(e.class_detail_id) for e in existing_enrollments}
        duplicate_classes = [cid for cid in class_ids if cid in existing_class_ids]

        if duplicate_classes:
            return jsonify({
                'status': 'error',
                'title': 'Duplicate Enrollment',
                'message': f'The student is already enrolled in class(es): {', '.join(duplicate_classes)}'
            })

        # 🔎 Validate package + class
        pairs_list = [(pair['class_id'], pair['set_id']) for pair in class_pairs]
        invalid_pairs = Class_Enrollment.validate_package_and_class(pairs_list, edu_lvl_id, intake_year)

        if invalid_pairs:
            return jsonify({
                'status': 'error',
                'title': 'Invalid Selection',
                'message': 'Some selected class/package set combinations are invalid:<br>' +
                           '<br>'.join(invalid_pairs)
            })

        # ✅ Passed all validation
        insert_data = {
            'student_id': student_id,
            'status': '1',
            'class_pairs': pairs_list
        }

        try:
            success, result_data = Class_Enrollment.add(insert_data)

            if not success:
                return jsonify({
                    'status': 'error',
                    'title': 'Database Error',
                    'message': 'Failed to add class enrollments. Please try again.'
                })

            # ✅ Send email if parent email exists
            from flask_mail import Message
            from app import mail, app
            import threading

            def send_async_email(app, msg):
                with app.app_context():
                    mail.send(msg)

            parent_email = result_data.get('parent_email')
            if parent_email:
                parent_name = result_data.get('parent_name', 'Parent')
                student_name = result_data.get('student_name', 'Student')

                classes_html = "".join(
                    f"<li>{d['class_name']} — RM {d['class_fee']:.2f}</li>"
                    for d in result_data.get('payment_details', [])
                )

                msg = Message(
                    subject=f"[EazeTuition] New Class Enrollment for {student_name}",
                    recipients=[parent_email],
                    html=f"""
                    <p>Dear {parent_name},</p>
                    <p>A new class enrollment has been created for <strong>{student_name}</strong>:</p>
                    <ul>{classes_html}</ul>
                    <p><strong>Total Fee:</strong> RM {result_data.get('total_fee', 0.00):.2f}</p>
                    <p>Status: <strong>Pending</strong></p>
                    <p>Thank you,<br/>EazeTuition Team</p>
                    """
                )

                # Send async to avoid blocking response
                threading.Thread(target=send_async_email, args=(app, msg)).start()

            return jsonify({
                'status': 'success',
                'title': 'Class Enrollment Added',
                'message': 'The class enrollment has been successfully added.',
                'redirectUrl': '/class/enrollment/list'
            })

        except Exception as e:
            print(f"Add Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Oops...',
                'message': 'Failed to add the class enrollment. Please try again.'
            })


    return render_template(
        '/admin/class/add_enrollment.html',
        edu_lvls=edu_lvls,
        current_year=current_year,
        breadcrumbs=breadcrumbs,
        title=title
    )

@class_bp.route('/students/<int:edu_lvl_id>', methods=['GET'])
@admin_api_required
def get_students_by_edu_level(edu_lvl_id):

    students = Student.get_by_edu_lvl_id(edu_lvl_id)
    
    students_list = [{
        'student_id': s.student_id,
        'name': s.user.name
    } for s in students]

    return jsonify({'students': students_list})

@class_bp.route('/available_classes/<int:student_id>', methods=['GET'])
@admin_api_required
def get_available_classes(student_id):
    intake_year = request.args.get('intake_year', type=str)
    package_name = request.args.get('package_name', type=str)

    # 1️⃣ Find the student
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    edu_lvl_id = student.edu_lvl_id

    # 2: Filter packages by education level and year
    packages = Schedule_Package.get_package_for_enrollment(edu_lvl_id, intake_year, package_name)

    package_ids = [p.package_id for p in packages]
    if not package_ids:
        return jsonify({'class_details': []})

    # 3: Find all sets belonging to these packages
    sets = Schedule_Package_Set.get_by_package_ids(package_ids)
    set_ids = [s.set_id for s in sets]

    # 4: Find all classes the student already enrolled in (status = '1')
    enrolled_pairs = Class_Enrollment.get_student_enrolled_classes(student_id)
    enrolled_set = {(e.class_detail_id, e.set_id) for e in enrolled_pairs}

    # 5: Get all class details from package_set_detail
    details = Package_Set_Detail.get_class_detail_by_set_ids(set_ids)

    # 6️⃣ Count enrollments grouped by class_detail_id + set_id
    enrollment_counts = Class_Enrollment.get_enrollment_count_class_detail_set(set_ids)

    # 7️⃣ Build class list efficiently
    class_details_list = []
    for d in details:
        class_detail = d.class_detail
        set_id = d.set_id
        class_detail_id = class_detail.class_detail_id

        # Skip already enrolled
        if (class_detail_id, set_id) in enrolled_set:
            continue

        # Count current enrollments
        current_enrollments = enrollment_counts.get((class_detail_id, set_id), 0)
        max_capacity = d.max_capacity or 0
        is_full = current_enrollments >= max_capacity

        # Package name lookup
        package_name = d.package_set.package.name

        # Readable combined detail
        combined_detail = (
            f"{class_detail.class_.subject.name} ({class_detail.class_.tutor.user.name}) | "
            f"{Helper.format_day_of_week(class_detail.day_of_week)} "
            f"{Helper.format_time_12h(class_detail.start_time)}-{Helper.format_time_12h(class_detail.end_time)} | "
            f"{package_name}"
        )
        if is_full:
            combined_detail += " (Full)"

        class_details_list.append({
            'class_detail_id': class_detail_id,
            'subject_name': class_detail.class_.subject.name,
            'day_of_week': class_detail.day_of_week,
            'start_time': str(class_detail.start_time),
            'end_time': str(class_detail.end_time),
            'package_name': package_name,
            'package_set_id': set_id,
            'max_capacity': max_capacity,
            'current_enrollments': current_enrollments,
            'is_full': is_full,
            'detail': combined_detail
        })

    return jsonify({'class_details': class_details_list})


#=================================================================================================================
# Class Session (Time Schedule) Control
#=================================================================================================================
@class_bp.route('/session/list', methods=['GET', 'POST'])
@admin_required
def class_session_list():
    edu_lvls = Education_Lvl.get_active_lvl()
    breadcrumbs = [
        ('Class ', url_for('class.class_list')),
        ('Session', url_for('class.class_session_list')),
        ('Calendar', None)
    ]

    title = 'Class Session | Calander'
    
    show_calendar = False

    return render_template(
        '/admin/class/class_session_list.html',
        edu_lvls=edu_lvls,
        show_calendar=show_calendar,
        breadcrumbs=breadcrumbs,
        title=title
    )

@class_bp.route('/session/replacement', methods=['GET', 'POST'])
@admin_required
def class_session_replacement():
    edu_lvls = Education_Lvl.get_active_lvl()

    breadcrumbs = [
        ('Class ', url_for('class.class_list')),
        ('Session', url_for('class.class_session_list')),
        ('Add Replacement', None)
    ]

    title = 'Class Session | Add Replacement'
    
    return render_template(
        '/admin/class/add_replacement_class.html',
        edu_lvls=edu_lvls,
        breadcrumbs=breadcrumbs,
        title=title
    )


@class_bp.route('/session/cancel', methods=['POST'])
@admin_required
def cancel_class_session():
    schedule_id = request.args.get('id', type=int)
    if not schedule_id:
        return jsonify({"success": False, "message": "Invalid session ID."})

    # Fetch the schedule
    ts = Time_Schedule.get_active_by_id(schedule_id)
    if not ts:
        return jsonify({"success": False, "message": "Class session not found or already canceled."})

    # Check if start_datetime is in the future
    now = datetime.now()
    if ts.start_datetime <= now:
        return jsonify({"success": False, "message": "Cannot cancel a class session that has already started or passed."})

    try:
        Time_Schedule.cancel_session(schedule_id)
        return jsonify({"success": True, "message": f"Class session CS{schedule_id:04d} canceled successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error canceling class session: {str(e)}"})



# ===========================================
# AJAX route: Get subject by education level
# ===========================================
@class_bp.route('/get_subjects/<int:edu_lvl_id>')
@admin_api_required
def get_subjects_by_lvl(edu_lvl_id):
    from models.subject_model import Subject

    subjects = Subject.query.filter_by(edu_lvl_id=edu_lvl_id, status='1').all()

    # Convert to serializable dict
    subject_list = [
        {
            'subject_id': s.subject_id,
            'name': s.name
        }
        for s in subjects
    ]

    return jsonify({'subjects': subject_list})

# ===========================================
# AJAX route: Get class sessions by subject
# ===========================================
@class_bp.route('/get_class_sessions/<int:subject_id>')
@admin_api_required
def get_class_sessions(subject_id):
    sessions = Time_Schedule.get_unreplaced_sessions_by_subject(subject_id)
    return jsonify({'sessions': sessions})



@class_bp.route('/session/replacement/submit', methods=['POST'])
@admin_api_required
def submit_replacement():
    data = request.form
    try:
        edu_lvl_id = data.get('edu_lvl_id')
        subject_id = data.get('subject_id')
        time_schedule_key = json.loads(data.get('time_schedule_key'))

        # Parse ISO datetime sent from JS
        start_dt = datetime.strptime(data.get('replacement_start_iso'), "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(data.get('replacement_end_iso'), "%Y-%m-%d %H:%M:%S")

        # --- Call model method to handle DB insert ---
        result = Time_Schedule.check_and_add(
            edu_lvl_id, subject_id, time_schedule_key, start_dt, end_dt
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ===========================================
# AJAX route: Get packages by education level
# ===========================================
@class_bp.route('/session/get_packages/<int:edu_lvl_id>')
@admin_api_required
def get_packages_by_edu_lvl(edu_lvl_id):
    packages = Schedule_Package.get_package_by_edu_lvl(edu_lvl_id)

    result = [
        {"package_id": p.package_id, "name": f"{p.name} | Intake {p.year}"}
        for p in packages
    ]
    return jsonify(result)


# ===========================================
# AJAX route: Get package sets by package_id
# ===========================================
@class_bp.route('/session/get_sets/<int:package_id>')
@admin_api_required
def get_sets_by_package(package_id):
    sets = Schedule_Package_Set.get_by_package_id(package_id)
    result = [{"set_id": s.set_id, "name": s.name} for s in sets]
    return jsonify(result)


# ===========================================
# AJAX route: Get tutor list by set_id
# ===========================================
@class_bp.route('/session/get_tutors/<int:set_id>')
@admin_api_required
def get_tutors_by_set(set_id):
    tutors = Schedule_Package_Set.get_tutors_in_set(set_id)
    result = [{"tutor_id": t.tutor_id, "name": t.name} for t in tutors]
    return jsonify(result)


# ===========================================
# AJAX route: Load class calendar partial (HTML)
# ===========================================
@class_bp.route('/session/load_calendar')
@admin_required
def get_class_session_calendar():
    """
    Loads the calendar partial view.
    Supports optional filtering by tutor.
    """
    set_id = request.args.get('set_id', type=int)
    tutor_id = request.args.get('tutor_id', type=int)

    if not set_id:
        # If set not selected, show placeholder message
        return render_template('/admin/class/_class_session_list.html', show_calendar=False)

    # Fetch relevant time schedules
    if tutor_id:
        rows = Time_Schedule.get_by_set_and_tutor(set_id, tutor_id)
    else:
        rows = Time_Schedule.get_by_set(set_id)

    # Convert to TUI calendar event format
    events = []
    for r in rows:
        start_iso = r.start_datetime.isoformat() if r.start_datetime else None
        end_iso = r.end_datetime.isoformat() if r.end_datetime else None
        title_parts = []
        if r.subject_name:
            title_parts.append(r.subject_name)
        if r.room_name:
            title_parts.append(f"@ {r.room_name}")
        title = " ".join(title_parts).strip() or "Class"
        

        events.append({
            "id": r.schedule_id,
            "calendarId": r.ts_status,
            "title": title or "Class",
            "start": start_iso,
            "end": end_iso,
            "category": "time",
            "state": None,
            "location" : r.room_name,
            "attendees" : [r.tutor_name],
            "body": "xxx",
            "raw": {
                "status": Helper.format_class_session_status(r.ts_status) or 'N/A',
                "class_type": Helper.format_class_type(r.class_type) or 'N/A',
                "type": Helper.format_class_session_type(r.type) or 'N/A',
            }
        })


    # Render calendar partial
    return render_template(
        '/admin/class/_class_session_list.html',
        show_calendar=True,
        tutor_id=tutor_id,
        events_json=json.dumps(events)
    )    


#=================================================================================================================
# Class Session (Time Schedule) Mobile Control
#=================================================================================================================
@class_bp.route("/schedule/student/<int:student_id>", methods=["GET"])
def get_student_schedule(student_id):
    try:
        current_year = datetime.now().year
        next_year = current_year + 1

        from models.time_schedule_model import Time_Schedule

        # 取得学生的所有时间表（含班级、导师、科目、教室信息）
        schedules = Time_Schedule.get_timetable_by_student(student_id, [current_year, next_year])

        # 序列化为 JSON 格式
        result = [Time_Schedule.serialize_for_mobile(s, student_id) for s in schedules]

        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error fetching timetable for student {student_id}: {e}")
        return jsonify({"error": "Failed to fetch timetable"}), 500
    
@class_bp.route('/enrollment/mobile-create', methods=['POST'])
def mobile_create_enrollment():
    """
    Mobile enrollment: validate → create pending payment only.
    Actual enrollment happens ONLY after Stripe webhook confirms payment.
    """
    try:
        data = request.get_json()

        student_id = data.get("student_id")
        edu_lvl_id = data.get("edu_lvl_id")
        intake_year = data.get("intake_year")
        class_pairs = data.get("class_pairs", [])

        if not student_id or not class_pairs:
            return jsonify({
                "status": "error",
                "message": "Missing student_id or class_pairs."
            }), 400

        # ---------------------------------------------------------
        # 1️⃣ 补上 duplicate check（避免重复 enroll）
        # ---------------------------------------------------------
        existing = Class_Enrollment.get_student_enrolled_classes(student_id)
        existing_ids = {e.class_detail_id for e in existing}

        duplicates = [p["class_detail_id"] for p in class_pairs if p["class_detail_id"] in existing_ids]
        if duplicates:
            return jsonify({
                "status": "error",
                "message": f"Student already enrolled in classes: {duplicates}"
            }), 400

        # ---------------------------------------------------------
        # 2️⃣ 验证 package + class 组合是否有效
        # ---------------------------------------------------------
        pairs_list = [(p["class_detail_id"], p["set_id"]) for p in class_pairs]
        invalid = Class_Enrollment.validate_package_and_class(
            pairs_list, edu_lvl_id, intake_year
        )
        if invalid:
            return jsonify({
                "status": "error",
                "message": "Invalid class/set combination.",
                "details": invalid
            }), 400

        # ---------------------------------------------------------
        # 3️⃣ 检查 capacity 是否已满
        # ---------------------------------------------------------
        from models.schedule_package_model import Package_Set_Detail
        enrollment_counts = Class_Enrollment.get_enrollment_count_class_detail_set(
            [p["set_id"] for p in class_pairs]
        )

        for c in class_pairs:
            detail = Package_Set_Detail.get_by_class_and_set(
                c["class_detail_id"], c["set_id"]
            )
            if not detail:
                return jsonify({"status": "error", "message": "Invalid set/class."})

            count = enrollment_counts.get((c["class_detail_id"], c["set_id"]), 0)
            if count >= detail.max_capacity:
                return jsonify({
                    "status": "error",
                    "message": f"Class {c['class_detail_id']} is already full."
                }), 400

        # ---------------------------------------------------------
        # 4️⃣ Fee calculation
        # ---------------------------------------------------------
        total_fee = 0
        payment_details = []

        for cd, sid in pairs_list:
            class_detail = Class_Detail.get_class_detail(cd)
            if not class_detail:
                return jsonify({"error": f"Invalid class_detail_id: {cd}"}), 400
            cls = class_detail.class_
            subj = cls.subject

            if cls.class_type == "F":
                fee = float(subj.focus_class_fee)
            else:
                fee = float(subj.normal_class_fee)

            fee += float(subj.material_fee or 0)

            total_fee += fee

            payment_details.append({
                "class_name": subj.name,
                "class_fee": fee,
                "class_detail_id": cd,
                "set_id": sid,
            })
        
        # Calculate discount
        class_count = len(payment_details)

        discount_record = (
            Discount_Metric.query
            .filter(Discount_Metric.num_of_enrolment <= class_count)
            .order_by(Discount_Metric.num_of_enrolment.desc())
            .first()
        )

        discount_amt = float(discount_record.discount_amt) if discount_record else 0.0
        final_amt = max(0, total_fee - discount_amt)

        # ---------------------------------------------------------
        # 5️⃣ Create Payment (status=0)
        # ---------------------------------------------------------
        from models.payment_model import Payment, Payment_Detail
        from models import db

        new_payment = Payment(
            student_id=student_id,
            discount_amt=discount_amt,
            final_amt=round(final_amt, 2),
            received_amt=0,
            change_amt=0,
            payment_method=None,
            payment_status='0',
            created_datetime=datetime.utcnow(),
            payment_type='enrollment'
        )
        db.session.add(new_payment)
        db.session.flush()  # get new payment_id

        for d in payment_details:
            db.session.add(Payment_Detail(
                payment_id=new_payment.payment_id,
                class_name=d["class_name"],
                class_fee=d["class_fee"],
                fee_type="1",
                class_detail_id=d["class_detail_id"],
                set_id=d["set_id"],
            ))


        db.session.commit()

        # ---------------------------------------------------------
        # 回传 payment_id 给前端 → 下一步 stripe
        # ---------------------------------------------------------
        return jsonify({
            "status": "success",
            "payment_id": new_payment.payment_id,
            "amount": new_payment.final_amt
        })

    except Exception as e:
        print("❌ Mobile Enrollment Error:", e)
        return jsonify({
            "status": "error",
            "message": "Unexpected error."
        }), 500
    

@class_bp.route("/schedule/tutor/<int:tutor_id>", methods=["GET"])
def get_tutor_schedule(tutor_id):
    """
    返回指定导师的课表（当前年与下一年）
    供移动端 local sync 使用。
    """
    try:
        current_year = datetime.now().year
        next_year = current_year + 1

        from models.time_schedule_model import Time_Schedule
        from models.class_model import Class
        from models.class_detail_model import Class_Detail
        from models.subject_model import Subject
        from models.schedule_package_model import Schedule_Package_Set

        # Query tutor schedules
        schedules = Time_Schedule.get_timetable_by_tutor(tutor_id, [current_year, next_year])

        # Serialize for mobile
        result = [Time_Schedule.serialize_for_mobile(s, tutor_id) for s in schedules]

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error fetching tutor timetable for {tutor_id}: {e}")
        return jsonify({"error": "Failed to fetch tutor timetable"}), 500


@class_bp.route('/discount/metrics', methods=['GET'])
def get_discount_metrics():
    metrics = Discount_Metric.query.order_by(Discount_Metric.num_of_enrolment.asc()).all()
    return jsonify([
        {
            "num_of_enrolment": d.num_of_enrolment,
            "discount_amt": float(d.discount_amt)
        }
        for d in metrics
    ]), 200
