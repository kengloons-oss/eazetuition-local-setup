from flask import Blueprint, request, jsonify
from models import db
from models.student_model import Student
from models.system_user_model import System_User
from models.evaluation_question_model import EvaluationQuestion
from models.evaluation_test_model import Evaluation_Test
from models.evaluation_answerlog_model import EvaluationAnswerLog
from models.evaluationLevel_model import EvaluationLevel
from models.education_lvl_model import Education_Lvl
from models.student_evaluate_result_model import StudentEvaluationResult
from datetime import datetime

evaluation_bp  = Blueprint("evaluation_bp", __name__)

@evaluation_bp.route("/check_first_test", methods=["GET"])
def check_first_test():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    result = StudentEvaluationResult.query.filter_by(student_id=student_id, test_id=1).first()
    done = result is not None
    return jsonify({"done": done}), 200

@evaluation_bp.route("/testQuestion", methods=["GET"])
def get_questions():
    test_id = int(request.args.get("test_id", 0))

    if not test_id :
        return jsonify({"error": "test_id is required"}), 400
    
    question = EvaluationQuestion.query.filter_by(test_id=test_id).all()
    
    if not question:
        return jsonify({"error": "Question Not Found"}), 404

    question_list = []
    for q in question:
        question_list.append({
            "question_id": q.question_id,
            "question_text": q.question_text,
            "options": {
                "A": q.option_a,
                "B": q.option_b,
                "C": q.option_c,
                "D": q.option_d
            }
        })
    
    return jsonify({
        "test_id": test_id,
        "questions": question_list
    }), 200

@evaluation_bp.route("/submit", methods=["POST"])
def submit_test():
    data = request.get_json()

    student_id = data.get("student_id")
    test_id = data.get("test_id")
    answers = data.get("answers")

    if not all([student_id, test_id, answers]):
        return jsonify({"error": "Missing required fields"}), 400
    
    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student is required"}), 404

    # ----------------------
    # Calculate score
    # ----------------------
    totalQuestion = len(answers)
    correct_answer = 0

    for ans in answers:
        question = EvaluationQuestion.query.filter_by(question_id=ans["question_id"]).first()
        if question and question.correct_answer == ans["selected_answer"]:
            correct_answer += 1

    score_percent = (correct_answer / totalQuestion) * 100

    # ----------------------
    # First-time welcome test logic
    # ----------------------
    if student.edu_lvl_id == 1:
        if score_percent <= 10:
            edu_lvl_id = 2
        elif score_percent <= 20:
            edu_lvl_id = 3
        elif score_percent <= 30:
            edu_lvl_id = 4
        elif score_percent <= 50:
            edu_lvl_id = 5
        elif score_percent <= 70:
            edu_lvl_id = 6
        elif score_percent <= 84:
            edu_lvl_id = 7
        else:  # 85%-100%
            edu_lvl_id = 8

        student.edu_lvl_id = edu_lvl_id
        db.session.commit()

    # ----------------------
    # Auto-update education level for subsequent tests
    # ----------------------
    else:
        current_level_id = student.edu_lvl_id

        
        if score_percent >= 85 and current_level_id < 12:  
            student.edu_lvl_id = current_level_id + 1
        elif score_percent >= 70 and current_level_id < 12:
            student.edu_lvl_id = current_level_id + 0  

        db.session.commit()

    # ----------------------
    # Record test result
    # ----------------------
    result = StudentEvaluationResult(
        test_id=test_id,
        student_id=student_id,
        score=correct_answer,
        level_name=Education_Lvl.query.get(student.edu_lvl_id).name,
        completed_at=datetime.today()
    )

    db.session.add(result)
    db.session.flush()

    for ans in answers:
        log = EvaluationAnswerLog(
            result_id=result.result_id,
            question_id=ans["question_id"],
            selected_answer=ans["selected_answer"],
            is_correct=EvaluationQuestion.query.get(ans["question_id"]).correct_answer == ans["selected_answer"]
        )
        db.session.add(log)
    
    db.session.commit()

    return jsonify({
        "message": "Test submitted successfully",
        "score": correct_answer,
        "total_questions": totalQuestion,
        "percentage": score_percent,
        "level_name": Education_Lvl.query.get(student.edu_lvl_id).name,
        "edu_lvl_id": student.edu_lvl_id
    }), 200

@evaluation_bp.route("/progress", methods=["GET"])
def get_progress():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    results = StudentEvaluationResult.query.filter_by(student_id=student.student_id)\
                                           .order_by(StudentEvaluationResult.completed_at.asc())\
                                           .all()
    res_list = [{
        "result_id": r.result_id,
        "score": r.score,
        "level_name": r.level_name,
        "completed_at": r.completed_at.strftime("%Y-%m-%d %H:%M:%S")
    } for r in results]

    return jsonify({"results": res_list}), 200

# -----------------------------
# Helper Functions
# -----------------------------
def get_student_by_user_id(user_id: int):
    """Return Student object given system_user.user_id"""
    return Student.query.filter_by(user_id=user_id).first()

def require_student_from_user_id(user_id: int):
    """Return (student, error_response, status)"""
    student = get_student_by_user_id(user_id)
    if not student:
        return None, jsonify({"error": "Student not found"}), 404
    return student, None, None

def calculate_new_education_level(student, score_percent):
    """Determine new education level based on score and current level"""
    current_level = student.edu_lvl_id
    all_tests = Evaluation_Test.query.count()
    completed_tests = StudentEvaluationResult.query.filter_by(student_id=student.student_id).count()
    all_100_tests = StudentEvaluationResult.query.filter_by(student_id=student.student_id, score=100).count()


    if completed_tests == all_tests and all_100_tests == all_tests:
        return 13

    if score_percent >= 80:
        return min(current_level + 1, 12)
    if 50 <= score_percent < 80:
        return current_level
    if score_percent < 50:
        return max(1, current_level - 1)
    return current_level

@evaluation_bp.route("/next_test", methods=["GET"])
def get_next_test():
    user_id = request.args.get("student_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    student, error_response, status = require_student_from_user_id(user_id)
    if error_response:
        return error_response, status

    student_id = student.student_id

    all_tests = Evaluation_Test.query.order_by(Evaluation_Test.test_id.asc()).all()
    completed_test_ids = [r.test_id for r in StudentEvaluationResult.query.filter_by(student_id=student_id).all()]
    pending_tests = [t for t in all_tests if t.test_id not in completed_test_ids]

    if not pending_tests:
        return jsonify({
            "next_test_id": None,
            "done": True,
            "message": "All tests completed! Master Level unlocked.",
            "student_id": student_id
        }), 200

    next_test = pending_tests[0]

    return jsonify({
        "next_test_id": next_test.test_id,
        "done": False,
        "message": f"Next test is Test {next_test.test_id}.",
        "student_id": student_id
    }), 200

@evaluation_bp.route("/testNextQuestion", methods=["GET"])
def get_next_questions():
    test_id = request.args.get("test_id", type=int)
    user_id = request.args.get("student_id", type=int)

    if not test_id or not user_id:
        return jsonify({"error": "student_id and test_id are required"}), 400

    student, error_response, status = require_student_from_user_id(user_id)
    if error_response:
        return error_response, status

    questions = EvaluationQuestion.query.filter_by(test_id=test_id).all()
    if not questions:
        return jsonify({"error": "Questions not found"}), 404

    question_list = [{
        "question_id": q.question_id,
        "question_text": q.question_text,
        "options": {
            "A": q.option_a,
            "B": q.option_b,
            "C": q.option_c,
            "D": q.option_d
        }
    } for q in questions]

    return jsonify({
        "test_id": test_id,
        "questions": question_list
    }), 200

@evaluation_bp.route("/submit_next_test", methods=["POST"])
def submit_next_test():
    data = request.get_json()
    user_id = data.get("user_id")       
    test_id = data.get("test_id")
    answers = data.get("answers")       

    if not user_id or not test_id or answers is None:
        return jsonify({"error": "user_id, test_id, and answers are required"}), 400

    
    student, error_response, status = require_student_from_user_id(user_id)
    if error_response:
        return error_response, status
    student_id = student.student_id

    
    questions = EvaluationQuestion.query.filter_by(test_id=test_id).all()
    if not questions:
        return jsonify({"error": "Questions not found"}), 404

    
    if isinstance(answers, list):
        answers_dict = {str(a["question_id"]): a["selected_answer"] for a in answers}
    else:
        answers_dict = answers

    
    new_result = StudentEvaluationResult(
        test_id=test_id,
        student_id=student_id,
        completed_at=datetime.utcnow()
    )
    db.session.add(new_result)
    db.session.flush()  

    
    total_questions = len(questions)
    correct_count = 0

    for q in questions:
        selected = answers_dict.get(str(q.question_id))
        is_correct = (selected == q.correct_answer)
        if is_correct:
            correct_count += 1

        log = EvaluationAnswerLog(
            result_id=new_result.result_id,
            question_id=q.question_id,
            selected_answer=selected,
            is_correct=is_correct
        )
        db.session.add(log)

    score_percent = round((correct_count / total_questions) * 100)
    new_result.score = correct_count

    
    new_level = calculate_new_education_level(student, score_percent)
    lvl = Education_Lvl.query.filter_by(edu_lvl_id=new_level).first()
    lvl_name = lvl.name if lvl else "Unknown Level"
    new_result.level_name = lvl_name
    student.edu_lvl_id = new_level

    db.session.commit()

    if score_percent < 40:
        return jsonify({
            "success": True,
            "message": "Score too low! Please review before attempting the next test.",
            "score_percent": score_percent,
            "new_level": new_level,
            "new_level_name": lvl_name,
            "next_test_id": None,
            "done": False,
            "blocked": True
        }), 200

    all_tests = Evaluation_Test.query.order_by(Evaluation_Test.test_id.asc()).all()
    completed_test_ids = [
        r.test_id for r in StudentEvaluationResult.query.filter_by(student_id=student_id).all()
    ]
    pending_tests = [t for t in all_tests if t.test_id not in completed_test_ids]

    if not pending_tests:
        return jsonify({
            "success": True,
            "message": "Test submitted successfully. All tests completed!",
            "score_percent": score_percent,
            "new_level": new_level,
            "new_level_name": lvl_name,
            "next_test_id": None,
            "done": True,
            "blocked": False
        }), 200

    next_test = pending_tests[0]

    return jsonify({
        "success": True,
        "message": "Test submitted successfully.",
        "score_percent": score_percent,
        "new_level": new_level,
        "new_level_name": lvl_name,
        "next_test_id": next_test.test_id,
        "done": False,
        "blocked": False
    }), 200
