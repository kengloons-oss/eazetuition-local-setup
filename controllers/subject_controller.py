from flask import Blueprint, render_template, request, redirect, url_for, jsonify, send_from_directory, current_app
from flask_paginate import Pagination
import pandas as pd
from werkzeug.utils import secure_filename
import os

from models.subject_model import Subject
from models.education_lvl_model import Education_Lvl
from middlewares.admin_required import admin_api_required, admin_required

import math

subject_bp = Blueprint('subject', __name__, url_prefix='/subject')

@subject_bp.route('/list')
@admin_required
def subject_list():
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
    name = request.args.get('name')
    status = request.args.get('status')
    sort = request.args.get('sort') or 'subject_id'
    dir = request.args.get('dir') or 'asc'

    fee_filters = {
        'normal_class_fee_min': request.args.get('normal_class_fee_min', type=float),
        'normal_class_fee_max': request.args.get('normal_class_fee_max', type=float),
        'focus_class_fee_min': request.args.get('focus_class_fee_min', type=float),
        'focus_class_fee_max': request.args.get('focus_class_fee_max', type=float),
        'material_fee_min': request.args.get('material_fee_min', type=float),
        'material_fee_max': request.args.get('material_fee_max', type=float),
    }

    # Filtered and sorted query
    query = Subject.get_filtered(name, status, fee_filters, sort, dir)
    total = query.count()

    # Calculate max pages
    max_page = max(1, math.ceil(total / per_page))

    # If current page is too high after filtering, reset to page 1
    if page > max_page:
        page = 1

    offset = (page - 1) * per_page
    subjects = query.offset(offset).limit(per_page).all()

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
        href=f"?name={name or ''}&status={status or ''}&sort={sort}&dir={dir}&per_page={per_page}&page={{0}}",
        display_msg = '',
        display = True
    )

    data = {
        'subjects': subjects,
        'sort': sort,
        'dir': dir,
        'page': page,
        'per_page': per_page,
        'pagination': pagination,
        'name': name,
        'status': status,
        'title': 'Subject | List',
        'page_count' : max_page,
        'current_count' : len(subjects),
        'total_count' : total
    }

    fields = [
        {"name": "subject_id", "label": "Subject ID"},
        {"name": "name", "label": "Name"},
        {"name": "education_level", "label": "Edu. Level"},
        {"name": "normal_class_fee", "label": "Normal Fee"},
        {"name": "focus_class_fee", "label": "Focus Fee"},
        {"name": "material_fee", "label": "Material Fee"},
    ]

    #Header
    breadcrumbs = [
        ('Subject', url_for('subject.subject_list')),
        ('List', None)
    ]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render_template('/admin/subject/_subject_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)

    return render_template('/admin/subject/subject_list.html', **data, fields=fields, breadcrumbs=breadcrumbs)


@subject_bp.route('/add', methods=['GET', 'POST'])
@admin_required
def add_subject():
    edu_lvls = Education_Lvl.get_active_lvl()

    breadcrumbs = [
        ('Subject', url_for('subject.subject_list')),
        ('Add', None)
    ]

    title = 'Subject | Add'

    if request.method == 'POST':
        try:
            edu_lvl_id = request.form['edu_lvl_id']
            name = request.form['name'].strip()
            normal_fee = request.form['normal_class_fee']
            focus_fee = request.form['focus_class_fee']
            material_fee = request.form['material_fee']

            # =====================================================
            # 🔍 1. Check complete duplicates (name + all fees same)
            # =====================================================
            exact_duplicate = Subject.check_duplicate_subject_full(
                name=name,
                edu_lvl_id=edu_lvl_id,
                normal_fee=normal_fee,
                focus_fee=focus_fee,
                material_fee=material_fee
            )

            if exact_duplicate:
                return redirect(url_for(
                    'subject.add_subject',
                    status='error',
                    title='Duplicate Subject',
                    message=f'The subject "{name}" with the same class fees already exists in this education level.'
                ))

            # =====================================================
            # ✔ Allows same name but different fees (valid case)
            # =====================================================

            data = {
                'edu_lvl_id': edu_lvl_id,
                'name': name,
                'description': request.form['description'],
                'normal_class_fee': normal_fee,
                'focus_class_fee': focus_fee,
                'material_fee': material_fee,
                'status': '1'
            }

            Subject.add(data)

            return redirect(url_for(
                'subject.add_subject',
                status='success',
                title='Subject Added',
                message='The subject has been successfully added.',
                redirectUrl=url_for('subject.subject_list')
            ))

        except Exception as e:
            print(f"Add Error: {e}")
            return redirect(url_for(
                'subject.add_subject',
                status='error',
                title='Oops...',
                message='Failed to add the subject. Please try again.'
            ))

    return render_template(
        '/admin/subject/add_subject.html',
        edu_lvls=edu_lvls,
        breadcrumbs=breadcrumbs,
        title=title
    )


@subject_bp.route('/ajax/check-duplicate-subject', methods=['POST'])
@admin_required
def ajax_check_duplicate_subject():
    data = request.get_json()

    subject_id = data.get("subject_id")
    name = data.get("name", "").strip()
    edu_lvl_id = data.get("edu_lvl_id")
    normal_fee = data.get("normal_fee")
    focus_fee = data.get("focus_fee")
    material_fee = data.get("material_fee")

    exact_duplicate = Subject.check_duplicate_subject_full(
        name=name,
        edu_lvl_id=edu_lvl_id,
        normal_fee=normal_fee,
        focus_fee=focus_fee,
        material_fee=material_fee,
        subject_id=subject_id
    )

    return jsonify({"duplicate": exact_duplicate is not None})



@subject_bp.route('/import', methods=['GET', 'POST'])
@admin_required
def import_subject():
    breadcrumbs = [
        ('Subject', url_for('subject.subject_list')),
        ('Import', None)
    ]
    title = "Subject | Import"

    if request.method == 'POST':
        try:
            file = request.files.get("file")

            if not file:
                return jsonify({
                    "error": True,
                    "message": "No file uploaded.",
                }), 400

            filename = secure_filename(file.filename)

            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename.endswith('.xlsx'):
                df = pd.read_excel(file)
            else:
                return jsonify({
                    "error": True,
                    "message": "Invalid file format. Only CSV or Excel is allowed."
                }), 400

            ok, success_count, failed_count, failed_list = Subject.import_dataframe(df)

            if not ok:
                return jsonify({
                    "error": True,
                    "message": failed_list[0]
                }), 400

            return jsonify({
                "error": False,
                "success_count": success_count,
                "failed_count": failed_count,
                "failed_items": failed_list
            })

        except Exception as e:
            print("Import Error:", e)
            return jsonify({
                "error": True,
                "message": "Unexpected server error."
            }), 500

    return render_template(
        '/admin/subject/import_subject.html',
        breadcrumbs=breadcrumbs,
        title=title
    )


@subject_bp.route('/detail/<int:id>', methods=['GET', 'POST'])
@admin_required
def edit_subject(id):
    subject = Subject.get_by_id(id)
    edu_lvls = Education_Lvl.get_all()

    breadcrumbs = [
        ('Subject', url_for('subject.subject_list')),
        ('Edit', None)
    ]

    title = 'Subject | SJ%04d' % subject.subject_id


    #verify is the subject exist
    if subject is None:
        # Redirect to list with alert details
        return redirect(url_for('subject.subject_list', 
            status='error',
            title='Subject Not Found',
            message='The subject you are trying to view does not exist.',
        ))

    if request.method == 'POST':
        status = ""
        title = ""
        message = ""
        redirectUrl=""

        try:
            data = {
                'name': request.form['name'],
                'description': request.form['description'],
                'normal_class_fee': request.form['normal_class_fee'],
                'focus_class_fee': request.form['focus_class_fee'],
                'material_fee': request.form['material_fee'],
            }

            Subject.update(request.form['subject_id'], data)

            status = "success"
            title = "Subject Updated"
            message = "The subject has been successfully updated."
            redirectUrl="/subject/list"
            
        except Exception as e:
            status = "error"
            title = "Oops..."
            message = "Failed to update the subject. Please try again."

        return redirect(url_for('subject.edit_subject', 
            status=status, 
            title=title, 
            message=message,
            redirectUrl=redirectUrl,
            id=id
        ))

    return render_template('/admin/subject/edit_subject.html', subject=subject, edu_lvls=edu_lvls, breadcrumbs=breadcrumbs, title=title)



@subject_bp.route('/activate/<int:id>', methods=['POST'])
@admin_required
def activate_subject(id):
    subject = Subject.query.get(id)
    if not subject:
        return jsonify(success=False, error="Subject not found")

    subject.update_status(id, '1')
    return jsonify(success=True)



@subject_bp.route('/deactivate/<int:id>', methods=['POST'])
@admin_required
def deactivate_subject(id):
    subject = Subject.query.get(id)
    if not subject:
        return jsonify(success=False, error="Subject not found")

    Subject.update_status(id, '0')
    return jsonify(success=True)


@subject_bp.route('/by_edu_lvl/<int:edu_lvl_id>', methods=['GET'])
@admin_api_required
def get_subjects_by_edu_level(edu_lvl_id):
    subjects = Subject.get_by_edu_lvl_id(edu_lvl_id)

    if subjects is None:
        return jsonify({'error': f'Education Level ID {edu_lvl_id} does not exist.'}), 404

    if not subjects:
        return jsonify([])  # return empty list if no subjects found
    
    return jsonify([{
        'subject_id': s.subject_id,
        'name': s.name
    } for s in subjects])


@subject_bp.route('/data/<path:filename>')
def download_subject_template(filename):
    data_folder = os.path.join(current_app.root_path, "data")

    file_path = os.path.join(data_folder, filename)
    if not os.path.exists(file_path):
        return {"message": "File not found"}, 404

    return send_from_directory(data_folder, filename, as_attachment=True)