import copy
import hashlib
import hmac
import math
import threading
from flask import Blueprint, current_app, json, render_template, request, redirect, url_for, jsonify
from flask_paginate import Pagination
from datetime import datetime, time, timedelta
from sqlalchemy.orm import joinedload

from helper import Helper

from models.class_detail_model import Class_Detail
from models.class_enrollment_model import Class_Enrollment
from models.education_lvl_model import Education_Lvl
from models.schedule_package_model import Package_Set_Detail, Schedule_Package, Schedule_Package_Set
from models.subject_model import Subject
from models.time_schedule_model import Room, Time_Schedule
from models.tutor_model import Tutor
from middlewares.admin_required import admin_required, admin_api_required
from utils.choose_best_class import choose_best_class_for_subject



schedule_package_bp = Blueprint('schedule_package', __name__, url_prefix='/schedule_package')

@schedule_package_bp.route('/list')
@admin_required
def schedule_package_list():
    edu_lvls = Education_Lvl.get_active_lvl()

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
    package_name = request.args.get('search_package_name')
    tutor_name = request.args.get('search_tutor_name')
    status = request.args.get('status')
    education_level = request.args.get('edu_lvl')
    intake_year = request.args.get('year')
    min_subject = request.args.get('num_of_subject_min', type=int)
    max_subject = request.args.get('num_of_subject_max', type=int)
    sort = request.args.get('sort') or 'package_id'
    dir = request.args.get('dir') or 'desc'

    if status is None:
        status = '1'

    # Filtered and sorted query
    query = Schedule_Package.get_filtered(
        package_name=package_name,
        tutor_name=tutor_name,
        status=status,
        education_level=education_level,
        intake_year=intake_year,
        min_subject=min_subject,
        max_subject=max_subject,
        sort=sort,
        dir=dir
    )
        
    total = query.distinct(Schedule_Package.package_id).count()


    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    packages = query.offset(offset).limit(per_page).all()


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
        href=f"?package_name={package_name or ''}&tutor_name={tutor_name or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'packages': packages,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'package_name': package_name,
        'tutor_name': tutor_name,
        'status': status,
        'title': 'Schedule Package | List',
        'page_count' : max_page,
        'current_count' : len(packages),
        'total_count' : total
    }

    fields = [
        {"name": "package_id", "label": "Package ID"},
        {"name": "name", "label": "Name"},
        {"name": "intake_year", "label": "Intake Year"},
        {"name": "num_of_subject", "label": "No. of Subject"},
        {"name": "num_of_student_enroll", "label": "No. of Student Enroll"}
    ]

    #Header
    breadcrumbs = [
        ('Schedule Package', url_for('schedule_package.schedule_package_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/schedule_package/_package_list.html', **data, edu_lvls=edu_lvls, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/schedule_package/package_list.html', **data, edu_lvls=edu_lvls, fields=fields, breadcrumbs=breadcrumbs)



@schedule_package_bp.route('/add', methods=['GET'])
@admin_required
def add_schedule_package():
    edu_lvls = Education_Lvl.get_active_lvl()

    #header
    breadcrumbs = [
        ('Schedule Package', url_for('schedule_package.schedule_package_list')),
        ('Add', None)
    ]

    title = 'Schedule Package | Add'

    return render_template('/admin/schedule_package/add_package.html', edu_lvls=edu_lvls, breadcrumbs=breadcrumbs, title=title)


@schedule_package_bp.route('/add', methods=['POST'])
@admin_required
def add_schedule_package_post():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON data'}), 400

    name = data.get('name')
    edu_lvl_id = data.get('edu_lvl_id')
    intake_year = data.get('intake_year')
    is_open = data.get('is_open_for_enrollment', False)
    selected_packages = data.get('selected_packages', [])

    # =======================================
    # Step 1: Signature Verification (exclude AI fields)
    # =======================================
    for pkg in selected_packages:
        signature = pkg.get("signature")
        if not signature:
            return jsonify({
                "status": "error",
                "title": "Invalid Data",
                "message": f"Missing signature for package '{pkg.get('package_name')}'."
            }), 400

        # Create a copy without signature AND AI fields for verification
        pkg_copy = dict(pkg)
        pkg_copy.pop("signature", None)
        pkg_copy.pop("ai_score", None)
        pkg_copy.pop("ai_recommended", None)
        pkg_copy.pop("ai_reason", None)
        pkg_copy.pop("reason", None)
        pkg_copy.pop("_details", None)
        pkg_copy.pop("_synergy", None)
        pkg_copy.pop("_study_hours", None)


        # Recalculate expected HMAC
        pkg_copy_normalized = stable_json(pkg_copy)
        expected_sig = hmac.new(
            current_app.secret_key.encode(),
            json.dumps(pkg_copy_normalized, sort_keys=True).encode(),
            hashlib.sha256
        ).hexdigest()

        # Compare securely
        if not hmac.compare_digest(signature, expected_sig):
            return jsonify({
                "status": "error",
                "title": "Signature Verification Failed",
                "message": f"Package '{pkg.get('package_name')}' has been modified or corrupted."
            }), 400

    print("All package signatures verified successfully!")

    try:
        new_package = Schedule_Package.create_with_sets(
            name=name,
            edu_lvl_id=edu_lvl_id,
            intake_year=intake_year,
            is_open=is_open,
            selected_packages=selected_packages
        )

        # ✅ Step 3: Start background scheduling
        app = current_app._get_current_object()
        thread = threading.Thread(
            target=generate_yearly_schedule_background,
            args=(app, new_package.package_id, intake_year),
            daemon=True
        )
        thread.start()

        return jsonify({
            "status": "success",
            "message": f"Package '{new_package.name}' inserted successfully!",
            "package_id": new_package.package_id
        }), 200
    except Exception as e:
        print("❌ Error inserting schedule package:", e)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@schedule_package_bp.route('/detail/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_schedule_package(id):
    package = Schedule_Package.get_full_package_by_id(id)

    #header
    breadcrumbs = [
        ('Schedule Package', url_for('schedule_package.schedule_package_list')),
        ('Edit', None)
    ]

    title = 'Schedule Package | SP%04d' % package.package_id

    if request.method == 'POST':
        try:
            if request.is_json:
                data = request.get_json()
                package_id = data.get('package_id')
                is_open_for_enrollment = '1' if str(data.get('is_open_for_enrollment')) in ['1', 'true', 'True', 'on'] else '0'
            else:
                package_id = request.form.get('package_id')
                is_open_for_enrollment = '1' if request.form.get('is_open_for_enrollment') in ['on', '1', True, 'true'] else '0'

            result = Schedule_Package.update(package_id, is_open_for_enrollment)

            if result:
                return jsonify({
                    'status': 'success',
                    'title': 'Package Updated',
                    'message': 'The package has been successfully updated.',
                    'redirectUrl': '/schedule_package/list'
                })
            else:
                return jsonify({
                    'status': 'error',
                    'title': 'Oops...',
                    'message': 'No package found or failed to update the package. Please try again.'
                })

        except Exception as e:
            print(f"Update Error: {e}")
            return jsonify({
                'status': 'error',
                'title': 'Oops...',
                'message': 'Failed to update the package. Please try again.'
            })


    return render_template('/admin/schedule_package/edit_package.html', package=package, breadcrumbs=breadcrumbs, title=title, enumerate=enumerate)


@schedule_package_bp.route('/deactivate/<int:id>', methods=['POST'])
@admin_required
def deactivate_package(id):
    result = Schedule_Package.deactivate_package(id)
    
    if not result:
        return jsonify(success=False, error="Package not found")


    return jsonify(success=True)

# ===========================================================================================================
# Generate Package Handle
# ===========================================================================================================
@schedule_package_bp.route('/generate', methods=['POST'])
@admin_api_required
def generate_schedule_packages():
    # Get data
    data = request.get_json()
    edu_lvl_id = data.get('edu_lvl_id')
    subject_ids = data.get('subject_ids', [])
    intake_year = data.get('intake_year')
    package_count = int(data.get('num_of_package', 1))
    time_window = data.get('time_window')  # 'M' / 'A' / 'F'

    # Step 1: get available class details（assigned/unassigned）
    class_details = Class_Detail.get_available_details(subject_ids, edu_lvl_id, intake_year, time_window)
    assigned_class_details = class_details['assigned']
    unassigned_class_details = class_details['unassigned']

    print("Assigned class details:")
    for cd in assigned_class_details:
        subject_id = getattr(getattr(cd, "class_", None), "subject_id", None)
        tutor_id = getattr(getattr(cd, "class_", None), "tutor_id", None)
        print(f"  class_detail_id={cd.class_detail_id}, subject_id={subject_id}, day={cd.day_of_week}, start={cd.start_time}, end={cd.end_time}, tutor={tutor_id}")

    print("Unassigned class details:")
    for cd in unassigned_class_details:
        subject_id = getattr(getattr(cd, "class_", None), "subject_id", None)
        tutor_id = getattr(getattr(cd, "class_", None), "tutor_id", None)
        print(f"  class_detail_id={cd.class_detail_id}, subject_id={subject_id}, day={cd.day_of_week}, start={cd.start_time}, end={cd.end_time}, tutor={tutor_id}")

    # Step 2: declare package
    packages = []
    raw_packages = []  # 这里先占位，真正要用的是后面 deepcopy 的那一份
    for i in range(package_count):
        pkg = {
            "package_name": f"Set_{i + 1}",
            "subjects": {int(sid): [] for sid in subject_ids},
            "occupied_slots": []
        }
        packages.append(pkg)
        raw_packages.append(copy.deepcopy(pkg))  # 这一版之后会被覆盖掉

    # Step 3: Sort the assigned class detail
    assigned_class_details.sort(key=lambda c: (int(c.day_of_week), c.start_time))

    # Step 4: Assign assigned's class detail first
    for cd in assigned_class_details:
        placed = False
        for pkg in packages:

            # Tutor conflict check (within current packages)
            if has_conflict(pkg['occupied_slots'], cd):
                continue

            available_rooms = Schedule_Package.get_available_rooms(cd, intake_year)

            for room_id in available_rooms:
                # Check room conflict across occupied slots
                if any(
                    occ['room_id'] == room_id
                    and occ['day_of_week'] == cd.day_of_week
                    and not is_time_non_overlap(occ, cd)
                    for p in packages for occ in p['occupied_slots']
                ):
                    print(f"Room {room_id} conflicts, trying next room")
                    continue

                if not has_conflict(pkg['occupied_slots'], cd):
                    subj_id = int(cd.class_.subject_id)
                    pkg["subjects"][subj_id].append({
                        "class_detail_id": cd.class_detail_id,
                        "day_of_week": cd.day_of_week,
                        "start_time": cd.start_time.strftime("%H:%M"),
                        "end_time": cd.end_time.strftime("%H:%M"),
                        "tutor_id": cd.class_.tutor_id,
                        "tutor_name": cd.class_.tutor.user.name if cd.class_.tutor and cd.class_.tutor.user else None,
                        "subject_id": subj_id,
                        "subject_name": cd.class_.subject.name if cd.class_.subject else None,
                        "room_id": room_id,
                        "room_name": Room.query.get(room_id).name if room_id else None
                    })

                    mark_occupied(pkg["occupied_slots"], cd, room_id)
                    placed = True
                    break

            if placed:
                break

        if not placed:
            print(f"⚠️ Class detail {cd.class_detail_id} could not be placed (conflict detected)")

    # 🆕 Step 5: Assign unassigned class details (auto-generate suitable time)
    for cd in unassigned_class_details:
        placed = False
        subj_id = getattr(getattr(cd, "class_", None), "subject_id", None)

        if subj_id is None:
            print(f"⚠️ Skipping class_detail {cd.class_detail_id} because subject_id is missing (possibly broken relation)")
            continue  # Skip to next class_detail

        # 1️⃣ Split packages into two lists:
        #    a) packages that do not have this subject yet
        #    b) packages that already have this subject
        packages_without_subject = [p for p in packages if len(p["subjects"][subj_id]) == 0]
        packages_with_subject = [p for p in packages if len(p["subjects"][subj_id]) > 0]

        # 🔁 对已经有这个 subject 的 package，按「该 subject 的总 room capacity」从小到大排序
        packages_with_subject.sort(
            key=lambda p: get_subject_total_capacity_for_pkg(p, int(subj_id))
        )

        # 2️⃣ 先填还没有这个 subject 的 package，再填已有 subject 但容量较小的 package
        for pkg_list in [packages_without_subject, packages_with_subject]:
            for pkg in pkg_list:
                if try_assign_to_package(cd, pkg, packages, intake_year, time_window):
                    placed = True
                    break
            if placed:
                break

        if not placed:
            print(f"⚠️ Could not assign time for class_detail {cd.class_detail_id}")
    
    # Step 5.5: Validate that each package has at least one class detail per subject
    incomplete_packages = []

    for pkg in packages:
        missing_subjects = [sid for sid, cds in pkg["subjects"].items() if len(cds) == 0]
        if missing_subjects:
            incomplete_packages.append({
                "package_name": pkg["package_name"],
                "missing_subjects": missing_subjects
            })

    # Optional: Log or handle these cases
    if incomplete_packages:
        print("⚠️ Some packages are missing class details for these subjects:")
        for p in incomplete_packages:
            print(f" - {p['package_name']}: {p['missing_subjects']}")

    # Step 5.6: Handle leftover class_details (assigned + unassigned)
    leftover_class_details = [
        cd for cd in assigned_class_details + unassigned_class_details
        if not any(
            cd.class_detail_id in [c['class_detail_id'] for c in pkg["subjects"][cd.class_.subject_id]]
            for pkg in packages
        )
    ]

    for cd in leftover_class_details:
        placed = False
        subj_id = int(cd.class_.subject_id)

        # 1️⃣ Prioritize incomplete packages for this subject
        incomplete_packages_for_subject = [
            pkg for pkg in packages if len(pkg["subjects"][subj_id]) == 0
        ]

        if incomplete_packages_for_subject:
            candidate_packages = incomplete_packages_for_subject
        else:
            # 2️⃣ All packages already have this subject → 按该 subject 的总 room capacity 排序
            candidate_packages = sorted(
                packages,
                key=lambda p: get_subject_total_capacity_for_pkg(p, subj_id)
            )

        # 3️⃣ Attempt assignment
        for pkg in candidate_packages:
            # --- 情况 A: 已经有固定时间（assigned class_detail） ---
            if cd.start_time and cd.end_time:
                available_rooms = Schedule_Package.get_available_rooms(cd, intake_year)

                for room_id in available_rooms:
                    # Check room conflict across occupied slots
                    if any(
                        occ['room_id'] == room_id
                        and occ['day_of_week'] == cd.day_of_week
                        and not is_time_non_overlap(occ, cd)
                        for p in packages for occ in p['occupied_slots']
                    ):
                        print(f"Room {room_id} conflicts, trying next room")
                        continue

                    subj_id = int(cd.class_.subject_id)
                    pkg["subjects"][subj_id].append({
                        "class_detail_id": cd.class_detail_id,
                        "day_of_week": cd.day_of_week,
                        "start_time": cd.start_time.strftime("%H:%M"),
                        "end_time": cd.end_time.strftime("%H:%M"),
                        "tutor_id": cd.class_.tutor_id,
                        "tutor_name": cd.class_.tutor.user.name if cd.class_.tutor and cd.class_.tutor.user else None,
                        "subject_id": subj_id,
                        "subject_name": cd.class_.subject.name if cd.class_.subject else None,
                        "room_id": room_id,
                        "room_name": Room.query.get(room_id).name if room_id else None
                    })

                    mark_occupied(pkg["occupied_slots"], cd, room_id)
                    placed = True
                    break

                if placed:
                    break 

            # --- 情况 B: 没有固定时间 / 或上述分配失败，走自动排时间逻辑 ---
            if not placed:
                # Unassigned-time class_detail → use try_assign_to_package
                if try_assign_to_package(
                    cd,
                    pkg,
                    packages,
                    intake_year,
                    time_window,
                    prefer_max_capacity=True
                ):
                    placed = True
                    break

        if not placed:
            # 🆕 尝试 Overlap fallback
            print(f"🔁 Trying Overlap mode for leftover class_detail {cd.class_detail_id}")

            for pkg in candidate_packages:
                if allow_overlap_assign(cd, pkg):
                    print(f"✅ Overlap assigned class_detail {cd.class_detail_id} to {pkg['package_name']}")
                    placed = True
                    break

        if not placed:
            print(f"❌ Even Overlap mode failed for class_detail {cd.class_detail_id}")

    # Step 6: Sort classes within each package by day_of_week then start_time
    for pkg in packages:
        for subj_id, classes in pkg["subjects"].items():
            classes.sort(key=lambda c: (int(c['day_of_week']), c['start_time']))

    # 🔐 在这里重新拍一份“纯 timetable + occupied_slots”的快照，作为签名基准
    raw_packages = copy.deepcopy(packages)

    # AI Evaluation for Complete Packages
    complete_packages = [
        pkg for pkg in packages
        if pkg["package_name"] not in [p["package_name"] for p in incomplete_packages]
    ]

    ai_results = evaluate_schedule_ai(
        packages=packages,
        incomplete_packages=incomplete_packages,
        assigned_class_details=assigned_class_details,
        unassigned_class_details=unassigned_class_details,
        time_window=time_window
    )

    # Continue with signing and returning results
    signed_packages = []
    for pkg, raw in zip(packages, raw_packages):
        # Use raw generated schedule package for add signature
        pkg_copy = dict(raw)
        pkg_copy.pop("ai_score", None)
        pkg_copy.pop("ai_recommended", None)
        pkg_copy.pop("ai_reason", None)
        pkg_copy.pop("reason", None)
        pkg_copy.pop("_details", None)
        pkg_copy.pop("_synergy", None)
        pkg_copy.pop("_study_hours", None)

        normalized_pkg = stable_json(pkg_copy)
        pkg_json = json.dumps(normalized_pkg, sort_keys=True)
        signature = hmac.new(
            current_app.secret_key.encode(),
            pkg_json.encode(),
            hashlib.sha256
        ).hexdigest()

        # raw schedule package + AI result + signature
        pkg_with_sig = dict(raw)

        # Bring back AI recommended result
        if "ai_score" in pkg:
            pkg_with_sig["ai_score"] = pkg["ai_score"]
        if "ai_recommended" in pkg:
            pkg_with_sig["ai_recommended"] = pkg["ai_recommended"]
        if "ai_reason" in pkg:
            pkg_with_sig["ai_reason"] = pkg["ai_reason"]

        # Prepare for use for tooltips
        if "_details" in pkg:
            pkg_with_sig["_details"] = pkg["_details"]
        if "_synergy" in pkg:
            pkg_with_sig["_synergy"] = pkg["_synergy"]
        if "_study_hours" in pkg:
            pkg_with_sig["_study_hours"] = pkg["_study_hours"]

        pkg_with_sig["signature"] = signature
        signed_packages.append(pkg_with_sig)

    # Serialize after signing (for consistent API output)
    serialized_packages = json.loads(json.dumps(signed_packages, default=Helper.safe_serialize))
    serialized_incomplete = json.loads(json.dumps(incomplete_packages, default=Helper.safe_serialize))

    return jsonify({
        "status": "warning" if incomplete_packages else "success",
        "message": (
            f"Generated {package_count} packages. "
            f"Assigned: {len(assigned_class_details)}, Unassigned: {len(unassigned_class_details)}. "
            + (f"Incomplete packages detected: {[p['package_name'] for p in incomplete_packages]}"
            if incomplete_packages else "")
        ),
        "packages": serialized_packages,
        "incomplete_packages": serialized_incomplete,
        "ai_result": ai_results  # 🧠 still included in the response
    })


def try_assign_to_package(cd, pkg, packages, intake_year, time_window, prefer_max_capacity=False):
    """
    Assign a class_detail (cd) to pkg with constraints:
      • max 4h continuous package time
      • max 4h continuous tutor time
      • min 30 min rest between blocks
      • prioritize continuity within same day
    """

    from datetime import datetime, timedelta

    duration_minutes = cd.class_.duration
    tutor_id = cd.class_.tutor_id
    subj_id = int(cd.class_.subject_id)

    MAX_CONTINUOUS = 240  # minutes
    MIN_REST = 30         # minutes

    for day in range(1, 8):

        # -------------------------------------------
        # Step 1: Build tutor occupied slots today
        # -------------------------------------------
        tutor_today = [
            occ for p in packages for occ in p['occupied_slots']
            if occ['tutor_id'] == tutor_id and str(occ['day_of_week']) == str(day)
        ]
        tutor_today.sort(key=lambda x: x["start_time"])

        # -------------------------------------------
        # Step 2: Collect package occupied slots today
        # -------------------------------------------
        pkg_today = [
            occ for occ in pkg['occupied_slots']
            if str(occ['day_of_week']) == str(day)
        ]
        pkg_today.sort(key=lambda x: x["start_time"])

        # Calculate pkg continuous
        pkg_continuous = calculate_continuous_minutes(pkg_today)
        tutor_continuous = calculate_continuous_minutes(tutor_today)

        # Last end times
        pkg_last_end = pkg_today[-1]['end_time'] if pkg_today else None
        tutor_last_end = tutor_today[-1]['end_time'] if tutor_today else None

        # -------------------------------------------
        # Step 3: Candidate slots
        # -------------------------------------------
        possible_slots = get_tutor_available_blocks(
            tutor_id,
            intake_year,
            time_window,
            duration_minutes,
            [occ for p in packages for occ in p['occupied_slots']],
            day
        )

        if not possible_slots:
            continue

        # -------------------------------------------
        # Step 4: Prioritize slots after pkg_last_end
        # -------------------------------------------
        prioritized = []
        if pkg_last_end:
            last_end_dt = datetime.combine(datetime.today(), pkg_last_end)
            for s, e in possible_slots:
                s_dt = datetime.combine(datetime.today(), s)
                gap = (s_dt - last_end_dt).total_seconds() / 60
                if gap >= MIN_REST:
                    prioritized.append((s, e))

            prioritized.sort(
                key=lambda se: abs(
                    (datetime.combine(datetime.today(), se[0]) -
                     last_end_dt).total_seconds() / 60 - MIN_REST
                )
            )

        slots_to_try = prioritized if prioritized else possible_slots

        # -------------------------------------------
        # Step 5: Attempt assign
        # -------------------------------------------
        for s, e in slots_to_try:
            s_dt = datetime.combine(datetime.today(), s)
            e_dt = datetime.combine(datetime.today(), e)

            # ---------- continuous limit check ------------
            if pkg_last_end:
                gap = (s_dt - datetime.combine(datetime.today(), pkg_last_end)).total_seconds() / 60
                if gap < MIN_REST and pkg_continuous + duration_minutes > MAX_CONTINUOUS:
                    continue

            if tutor_last_end:
                gap = (s_dt - datetime.combine(datetime.today(), tutor_last_end)).total_seconds() / 60
                if gap < MIN_REST and tutor_continuous + duration_minutes > MAX_CONTINUOUS:
                    continue

            cd.day_of_week = str(day)
            cd.start_time = s
            cd.end_time = e

            # ---------- conflict check (same pkg) -----------
            if any(
                occ['day_of_week'] == cd.day_of_week
                and not is_time_non_overlap(occ, cd)
                for occ in pkg['occupied_slots']
            ):
                continue

            # ---------- find room -----------
            available_rooms = Schedule_Package.get_available_rooms(cd, intake_year, prefer_max_capacity)

            for room_id in available_rooms:

                # Check room conflicts across packages
                if any(
                    occ['room_id'] == room_id
                    and occ['day_of_week'] == cd.day_of_week
                    and not is_time_non_overlap(occ, cd)
                    for p in packages for occ in p['occupied_slots']
                ):
                    continue

                # Success → assign
                pkg["subjects"][subj_id].append({
                    "class_detail_id": cd.class_detail_id,
                    "day_of_week": cd.day_of_week,
                    "start_time": cd.start_time.strftime("%H:%M"),
                    "end_time": cd.end_time.strftime("%H:%M"),
                    "tutor_id": tutor_id,
                    "tutor_name": cd.class_.tutor.user.name if cd.class_.tutor and cd.class_.tutor.user else None,
                    "subject_id": subj_id,
                    "subject_name": cd.class_.subject.name if cd.class_.subject else None,
                    "room_id": room_id,
                    "room_name": Room.query.get(room_id).name
                })

                mark_occupied(pkg["occupied_slots"], cd, room_id)
                return True

    return False


def has_conflict(occupied_slots, cd, room_id=None):
    for occ in occupied_slots:
        if str(occ['day_of_week']) != str(cd.day_of_week):
            continue

        if occ['tutor_id'] == cd.class_.tutor_id and not is_time_non_overlap(occ, cd):
            return True

        if room_id is not None and occ['room_id'] == room_id and not is_time_non_overlap(occ, cd):
            return True

    return False

def is_time_non_overlap(a, b):
    return a['end_time'] <= b.start_time or b.end_time <= a['start_time']

def mark_occupied(occupied_slots, cd, room_id):
    occupied_slots.append({
        "day_of_week": cd.day_of_week,
        "start_time": cd.start_time,
        "end_time": cd.end_time,
        "room_id": room_id,
        "tutor_id": cd.class_.tutor_id
    })

def get_tutor_available_blocks(
    tutor_id,
    intake_year,
    time_window,
    duration_minutes,
    occupied_in_request,
    day_of_week
):
    """Return a list of possible (start, end) time slots for a tutor."""

    from datetime import datetime, time, timedelta

    # -------------------------
    # Step 1: Define window
    # -------------------------
    if time_window == 'M':
        window_start, window_end = time(8, 0), time(12, 0)
    elif time_window == 'A':
        window_start, window_end = time(13, 0), time(21, 0)
    else:
        window_start, window_end = time(8, 0), time(21, 0)

    # -------------------------
    # Step 2: DB + in-request conflicts
    # -------------------------
    db_occupied = Schedule_Package.get_tutor_occupied_slots(tutor_id, intake_year, time_window)

    db_occupied = [
        (occ['start_time'], occ['end_time'])
        for occ in db_occupied
        if str(occ['day_of_week']) == str(day_of_week)
    ]

    in_request = [
        (occ['start_time'], occ['end_time'])
        for occ in occupied_in_request
        if occ['tutor_id'] == tutor_id and str(occ['day_of_week']) == str(day_of_week)
    ]

    occupied = db_occupied + in_request

    # Convert to dt
    occupied_dt = []
    for s, e in occupied:
        occupied_dt.append((
            datetime.combine(datetime.today(), s),
            datetime.combine(datetime.today(), e)
        ))
    occupied_dt.sort()

    # -------------------------
    # Step 3: Merge overlaps
    # -------------------------
    merged = []
    for s, e in occupied_dt:
        if not merged or s > merged[-1][1]:
            merged.append([s, e])
        else:
            merged[-1][1] = max(merged[-1][1], e)

    # -------------------------
    # Step 4: Collect available blocks
    # -------------------------
    available_blocks = []
    pointer = datetime.combine(datetime.today(), window_start)
    window_end_dt = datetime.combine(datetime.today(), window_end)

    for s, e in merged:
        if s > pointer:
            if (s - pointer).total_seconds() / 60 >= duration_minutes:
                available_blocks.append((pointer, s))
        pointer = max(pointer, e)

    if pointer < window_end_dt:
        if (window_end_dt - pointer).total_seconds() / 60 >= duration_minutes:
            available_blocks.append((pointer, window_end_dt))

    # -------------------------
    # Step 5: "Sliding Window" slots
    # -------------------------
    final_slots = []
    granularity = 30  # in minutes

    for block_start, block_end in available_blocks:
        start_dt = block_start
        end_limit = block_end

        while start_dt + timedelta(minutes=duration_minutes) <= end_limit:
            final_slots.append((
                start_dt.time(),
                (start_dt + timedelta(minutes=duration_minutes)).time()
            ))
            start_dt += timedelta(minutes=granularity)

    return final_slots


def calculate_continuous_minutes(slots):
    """Given sorted slots, compute total continuous minutes."""
    from datetime import datetime
    if not slots:
        return 0

    total = 0
    prev_end = None

    for occ in slots:
        s = datetime.combine(datetime.today(), occ["start_time"])
        e = datetime.combine(datetime.today(), occ["end_time"])

        if prev_end and (s - prev_end).total_seconds() <= 1800:
            total += (e - prev_end).seconds / 60
        else:
            total = (e - s).seconds / 60
        prev_end = e

    return total

def get_subject_total_capacity_for_pkg(pkg, subj_id: int) -> int:
    room_id_list = [
        c.get('room_id')
        for c in pkg['subjects'].get(subj_id, [])
        if c.get('room_id') is not None
    ]
    if not room_id_list:
        return 0
    capacities = [Room.get_room_capacity(rid) for rid in room_id_list]
    return sum(capacities)

def allow_overlap_assign(cd, pkg):
    subj_id = int(cd.class_.subject_id)

    # 1️⃣ Tutor conflict check（仍然严格）
    for occ in pkg['occupied_slots']:
        if str(occ['day_of_week']) == str(cd.day_of_week):
            if occ['tutor_id'] == cd.class_.tutor_id:
                return False  # tutor 不可能同时教两堂

    # 2️⃣ Room conflict check（仍然严格）
    available_rooms = Schedule_Package.get_available_rooms(cd, cd.class_.intake_year)

    valid_room = None
    for room_id in available_rooms:
        room_conflict = False

        for occ in pkg['occupied_slots']:
            if (
                occ['room_id'] == room_id
                and str(occ['day_of_week']) == str(cd.day_of_week)
                and not is_time_non_overlap(occ, cd)   # room 不允许时间重叠
            ):
                room_conflict = True
                break

        if not room_conflict:
            valid_room = room_id
            break

    # 没有 room 可用 → overlap fallback 失败
    if valid_room is None:
        return False

    # 3️⃣ 允许时间重叠，但 tutor/room 不冲突
    pkg["subjects"][subj_id].append({
        "class_detail_id": cd.class_detail_id,
        "day_of_week": cd.day_of_week,
        "start_time": cd.start_time.strftime("%H:%M"),
        "end_time": cd.end_time.strftime("%H:%M"),
        "tutor_id": cd.class_.tutor_id,
        "tutor_name": cd.class_.tutor.user.name if cd.class_.tutor and cd.class_.tutor.user else None,
        "subject_id": subj_id,
        "subject_name": cd.class_.subject.name if cd.class_.subject else None,
        "room_id": valid_room,
        "room_name": Room.query.get(valid_room).name
    })

    mark_occupied(pkg["occupied_slots"], cd, valid_room)
    return True


def evaluate_schedule_ai(
    packages, incomplete_packages,
    assigned_class_details, unassigned_class_details,
    time_window
):
    import numpy as np
    from ai import schedule_package_ai as ai
    from utils.choose_best_class import choose_best_class_for_subject

    # -----------------------------
    # Load AI models
    # -----------------------------
    lifestyle_model = ai.LifestyleModel("data/student_lifestyle.csv").train()
    performance_model = ai.PerformanceModel("data/student_performance.csv").train()
    tt_extractor = ai.TimetableFeatureExtractor()
    tt_model = ai.TimetableAIModel()
    tt_model.train()

    # -----------------------------
    # Time window rules (weekly view)
    # -----------------------------
    if time_window == "M":                # Morning 8am–12pm
        max_weekly_capacity = 24          
        ideal_weekly = 6                  
        tw_low, tw_high = 3, 12           
        workload_var = 28

    elif time_window == "A":              # Afternoon 1pm–9pm
        max_weekly_capacity = 48          
        ideal_weekly = 10                 
        tw_low, tw_high = 6, 18           
        workload_var = 40

    else:                                 # Full day 8am–9pm
        max_weekly_capacity = 60
        ideal_weekly = 12
        tw_low, tw_high = 6, 20
        workload_var = 45

    # -----------------------------
    # Only evaluate full packages
    # -----------------------------
    complete_packages = [
        pkg for pkg in packages
        if pkg["package_name"] not in [x["package_name"] for x in incomplete_packages]
    ]
    if not complete_packages:
        return []

    raw_scores = []

    # =============================================================
    # PASS 1 — Compute synergy for each package
    # =============================================================
    for pkg in complete_packages:

        sessions = []
        total_study_hours = 0.0  # 一周总学习时长（hour）

        for subj_id, class_list in pkg["subjects"].items():
            best_c = choose_best_class_for_subject(class_list)
            sessions.append(best_c)

            cd = next(
                (cd for cd in assigned_class_details + unassigned_class_details
                 if cd.class_detail_id == best_c["class_detail_id"]),
                None
            )
            if cd and hasattr(cd.class_, "duration"):
                total_study_hours += float(cd.class_.duration) / 60.0

        total_rest_hours = max(max_weekly_capacity - total_study_hours, 0.0)

        # ----- Lifestyle -----
        lifestyle_score = lifestyle_model.predict_score(
            stress_level=2,
            daily_study=total_study_hours / 6,
            sleep_time=total_rest_hours / 6
        )

        # ----- Performance (window-normalized) -----
        perf_raw = performance_model.estimate_performance(
            study_hours=total_study_hours,
            rest_hours=total_rest_hours
        )

        # Adjust performance according to selected time window
        if time_window == "M":
            performance_score = min(1.0, perf_raw + 0.10)
        elif time_window == "A":
            performance_score = min(1.0, perf_raw + 0.04)
        else:
            performance_score = min(1.0, perf_raw + 0.02)

        # ----- Workload fitness (weekly hours vs ideal_weekly) -----
        workload_fitness = float(np.clip(
            np.exp(-((total_study_hours - ideal_weekly) ** 2) / workload_var),
            0, 1
        ))

        # ----- Timetable structure -----
        tt = tt_extractor.extract_from_sessions(sessions)
        timetable_score = tt_model.predict(tt)

        # ----- Synergy -----
        synergy = ai.calculate_synergy(
            lifestyle=lifestyle_score,
            performance=performance_score,
            timetable=timetable_score,
            workload=workload_fitness
        )

        pkg["_synergy"] = synergy
        pkg["_study_hours"] = total_study_hours
        pkg["_details"] = {
            "lifestyle_score": lifestyle_score,
            "performance_score": performance_score,
            "workload_fitness": workload_fitness,
            "timetable_score": timetable_score,
            "timetable_features": tt
        }

        raw_scores.append(synergy)

    # =============================================================
    # PASS 2 — Rank-based score stretching (45–95)
    # =============================================================
    if len(raw_scores) > 1:
        lo, hi = min(raw_scores), max(raw_scores)
        diff = max(hi - lo, 1e-5)
        scaled_scores = [45 + (s - lo) / diff * 50 for s in raw_scores]
    else:
        scaled_scores = [70.0]

    for pkg, sc in zip(complete_packages, scaled_scores):
        pkg["ai_score"] = round(float(sc), 2)

    # -----------------------------
    # Build metrics table
    # -----------------------------
    metrics_by_name = {}
    for pkg in complete_packages:
        det = pkg["_details"]
        tt = det["timetable_features"]
        name = pkg["package_name"]

        metrics_by_name[name] = {
            "score": pkg["ai_score"],
            "study_hours": pkg["_study_hours"],
            "performance_score": det["performance_score"],
            "lifestyle_score": det["lifestyle_score"],
            "workload_fitness": det["workload_fitness"],
            "timetable_score": det["timetable_score"],
            "avg_gap": tt["avg_gap"],
            "density": tt["density"],
            "room_switches": tt["room_switches"],
        }

    # Detect top package by score
    best_score = max(m["score"] for m in metrics_by_name.values())
    top_pkg_name = next(
        n for n, m in metrics_by_name.items()
        if abs(m["score"] - best_score) < 1e-6
    )

    # =============================================================
    # PASS 3 — Reason + Level (Severity first, then score)
    # =============================================================
    ai_results = []

    for pkg in complete_packages:
        name = pkg["package_name"]
        m = metrics_by_name[name]
        det = pkg["_details"]

        h = m["study_hours"]                # weekly study hours
        performance_score = m["performance_score"]
        lifestyle_score = m["lifestyle_score"]
        workload_fitness = m["workload_fitness"]
        timetable_score = m["timetable_score"]
        tt = det["timetable_features"]

        is_top = (name == top_pkg_name)

        # -------------------------
        # BASELINE REASONS (window-aware)
        # -------------------------
        baseline = []
        severe_issue = False

        # --- Performance thresholds per window ---
        if time_window == "M":
            perf_low, perf_severe = 0.22, 0.14
        elif time_window == "A":
            perf_low, perf_severe = 0.28, 0.18
        else:  # Full-day ≈ Afternoon
            perf_low, perf_severe = 0.28, 0.18

        if performance_score < perf_low:
            if time_window == "M" and tw_low <= h <= tw_high:
                baseline.append("Performance can be improved further within this morning window.")
            else:
                baseline.append("Performance is slightly below the effective level for this time window.")

        if performance_score < perf_severe:
            baseline.append("Performance level is critically low.")
            severe_issue = True

        # --- Lifestyle ---
        if lifestyle_score < 0.35:
            baseline.append("Lifestyle balance falls below expected standards.")
        if lifestyle_score < 0.25:
            baseline.append("Lifestyle condition is significantly unhealthy.")
            severe_issue = True

        # --- Workload fitness ---
        if workload_fitness < 0.25:
            baseline.append("Workload does not align well with the recommended weekly load.")
        if workload_fitness < 0.15:
            baseline.append("Workload level is critically mismatched with learning needs.")
            severe_issue = True

        # --- Time-window bounds (weekly hours vs tw_low / tw_high) ---
        if h > tw_high:
            baseline.append("Study hours exceed the safe range for this time window.")
            if h > tw_high * 1.10:
                baseline.append("Study hours exceed the time-window limit by a large margin.")
                severe_issue = True

        if h < tw_low:
            baseline.append("Study hours fall below the effective learning threshold.")
            if h < tw_low * 0.8:
                baseline.append("Study load is critically insufficient for effective learning.")
                severe_issue = True

        # -------------------------
        # COMPARATIVE REASONS
        # (only Gap > Density > Room differences)
        # -------------------------
        comp = []

        if not is_top:
            top_m = metrics_by_name[top_pkg_name]

            # 1) gap difference
            if m["avg_gap"] < top_m["avg_gap"] - 3:
                comp.append(
                    f"Shorter breaks compared to {top_pkg_name}, reducing rest opportunities."
                )

            # 2) density
            if m["density"] > top_m["density"] + 0.10:
                comp.append(
                    f"Classes are more tightly packed than {top_pkg_name}."
                )

            # 3) room switching
            if m["room_switches"] > top_m["room_switches"]:
                comp.append(
                    f"More room switching than {top_pkg_name}, making the timetable less stable."
                )

        else:
            # Top package：只给一个简洁的 overall 说明
            if severe_issue:
                comp.append(
                    "Highest score among generated options, but fundamental requirements are not met."
                )
            else:
                comp.append("Overall best-ranked schedule among generated options.")

        # -------------------------
        # Final reasons
        # -------------------------
        reasons = comp + baseline
        if not reasons:
            reasons = ["Well-balanced schedule with no significant disadvantages."]

        # -------------------------
        # Recommendation level
        # -------------------------
        score = pkg["ai_score"]

        if severe_issue:
            level = "Not Recommended"
        else:
            # Separate to three level if no issue
            if score >= 88:
                level = "Highly Recommended"
            elif score >= 72:
                level = "Recommended"
            else:
                level = "Moderate"

            if time_window == "M" and tw_low <= h <= tw_high and level == "Not Recommended":
                level = "Moderate"

        pkg["ai_recommended"] = level
        pkg["ai_reason"] = reasons

        # -------------------------
        # Enhance: reason classification
        # -------------------------
        classified_reasons = []
        for r in reasons:
            r_low = r.lower()

            if "overall best" in r_low:
                reason_type = "positive"
            elif "critically" in r_low or "large margin" in r_low:
                reason_type = "danger"
            elif "below" in r_low or "insufficient" in r_low or "tightly packed" in r_low:
                reason_type = "warning"
            else:
                reason_type = "neutral"

            classified_reasons.append({
                "text": r,
                "type": reason_type
            })


        ai_results.append({
            "package_name": name,
            "ai_score": score,
            "ai_recommended": level,
            "study_hours": h,
            "reason": classified_reasons,
            "breakdown": det
        })

    return ai_results


# Helper
def stable_json(obj):
    """Recursively ensure JSON structure is consistent between front & back."""
    if isinstance(obj, dict):
        # convert all keys to string for deterministic order
        return {str(k): stable_json(v) for k, v in sorted(obj.items(), key=lambda x: str(x[0]))}
    elif isinstance(obj, list):
        return [stable_json(i) for i in obj]
    elif hasattr(obj, "strftime"):
        # convert datetime/time to consistent string
        return obj.strftime("%H:%M")
    elif obj is None:
        return None
    elif isinstance(obj, (int, float, bool, str)):
        return obj
    else:
        return str(obj)


def generate_yearly_schedule_background(app, package_id, intake_year):
    """
    Generate a year's worth of schedules in the background (non-blocking)
    """
    from datetime import timedelta, datetime

    with app.app_context():
        try:
            print(f"🧠 Starting background schedule generation for package {package_id} ({intake_year})...")
            package = Schedule_Package.query.get(package_id)
            if not package:
                print(f"❌ Package {package_id} not found, aborting.")
                return
            
            try:
                intake_year = int(intake_year)
            except ValueError:
                print(f"❌ Invalid intake_year: {intake_year}")
                return

            # ----- NEW LOGIC -----
            today = datetime.today().date()
            current_year = today.year

            if intake_year == current_year:
                # Start from tomorrow
                start_date = today + timedelta(days=1)
                # Convert to datetime for compatibility
                start_date = datetime.combine(start_date, datetime.min.time())
                end_date = datetime(intake_year, 12, 31)
                print(f"📅 Current year intake → Generating from {start_date} to {end_date}")
            else:
                # Original full-year generation
                start_date = datetime(intake_year, 1, 1)
                end_date = datetime(intake_year, 12, 31)
                print(f"📅 Full year generation → {start_date} to {end_date}")

            # ---------------------

            Time_Schedule.generate_for_package(package, start_date, end_date)

            print(f"✅ Background schedule generation completed for package {package_id} ({intake_year})")

        except Exception as e:
            print(f"❌ Background generation failed for package {package_id}: {e}")



# ===========================================================================================================
# Mobile controller
# ===========================================================================================================
@schedule_package_bp.route('/available', methods=['GET'])
def get_available_packages():
    
    edu_lvl_id = request.args.get('edu_lvl_id')
    intake_year = request.args.get('intake_year')
    student_id = request.args.get('student_id', type=int)

    if not edu_lvl_id or not intake_year:
        return jsonify({"error": "Missing required parameters"}), 400
    
    # STEP 1 — check student enrolled class
    enrolled_class_detail_ids = set()
    if student_id:
        enrollments = Class_Enrollment.get_student_enrolled_classes(student_id)
        
        enrolled_class_detail_ids = {
            e.class_detail_id for e in enrollments
        }
    current_app.logger.debug("Collected enrolled class detail IDs: %s", enrolled_class_detail_ids)


    # Only active packages that match education level + intake year
    packages = Schedule_Package.get_package_for_enrollment(edu_lvl_id, intake_year)

    result = []
    for pkg in packages:

        sets_data = []
        for s in pkg.package_sets:

            details_data = []
            for d in s.details:

                cd = d.class_detail
                cls = cd.class_
                subj = cls.subject
                tutor = cls.tutor.user if cls.tutor else None
                room = d.room

                # 必须 active
                if cd.status != '1' or cls.status != '1' or subj.status != '1':
                    continue

                # --------------------------------------------------
                # Filter out fully enrollment class with class_detail + set_id
                # --------------------------------------------------
                # 1. 找该 class_detail_id + set_id 的 active enrollment 总数
                active_count = Class_Enrollment.query.filter_by(
                    class_detail_id=cd.class_detail_id,
                    set_id=s.set_id,
                    status='1'     # 或者看你系统的 active 状态字段
                ).count()

                # 2. 对比 max_capacity
                if active_count >= d.max_capacity:
                    # 🛑 full → skip
                    continue

                details_data.append({
                    "class_detail_id": cd.class_detail_id,
                    "set_id": s.set_id,
                    "subject_id": subj.subject_id,
                    "subject_name": subj.name,

                    "day_of_week": cd.day_of_week,
                    "start_time": cd.start_time.strftime("%H:%M") if cd.start_time else None,
                    "end_time": cd.end_time.strftime("%H:%M") if cd.end_time else None,

                    "tutor_id": tutor.user_id if tutor else None,
                    "tutor_name": tutor.name if tutor else None,

                    "room_id": room.room_id if room else None,
                    "room_name": room.name if room else None,
                    "max_capacity": d.max_capacity,

                    "normal_class_fee": subj.normal_class_fee,
                    "focus_class_fee": subj.focus_class_fee,
                    "material_fee": subj.material_fee,

                    "class_type": cls.class_type,
                    "duration": cls.duration,
                    "time_per_week": cls.time_per_week,

                    # 🔥 新增字段 — 是否已被该学生 enroll
                    "is_enrolled": cd.class_detail_id in enrolled_class_detail_ids
                })

            sets_data.append({
                "set_id": s.set_id,
                "set_name": s.name,
                "created_at": s.created_datetime.strftime("%Y-%m-%d %H:%M:%S"),
                "classes": details_data
            })

        result.append({
            "package_id": pkg.package_id,
            "name": pkg.name,
            "intake_year": pkg.year,
            "edu_lvl_id": pkg.edu_lvl_id,
            "is_open_for_enrollment": pkg.is_open_for_enrollment == '1',
            "sets": sets_data
        })

    return jsonify(result), 200

