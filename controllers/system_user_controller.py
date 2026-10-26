from flask import Blueprint, jsonify, request, render_template, session, redirect
from functools import wraps
from werkzeug.security import generate_password_hash
from models import db
from models.system_user_model import System_User
from models.education_lvl_model import Education_Lvl
from models.student_model import Student
from models.parent_model import Parent
from models.tutor_model import Tutor
from sqlalchemy import or_

system_user_bp = Blueprint("system_user", __name__)



def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "admin_id" not in session:
            # For API calls
            if request.path.startswith("/system-user") and request.method != "GET":
                return jsonify({"success": False, "error": "Unauthorized"}), 401

            # For webpage → redirect with flag
            return redirect("/auth/admin/login?show_modal=1")
        
        return f(*args, **kwargs)
    return wrapper


@system_user_bp.route("/parents/list", methods=["GET"])
@admin_required
def parent_list_page():
    return render_template("admin/system-user/parent_list.html")

@system_user_bp.route("/parents/add", methods=["GET"])
@admin_required
def parent_add_page():
    return render_template("admin/system-user/parent_add.html")

@system_user_bp.route("/parents/edit/<int:user_id>", methods=["GET"])
@admin_required
def parent_edit_page(user_id):
    return render_template("admin/system-user/parent_edit.html", user_id=user_id)

# --------------------------- STUDENTS ---------------------------

@system_user_bp.route("/students/list", methods=["GET"])
@admin_required
def student_list_page_view():
    return render_template("admin/system-user/student_list.html")

@system_user_bp.route("/students/add", methods=["GET"])
@admin_required
def student_add_page():
    return render_template("admin/system-user/student_add.html")

@system_user_bp.route("/students/edit/<int:user_id>", methods=["GET"])
@admin_required
def student_edit_page(user_id):
    return render_template("admin/system-user/student_edit.html", user_id=user_id)

@system_user_bp.route("/students/<int:user_id>", methods=["GET"])
def get_student(user_id):
    user = System_User.query.filter_by(user_id=user_id, type="student").first()
    if not user or not user.student:
        return jsonify({"success": False, "error": "Student not found"}), 404

    s = user.student
    return jsonify({
        "success": True,
        "student": {
            "user_id": user.user_id,
            "student_id": s.student_id,
            "name": user.name,
            "email": user.email,
            "age": s.age,
            "edu_lvl_id": s.edu_lvl_id,
            "edu_level_name": s.education_level.name if s.education_level else None,
            "payment_status": s.payment_status,
            "status": user.status
        }
    })



# --------------------------- TUTORS ---------------------------
@system_user_bp.route("/tutors/list", methods=["GET"])
@admin_required
def tutor_list_page_view():
    return render_template("admin/system-user/tutor_list.html")

@system_user_bp.route("/tutors/add", methods=["GET"])
@admin_required
def tutor_add_page():
    return render_template("admin/system-user/tutor_add.html")

@system_user_bp.route("/tutors/edit/<int:user_id>", methods=["GET"])
@admin_required
def tutor_edit_page(user_id):
    return render_template("admin/system-user/tutor_edit.html", user_id=user_id)

# ----------------------------------------
# HELPER: Pagination + Search
# ----------------------------------------
def apply_filters(query, search, status):
    """
    Apply search and status filters to the query.
    """
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                System_User.name.ilike(like),
                System_User.email.ilike(like),
                System_User.ic_no.ilike(like),
                Parent.tel_no.ilike(like)  # use the already joined Parent table
            )
        )
    if status in ("0", "1"):
        query = query.filter(System_User.status == int(status))
    return query

def paginate(query, page, per_page):
    """
    Paginate the SQLAlchemy query.
    """
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "data": [item for item in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages
        }


# ----------------------------------------
# PARENTS 
# ----------------------------------------
@system_user_bp.route("/parents", methods=["GET"])
def get_parent_list():
    search = request.args.get("search", "")
    status = request.args.get("status", "")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))

    # Base query: join Parent once
    query = (
        System_User.query
        .join(Parent)
        .filter(System_User.type == "parent")
    )

    # Apply search and status filters
    query = apply_filters(query, search, status)

    # Paginate the result
    result = paginate(query, page, per_page)

    # Return JSON response
    return jsonify({
        "success": True,
        "parents": [{
            "parent_id": p.parent.parent_id if p.parent else None,
            "user_id": p.user_id,
            "name": p.name,
            "email": p.email,
            "tel_no": p.parent.tel_no if p.parent else None,
            "status": str(p.status)  # make sure status is string for JS comparison
        } for p in result["data"]],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"]
    })


@system_user_bp.route("/parents/<int:user_id>", methods=["GET"])
def get_parent(user_id):
    user = System_User.query.filter_by(user_id=user_id, type="parent").first()
    if not user or not user.parent:
        return jsonify({"success": False, "error": "Parent not found"}), 404

    p = user.parent
    return jsonify({
        "success": True,
        "parent": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "tel_no": p.tel_no,
            "status": user.status
        }
    })

@system_user_bp.route("/parents/edit/<int:user_id>", methods=["PUT"])
def edit_parent(user_id):
    data = request.get_json()
    user = System_User.query.filter_by(user_id=user_id, type="parent").first()
    if not user or not user.parent:
        return jsonify({"success": False, "error": "Parent not found"}), 404

    new_email = data.get("email", user.email)

    
    if new_email != user.email:
        existing = System_User.query.filter_by(email=new_email).first()
        if existing:
            return jsonify({"success": False, "error": "Email already exists"}), 400

    # Update email
    user.email = new_email

    # Update password if provided
    if data.get("password"):
        user.password = generate_password_hash(data["password"])

    # Update parent-specific fields
    user.parent.tel_no = data.get("tel_no", user.parent.tel_no)

    db.session.commit()
    return jsonify({"success": True, "message": "Parent updated successfully"})

# ----------------------------------------
# Student
# ----------------------------------------
@system_user_bp.route("/students", methods=["GET"])
def get_student_list():
    search = request.args.get("search", "")
    status = request.args.get("status", "")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))

    query = (
        System_User.query
        .join(Student)
        .filter(System_User.type == "student")
    )

    query = apply_filters(query, search, status)
    result = paginate(query, page, per_page)

    return jsonify({
        "success": True,
        "students": [{
            "student_id": u.student.student_id if u.student else None,
            "user_id": u.user_id,
            "name": u.name,
            "email": u.email,
            "age": u.student.age if u.student else None,
            "edu_level_name": u.student.education_level.name if u.student and u.student.education_level else None,
            "payment_status": u.student.payment_status if u.student else None,
            "status": str(u.status)
        } for u in result["data"]],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"]
    })

@system_user_bp.route("/education-levels/active", methods=["GET"])
def get_active_levels():
    levels = Education_Lvl.get_active_lvl()
    return jsonify({"levels": [{"edu_lvl_id": l.edu_lvl_id, "name": l.name} for l in levels]})

@system_user_bp.route("/students/edit/<int:user_id>", methods=["PUT"])
def edit_student(user_id):
    data = request.json
    user = System_User.query.filter_by(user_id=user_id, type="student").first()
    if not user or not user.student:
        return jsonify({"success": False, "error": "Student not found"}), 404

    new_email = data.get("email", user.email)

    
    if new_email != user.email:
        if System_User.query.filter(System_User.email == new_email, System_User.user_id != user.user_id).first():
            return jsonify({"success": False, "error": "Email already exists"}), 400

    user.email = new_email
    if data.get("password"):
        user.password = generate_password_hash(data["password"])

    edu_lvl_id = data.get("edu_lvl_id")
    if edu_lvl_id:
        edu_level = Education_Lvl.get_by_id(edu_lvl_id, status='1')
        if not edu_level:
            return jsonify({"success": False, "error": "Invalid student level"}), 400
        user.student.edu_lvl_id = edu_lvl_id

    db.session.commit()
    return jsonify({"success": True, "message": "Student updated successfully"})

# ----------------------------------------
# TUTOR
# ----------------------------------------
@system_user_bp.route("/tutors", methods=["GET"])
def get_tutor_list():
    search = request.args.get("search", "")
    status = request.args.get("status", "")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))

    query = (
        System_User.query
        .join(Tutor)
        .filter(System_User.type == "tutor")
    )

    query = apply_filters(query, search, status)
    result = paginate(query, page, per_page)

    return jsonify({
        "success": True,
        "tutors": [{
            "tutor_id": t.tutor.tutor_id if t.tutor else None,
            "user_id": t.user_id,
            "name": t.name,
            "email": t.email,
            "tel_no": t.tutor.tel_no if t.tutor else None,
            "position": t.tutor.position if t.tutor else None,
            "status": str(t.status)
        } for t in result["data"]],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"]
    })


@system_user_bp.route("/tutors/add", methods=["POST"])
def add_tutor():
    data = request.json

    
    if System_User.query.filter_by(email=data["email"]).first():
        return jsonify({"success": False, "error": "Email already exists"}), 400

    try:
        user = System_User(
            name=data["name"],
            email=data["email"],
            password=generate_password_hash(data["password"]),
            ic_no=data.get("ic_no"),
            gender=data.get("gender"),
            dob=data.get("dob"),
            address=data.get("address"),
            status=data.get("status", "1"),
            type="tutor"
        )
        db.session.add(user)
        db.session.commit()

        tutor = Tutor(
            user_id=user.user_id,
            tel_no=data["tel_no"],
            age=data["age"],
            position=data["position"],
            salary=data["salary"]
        )
        db.session.add(tutor)
        db.session.commit()

        return jsonify({"success": True, "message": "Tutor created successfully!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

@system_user_bp.route("/tutors/edit/<int:user_id>", methods=["PUT"])
def edit_tutor(user_id):
    data = request.json
    user = System_User.query.filter_by(user_id=user_id, type="tutor").first()
    if not user:
        return jsonify({"success": False, "error": "Tutor not found"}), 404
    tutor = user.tutor
    if not tutor:
        return jsonify({"success": False, "error": "Tutor details missing"}), 404

    new_email = data.get("email", user.email)

    
    if new_email != user.email:
        if System_User.query.filter(System_User.email == new_email, System_User.user_id != user.user_id).first():
            return jsonify({"success": False, "error": "Email already exists"}), 400

    
    user.name = data.get("name", user.name)
    user.email = new_email
    user.ic_no = data.get("ic_no", user.ic_no)
    user.gender = data.get("gender", user.gender)
    user.address = data.get("address", user.address)
    user.status = data.get("status", user.status)

    
    tutor.tel_no = data.get("tel_no", tutor.tel_no)
    tutor.position = data.get("position", tutor.position)

    db.session.commit()
    return jsonify({"success": True, "message": "Tutor updated successfully"})

@system_user_bp.route("/tutors/<int:user_id>", methods=["GET"])
def get_tutor(user_id):
    user = System_User.query.filter_by(user_id=user_id, type="tutor").first()
    if not user or not user.tutor:
        return jsonify({"success": False, "error": "Tutor not found"}), 404

    t = user.tutor
    return jsonify({
        "success": True,
        "tutor": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "ic_no": user.ic_no,
            "gender": user.gender,
            "dob": user.dob.strftime("%Y-%m-%d") if user.dob else None,
            "address": user.address,
            "tel_no": t.tel_no,
            "age": t.age,
            "position": t.position,
            "salary": float(t.salary),
            "status": user.status
        }
    })


@system_user_bp.route("/update-status/<int:user_id>", methods=["PUT"])
def update_user_status(user_id):
    data = request.json
    new_status = data.get("status")  

    user = System_User.get_by_id(user_id)
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    user.status = new_status
    db.session.commit()

    return jsonify({"success": True, "message": "Status updated"})


@system_user_bp.route("/update/<int:user_id>", methods=["PUT"])
def update_user_details(user_id):
    data = request.json
    user = System_User.get_by_id(user_id)

    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    user.name = data.get("name", user.name)
    user.email = data.get("email", user.email)
    user.ic_no = data.get("ic_no", user.ic_no)
    user.gender = data.get("gender", user.gender)
    user.address = data.get("address", user.address)

    db.session.commit()

    return jsonify({"success": True, "message": "User updated successfully"})

