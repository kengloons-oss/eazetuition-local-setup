# controllers/attendance_controller.py

from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from datetime import datetime, timedelta
from models import db
from models.attendance_model import Attendance
from models.class_session_model import Class_Session
from models.class_enrollment_model import Class_Enrollment
from models.class_detail_model import Class_Detail
from models.class_model import Class
from models.subject_model import Subject
from models.student_model import Student
from models.tutor_model import Tutor
from models.system_user_model import System_User
from models.time_schedule_model import Time_Schedule, Room
import random, string
from sqlalchemy import cast, Integer

attendance_bp = Blueprint('attendance_bp', __name__)

#Student Part

@attendance_bp.route("/mark_attendance", methods=["POST"])
def mark_attendance():
    data = request.get_json()
    student_id = data.get("student_id") or data.get("user_id")
    schedule_id = data.get("schedule_id")
    attendance_code = data.get("attendance_code") or data.get("code")

    if not all([student_id, schedule_id, attendance_code]):
        return jsonify({"success": False, "message": "Missing fields"}), 400

    student = Student.query.filter_by(user_id=student_id).first()
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    schedule = Time_Schedule.query.filter(
        Time_Schedule.schedule_id == schedule_id,
        Time_Schedule.status.in_(["1", "2", "3"])
    ).first()

    if not schedule:
        return jsonify({"success": False, "message": "Invalid schedule"}), 404

    enrollment = Class_Enrollment.query.filter_by(
        student_id=student.student_id,
        class_detail_id=schedule.class_detail_id,
        status='1'
    ).first()
    if not enrollment:
        return jsonify({"success": False, "message": "Not enrolled"}), 403

    now = datetime.now()
    session = Class_Session.query.filter(
        Class_Session.schedule_id == schedule_id,
        Class_Session.schedule_datetime <= now
    ).order_by(Class_Session.schedule_datetime.desc()).first()
    if not session:
        return jsonify({"success": False, "message": "No active session"}), 404

    if session.attendance_code != attendance_code:
        return jsonify({"success": False, "message": "Invalid code"}), 400

    if session.code_expiry_datetime and now > session.code_expiry_datetime:
        return jsonify({"success": False, "message": "Code expired"}), 400

    existing = Attendance.query.filter_by(student_id=student.student_id, session_id=session.session_id).first()
    if existing:
        return jsonify({"success": False, "message": "Already marked"}), 400

    attendance = Attendance(student_id=student.student_id, session_id=session.session_id, attendance_time=now, status="present")
    db.session.add(attendance)
    db.session.commit()
    return jsonify({"success": True, "message": "Attendance marked successfully"})

@attendance_bp.route("/get_student_classes/<int:user_id>", methods=["GET"])
def get_student_classes(user_id):
    try:
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({"message": "No student found"}), 404

        student_id = student.student_id
        now = datetime.now()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
        today_end = today_start + timedelta(days=1)

        # Fetch schedules for today only
        rows = (
            db.session.query(
                Time_Schedule.schedule_id,
                Time_Schedule.start_datetime,
                Time_Schedule.end_datetime,
                Class.class_id,
                Class.class_type,
                Class.status.label("class_status"),
                Subject.name.label("subject_name"),
                System_User.name.label("tutor_name"),
                Class_Detail.class_detail_id
            )
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Tutor, Class.tutor_id == Tutor.tutor_id)
            .join(System_User, Tutor.user_id == System_User.user_id)
            .join(Class_Enrollment, Class_Enrollment.class_detail_id == Class_Detail.class_detail_id)
            .filter(Class_Enrollment.student_id == student_id)
            .filter(Time_Schedule.status.in_(["1", "2", "3"]))
            .filter(Class.status == "1")
            .filter(Class_Enrollment.status == "1")
            .filter(Time_Schedule.start_datetime >= today_start)
            .filter(Time_Schedule.start_datetime < today_end)
            .order_by(Time_Schedule.start_datetime.asc())
            .all()
        )

        if not rows:
            return jsonify({"message": "No classes found for today"}), 404

        # Remove duplicate schedules
        seen = set()
        classes_today = []

        for r in rows:
            if r.schedule_id in seen:
                continue
            seen.add(r.schedule_id)

            class_info = {
                "class_detail_id": r.class_detail_id,
                "class_id": r.class_id,
                "schedule_id": r.schedule_id,
                "subject_name": r.subject_name,
                "tutor_name": r.tutor_name,
                "class_type": r.class_type,
                "status": str(r.class_status),
                "start_datetime": r.start_datetime.isoformat(),
                "end_datetime": r.end_datetime.isoformat(),
                "day_of_week": r.start_datetime.strftime("%A")
            }
            classes_today.append(class_info)

        return jsonify({"student_id": student_id, "classes": classes_today}), 200

    except Exception as e:
        db.session.rollback()
        print("❌ Error fetching today's classes:", e)
        return jsonify({"error": "Failed to fetch today's classes"}), 500

@attendance_bp.route("/class_detail/<int:class_detail_id>", methods=["GET"])
def get_class_detail(class_detail_id):
    try:
        from models.class_model import Class
        from models.subject_model import Subject
        from models.tutor_model import Tutor
        from models.system_user_model import System_User
        from models.time_schedule_model import Time_Schedule, Room

        class_detail = (
            db.session.query(Class_Detail)
            .join(Class, Class.class_id == Class_Detail.class_id)
            .join(Subject, Subject.subject_id == Class.subject_id)
            .join(Tutor, Tutor.tutor_id == Class.tutor_id)
            .join(System_User, System_User.user_id == Tutor.user_id)
            .outerjoin(Time_Schedule, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .outerjoin(Room, Room.room_id == Time_Schedule.room_id)
            .filter(Class_Detail.class_detail_id == class_detail_id)
            .first()
        )

        if not class_detail:
            return jsonify({"message": "Class detail not found"}), 404

        cls = class_detail.class_
        tutor = cls.tutor.user
        subject = cls.subject

        first_schedule = class_detail.time_schedules[0] if class_detail.time_schedules else None
        room_name = first_schedule.room.name if first_schedule and first_schedule.room else None
        schedule_id = first_schedule.schedule_id if first_schedule else None


        data = {
            "class_detail_id": class_detail.class_detail_id,
            "class_id": cls.class_id,
            "schedule_id": schedule_id,    
            "subject": subject.name if subject else None,
            "tutor": tutor.name if tutor else None,
            "day_of_week": class_detail.day_of_week,
            "start_time": str(class_detail.start_time),
            "end_time": str(class_detail.end_time),
            "room": room_name or "Unassigned",
            "status": class_detail.status,
        }

        return jsonify(data), 200

    except Exception as e:
        print("❌ Error fetching class detail:", e)
        db.session.rollback()
        return jsonify({"error": "Failed to fetch class detail"}), 500
    

#Tutor
#1）generate OTP for each class session when the class time is coming 
#2) show the class that belong to tutor 
#3）show the student list each of the class enrolled to check which absent which 
@attendance_bp.route('/api/tutor/classes/<int:tutor_id>', methods=['GET'])
def get_tutor_classes(tutor_id):
    try:
        print(f"📚 Fetching classes for tutor_id = {tutor_id}")

        
        tutor = Tutor.query.filter_by(user_id=tutor_id).first()
        if not tutor:
            return jsonify({"error": f"Tutor with user_id {tutor_id} not found"}), 404

        
        classes = Class.query.filter_by(tutor_id=tutor.tutor_id).all()
        if not classes:
            return jsonify({"message": "No classes found for this tutor."}), 404

        print(f"📌 Tutor {tutor.tutor_id} has {len(classes)} class(es).")

        class_list = []

        for c in classes:
            subject = c.subject
            
            for detail in c.class_details:
               
                for schedule in detail.time_schedules:
                    
                    if schedule.class_sessions:
                        for session in schedule.class_sessions:
                            class_list.append({
                                "class_id": c.class_id,
                                "session_id": session.session_id,
                                "subject_name": subject.name if subject else "Unknown",
                                "start_datetime": schedule.start_datetime.isoformat(),
                                "end_datetime": schedule.end_datetime.isoformat(),
                                "location": schedule.room.name if schedule.room else "TBD",
                                "otp": getattr(c, "otp", None)
                            })
                    else:
                        
                        class_list.append({
                            "class_id": c.class_id,
                            "session_id": None,
                            "subject_name": subject.name if subject else "Unknown",
                            "start_datetime": schedule.start_datetime.isoformat(),
                            "end_datetime": schedule.end_datetime.isoformat(),
                            "location": schedule.room.name if schedule.room else "TBD",
                            "otp": getattr(c, "otp", None)
                        })

        now = datetime.now()
        class_list.sort(
            key=lambda x: (
                0 if datetime.fromisoformat(x["start_datetime"]) >= now else 1,  # future = 0, past = 1
                datetime.fromisoformat(x["start_datetime"])
            )
        )

        return jsonify(class_list), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@attendance_bp.route('/api/tutor/generate_otp/<int:session_id>', methods=['POST'])
def generate_session_otp(session_id):
    try:
        
        session = Class_Session.query.filter_by(session_id=session_id).first()
        if not session:
            return jsonify({"error": "Class session not found"}), 404

        
        schedule = Time_Schedule.query.filter_by(schedule_id=session.schedule_id).first()
        if not schedule:
            return jsonify({"error": "Related schedule not found"}), 404

        now = datetime.now()

        
        if now < schedule.start_datetime:
            return jsonify({
                "error": f"Class has not started yet. OTP can only be generated after {schedule.start_datetime.strftime('%Y-%m-%d %H:%M:%S')}."
            }), 400
        if now > schedule.end_datetime:
            return jsonify({
                "error": f"Class has already ended. OTP cannot be generated after {schedule.end_datetime.strftime('%Y-%m-%d %H:%M:%S')}."
            }), 400

        
        if session.attendance_code and session.code_expiry_datetime and session.code_expiry_datetime > now:
            remaining = int((session.code_expiry_datetime - now).total_seconds() // 60)
            return jsonify({
                "error": f"An OTP has already been generated. Please wait {remaining} more minutes before regenerating."
            }), 400

        
        otp = str(random.randint(100000, 999999))
        expiry_time = now + timedelta(minutes=15)

        session.attendance_code = otp
        session.code_expiry_datetime = expiry_time
        db.session.commit()

        return jsonify({
            "message": "OTP generated successfully",
            "session_id": session.session_id,
            "attendance_code": otp,
            "expires_at": expiry_time.strftime("%Y-%m-%d %H:%M:%S")
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@attendance_bp.route('/api/tutor/class_attendance/<int:session_id>', methods=['GET'])
def get_class_attendance(session_id):
    try:
        
        class_session = Class_Session.query.get(session_id)
        if not class_session:
            return jsonify({"message": "Session not found."}), 404

        
        class_detail = class_session.time_schedule.class_detail if class_session.time_schedule else None
        if not class_detail or not class_detail.class_:
            return jsonify({"message": "No class found for this session."}), 404

        class_id = class_detail.class_.class_id

        
        enrollments = (
            db.session.query(Class_Enrollment)
            .join(Student)
            .join(System_User)
            .join(Class_Detail, Class_Enrollment.class_detail_id == Class_Detail.class_detail_id)
            .filter(Class_Detail.class_id == class_id)
            .filter(Class_Enrollment.status == '1')
            .all()
        )

        if not enrollments:
            return jsonify({"message": "No students enrolled in this class."}), 404

        
        attendance_records = (
            db.session.query(Attendance)
            .filter(Attendance.session_id == session_id)
            .all()
        )

        attendance_map = {a.student_id: a for a in attendance_records}

        
        result = []
        for enrollment in enrollments:
            student = enrollment.student
            student_name = student.user.name
            record = attendance_map.get(student.student_id)

            if record:
                result.append({
                    "student_id": student.student_id,
                    "student_name": student_name,
                    "status": record.status,
                    "attendance_time": record.attendance_time.strftime("%Y-%m-%d %H:%M"),
                })
            else:
                result.append({
                    "student_id": student.student_id,
                    "student_name": student_name,
                    "status": "Absent",
                    "attendance_time": None,
                })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
