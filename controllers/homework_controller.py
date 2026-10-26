# controllers/homework_controller.py
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from datetime import datetime
from flask import send_file, abort
import os
import re
# AI Part
import openai
from openai import OpenAI
import json
from docx import Document
import PyPDF2
from datetime import datetime
import mimetypes
import pytesseract
from PIL import Image
from models import db
from models.homework_model import Homework
from models.submission_model import Submission
from models.evaluation_metrics_model import Evaluation_Metrics
from models.student_model import Student
from models.tutor_model import Tutor
from models.class_model import Class
from models.class_enrollment_model import Class_Enrollment
from models.class_detail_model import  Class_Detail
from werkzeug.utils import secure_filename

homework_bp = Blueprint("homework_bp", __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads", "homework")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
client = OpenAI() if os.getenv("OPENAI_API_KEY") else None
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------------
# TUTOR ENDPOINTS
# -----------------------------
@homework_bp.route("/tutor/homework/create", methods=["POST"])
def create_homework():
    data = request.json
    user_id = data.get("user_id")  
    class_id = data.get("class_id")
    homework_subject = data.get("homework_subject")
    description = data.get("description", "")
    due_date_str = data.get("due_date")  

    if not all([user_id, class_id, homework_subject, due_date_str]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400


    tutor = Tutor.query.filter_by(user_id=user_id).first()
    if not tutor:
        return jsonify({"success": False, "message": "Tutor not found"}), 404
    tutor_id = tutor.tutor_id

    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid due_date format"}), 400

    hw = Homework(
        homework_subject=homework_subject,
        description=description,
        due_date=due_date,
        create_by=tutor_id,  
        class_id=class_id
    )
    db.session.add(hw)
    db.session.commit()

    return jsonify({"success": True, "homework_id": hw.homework_id})

@homework_bp.route("/tutor/<int:user_id>/classes", methods=["GET"])
def get_tutor_classes(user_id):


    tutor = Tutor.query.filter_by(user_id=user_id).first()
    if not tutor:
        return jsonify({"success": False, "message": "Tutor not found"}), 404

    tutor_id = tutor.tutor_id


    classes = (
        db.session.query(Class_Detail)
        .join(Class, Class_Detail.class_id == Class.class_id)
        .filter(Class.tutor_id == tutor_id)
        .all()
    )

    result = [
        {
            "class_detail_id": c.class_detail_id,
            "class_id": c.class_id,
            "class_name": getattr(c.class_, "class_name", f"Class {c.class_id}"),
            "subject_name": getattr(c.class_.subject, "name", "") if c.class_ else ""
        }
        for c in classes
    ]

    return jsonify({"success": True, "classes": result})

@homework_bp.route("/tutor/<int:user_id>/homeworks", methods=["GET"])
def get_tutor_homeworks(user_id):

    try:
        tutor = Tutor.query.filter_by(user_id=user_id).first()
        if not tutor:
            return jsonify({"success": False, "message": "Tutor not found"}), 404

        tutor_id = tutor.tutor_id

        homeworks = (
            db.session.query(Homework)
            .join(Class, Homework.class_id == Class.class_id)
            .filter(Class.tutor_id == tutor_id)
            .all()
        )

        result = []
        for hw in homeworks:
            class_obj = Class.query.get(hw.class_id)

            total_students = (
                db.session.query(Class_Enrollment)
                .join(Class_Detail, Class_Enrollment.class_detail_id == Class_Detail.class_detail_id)
                .filter(
                    Class_Detail.class_id == hw.class_id,
                    Class_Enrollment.status == '1'
                )
                .count()
            )

            total_submissions = len(getattr(hw, 'submissions', []))

            result.append({
                "homework_id": hw.homework_id,
                "homework_subject": getattr(hw, 'homework_subject', f"Homework {hw.homework_id}"),
                "class_id": hw.class_id,
                "class_name": getattr(class_obj, 'class_type', f"Class {hw.class_id}") if class_obj else f"Class {hw.class_id}",
                "due_date": hw.due_date.strftime("%Y-%m-%d") if getattr(hw, 'due_date', None) else None,
                "status": getattr(hw, 'status', "Pending"),
                "total_submissions": total_submissions,
                "total_students": total_students
            })

        return jsonify({"success": True, "homeworks": result})

    except Exception as e:
        db.session.rollback()
        print(f"Error fetching tutor homeworks: {e}")
        return jsonify({"success": False, "message": str(e)})

@homework_bp.route("/tutor/homework/<int:homework_id>/detail", methods=["GET"])
def tutor_homework_detail(homework_id):
    hw = Homework.query.get(homework_id)
    if not hw:
        return jsonify({"success": False, "message": "Homework not found"}), 404


    enrolled_students = Class_Enrollment.query.filter_by(class_detail_id=hw.class_id, status='1').all()
    student_list = []


    submissions_map = {s.student_id: s for s in hw.submissions}

    for enrollment in enrolled_students:
        student = enrollment.student
        submission = submissions_map.get(student.student_id)
        student_list.append({
            "student_id": student.student_id,
            "student_name": student.user.name,
            "submitted": bool(submission),
            "submission_id": submission.submission_id if submission else None,
            "grade": submission.grade if submission else None,
            "feedback_from_tutor": submission.feedback_from_tutor if submission else None,
            "ai_grade": submission.ai_grade if submission else None,
            "feedback_from_ai": submission.feedback_from_ai if submission else None
        })

    return jsonify({
        "success": True,
        "homework": {
            "homework_id": hw.homework_id,
            "homework_subject": hw.homework_subject,
            "description": hw.description,
            "due_date": hw.due_date.strftime("%Y-%m-%d"),
            "students": student_list
        }
    })

@homework_bp.route("/tutor/homework/<int:submission_id>/grade", methods=["POST"])
def grade_homework(submission_id):

    submission = Submission.query.get(submission_id)
    if not submission:
        return jsonify({"success": False, "message": "Submission not found"}), 404

    data = request.json
    grade = data.get("grade")
    feedback = data.get("feedback")

    if grade is not None:
        submission.grade = float(grade)
    if feedback is not None:
        submission.feedback_from_tutor = feedback

    submission.status = "Graded"
    submission.graded_time = datetime.utcnow()

    db.session.commit()
    return jsonify({"success": True, "message": "Submission graded successfully"})

@homework_bp.route("/tutor/homework/<int:submission_id>/download", methods=["GET"])
def download_submission(submission_id):
    submission = Submission.query.get(submission_id)
    if not submission or not submission.extension_file:
        return jsonify({"success": False, "message": "File not found"}), 404

    folder, filename = os.path.split(submission.extension_file)
    return send_from_directory(folder, filename, as_attachment=True)
    

# -----------------------------
# STUDENT ENDPOINTS
# -----------------------------
@homework_bp.route("/student/homework/upload", methods=["POST"])
def upload_homework():
    user_id = request.form.get("user_id")
    homework_id = request.form.get("homework_id")

    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
    
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    student_id = student.student_id

    homework = Homework.query.get(homework_id)
    if not homework:
        return jsonify({"success": False, "message": "Homework not found"}), 404

    now = datetime.utcnow().date()
    due_date = homework.due_date

    upload_status = "Pending"
    if now > due_date:
        upload_status = "Late"

    filename = secure_filename(file.filename)
    student_folder = os.path.join(UPLOAD_FOLDER, str(student_id))
    os.makedirs(student_folder, exist_ok=True)
    filepath = os.path.join(student_folder, filename)
    file.save(filepath)

    submission = Submission(
        student_id=student_id,
        homework_id=homework_id,
        extension_file=filepath,
        upload_time=datetime.utcnow(),
        status=upload_status  
    )
    db.session.add(submission)
    db.session.commit()


    #evaluate_homework_ai(submission.submission_id)

    return jsonify({"success": True, "submission_id": submission.submission_id})
    
@homework_bp.route("/student/homework/<int:user_id>/list", methods=["GET"])
def get_student_homework(user_id):
    
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"homeworks": []}), 200

    student_id = student.student_id

    
    enrollments = Class_Enrollment.query.filter_by(student_id=student_id, status='1').all()
    class_ids = []
    for enroll in enrollments:
        if enroll.class_detail and enroll.class_detail.class_:
            class_ids.append(enroll.class_detail.class_.class_id)

   
    class_ids = list(set(class_ids))

    
    homeworks = Homework.query.filter(Homework.class_id.in_(class_ids)).all()

    result = []
    for hw in homeworks:
        
        submission = Submission.query.filter_by(student_id=student_id, homework_id=hw.homework_id).first()
        result.append({
            "homework_id": hw.homework_id,
            "homework_subject": hw.homework_subject,
            "due_date": hw.due_date.strftime("%Y-%m-%d"),
            "status": submission.status if submission else "Not Submitted",
            "grade": submission.grade if submission else None,
            "feedback_from_tutor": submission.feedback_from_tutor if submission else None,
            "feedback_from_ai": submission.feedback_from_ai if submission else None
        })

    return jsonify({"success": True, "homeworks": result})

@homework_bp.route("/student/homework/<int:user_id>/detail/<int:homework_id>", methods=["GET"])
def get_homework_detail(user_id, homework_id):
    
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    student_id = student.student_id

    
    hw = Homework.query.filter_by(homework_id=homework_id).first()
    if not hw:
        return jsonify({"success": False, "message": "Homework not found"}), 404

    
    submission = Submission.query.filter_by(student_id=student_id, homework_id=hw.homework_id).first()

    result = {
        "homework_id": hw.homework_id,
        "homework_subject": hw.homework_subject,
        "description": getattr(hw, "description", None),
        "due_date": hw.due_date.strftime("%Y-%m-%d"),
        "status": submission.status if submission else "Not Submitted",
        "grade": submission.grade if submission else None,
        "ai_grade": submission.ai_grade if submission else None, 
        "feedback_from_tutor": submission.feedback_from_tutor if submission else None,
        "feedback_from_ai": submission.feedback_from_ai if submission else None,
        "submission_id": submission.submission_id if submission else None
    }

    return jsonify({"success": True, "homework": result})

@homework_bp.route("/student/homework/<int:submission_id>/download", methods=["GET"])
def download_homework(submission_id):
    submission = Submission.query.get(submission_id)
    if not submission or not submission.extension_file:
        return jsonify({"success": False, "message": "File not found"}), 404

    folder, filename = os.path.split(submission.extension_file)
    return send_from_directory(folder, filename, as_attachment=True)

def read_file_content(filepath):
    ext = filepath.split('.')[-1].lower()
    
    try:
        if ext == "txt":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        
        elif ext == "pdf":
            text = ""
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return text
        
        elif ext == "docx":
            doc = Document(filepath)
            return "\n".join([p.text for p in doc.paragraphs])
        
        elif ext in ["jpg", "jpeg", "png"]:
            
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
            return text.strip() 
        
        else:
            print(f"⚠ Unsupported file type: {ext}")
            return None

    except Exception as e:
        print(f"⚠ Error reading file {filepath}: {e}")
        return None

def evaluate_homework_ai(submission_id):
    submission = Submission.query.get(submission_id)
    if not submission or not submission.extension_file:
        print("⚠ No submission or file found for AI evaluation.")
        return

    try:
        
        student_text = read_file_content(submission.extension_file)

        if not student_text:
            submission.feedback_from_ai = "⚠ Unable to read submission file."
            submission.status = "Evaluated"
            db.session.commit()
            return

        
        subject = submission.homework.homework_subject.lower()

        if "math" in subject:
            ai_grade, ai_feedback = evaluate_math_homework(student_text)
        else:
            
            prompt = f"""
            You are an AI homework evaluator.
            Evaluate the following student submission for the subject: {submission.homework.homework_subject}.

            1. Assign a numeric grade from 0 to 100.
            2. Provide constructive feedback.

            Student submission:
            {student_text}

            Format:
            Grade: <number>
            Feedback: <feedback>
            """

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful AI homework grader."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            ai_response = response.choices[0].message.content.strip()

            grade_match = re.search(r"Grade[:\s]+(\d+\.?\d*)", ai_response)
            feedback_match = re.search(r"Feedback[:\s]+(.+)", ai_response, re.DOTALL)

            ai_grade = float(grade_match.group(1)) if grade_match else None
            ai_feedback = feedback_match.group(1).strip() if feedback_match else ai_response

        
        submission.ai_grade = ai_grade
        submission.feedback_from_ai = ai_feedback
        submission.status = "Evaluated"
        submission.graded_time = datetime.utcnow()

        
        metrics = Evaluation_Metrics(
            homework_id=submission.homework_id,
            homework_subject=submission.homework.homework_subject,
            comment=ai_feedback,
            extension_file=submission.extension_file
        )
        db.session.add(metrics)
        db.session.commit()

        print(f"✅ AI evaluation completed for submission {submission_id} (Grade: {ai_grade})")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error evaluating homework AI: {e}")

def evaluate_math_homework(content):
    prompt = f"""
    You are an AI specialized in grading Math homework.

    The student's submission may contain equations, working steps, or final answers.
    
    Evaluate the correctness of the math steps and final answer.

    Return the result EXACTLY in this format:

    Grade: <0-100>
    Feedback: <short constructive feedback>
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a mathematical evaluator."},
            {"role": "user", "content": prompt + "\n\nStudent submission:\n" + content}
        ],
        temperature=0.2,
    )

    text = response.choices[0].message.content.strip()

    grade_match = re.search(r"Grade[: ]+(\d+\.?\d*)", text)
    feedback_match = re.search(r"Feedback[: ]+(.+)", text, re.DOTALL)

    grade = float(grade_match.group(1)) if grade_match else None
    feedback = feedback_match.group(1).strip() if feedback_match else text

    return grade, feedback

@homework_bp.route("/tutor/homework/<int:submission_id>/ai-evaluate", methods=["POST"])
def tutor_trigger_ai_evaluation(submission_id):

    if client is None:
        return jsonify({"success": False, "message": "AI evaluation is unavailable: configure OPENAI_API_KEY."}), 503

    submission = Submission.query.get(submission_id)
    if not submission:
        return jsonify({"success": False, "message": "Submission not found"}), 404

    try:
        evaluate_homework_ai(submission_id)
        return jsonify({"success": True, "message": "AI evaluation triggered successfully"})
    except Exception as e:
        print(f"Error triggering AI evaluation: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
