# controllers/student_controller.py
from flask import Blueprint, jsonify, current_app
from models.student_model import Student

student_bp = Blueprint("student", __name__, url_prefix="/student")

#======================================================
# 🔹 Get all students by parent_id (for parent mobile)
# ======================================================
@student_bp.route("/<int:parent_id>/students", methods=["GET"])
def get_students_by_parent(parent_id):
    try:
        students = Student.get_by_parent_id(parent_id)
        serialized = [Student.serialize(s) for s in students]
        return jsonify(serialized), 200

    except Exception as e:
        current_app.logger.error(
            f"❌ Error fetching students by parent_id {parent_id}: {e}", exc_info=True
        )
        return jsonify({"error": "Failed to fetch students"}), 500



# ======================================================
# 🔹 Get single student by ID (for mobile student profile)
# ======================================================
@student_bp.route("/<int:student_id>", methods=["GET"])
def get_student_by_id(student_id):
    try:
        student = Student.get_by_id(student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        return jsonify(Student.serialize(student)), 200
    except Exception as e:
        current_app.logger.error(f"❌ Error fetching student by id {student_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch student"}), 500
