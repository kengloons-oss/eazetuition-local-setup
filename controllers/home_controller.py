from flask import request, jsonify, Blueprint
from datetime import datetime
from models import db
from models.attendance_model import Attendance
from models.student_model import Student
from models.class_model import Class
from models.class_session_model import Class_Session
from models.class_enrollment_model import Class_Enrollment
from models.time_schedule_model import Time_Schedule
from models.class_detail_model import Class_Detail
from models.subject_model import Subject
from models.system_user_model import System_User
from models.tutor_model import Tutor
from models.time_schedule_model import Room

home_bp = Blueprint("home_bp", __name__)

#Student Part
@home_bp.route("/upcomingClass", methods=["GET"])
def upcomingClass():
    user_id = request.args.get("student_id")
    if not user_id:
        return jsonify({"error": "student_id is required"}), 400
    
    
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify([]), 200

    student_id = student.student_id
    now = datetime.now()

    
    student_enrollments = Class_Enrollment.query.filter_by(student_id=student_id).all()
    class_detail_ids = [e.class_detail_id for e in student_enrollments]

    if not class_detail_ids:
        return jsonify([]), 200

    upcoming_list = []

    for cdid in class_detail_ids:
        schedule = (
            Time_Schedule.query
            .filter(Time_Schedule.class_detail_id == cdid)
            .filter(Time_Schedule.start_datetime > now)
            .order_by(Time_Schedule.start_datetime.asc())
            .first()
        )

        if schedule:
            class_detail = schedule.class_detail
            if not class_detail:
                continue

            class_obj = class_detail.class_      
            subject = class_obj.subject if class_obj else None
            tutor = class_obj.tutor if class_obj else None
            tutor_user = tutor.user if tutor else None
            room = schedule.room

            upcoming_list.append({
                "class_detail_id": cdid,
                "subject": subject.name if subject else None,
                "tutor": tutor_user.name if tutor_user else None,
                "start_datetime": schedule.start_datetime.isoformat(),
                "end_datetime": schedule.end_datetime.isoformat(),
                "room": room.name if room else None
            })
    upcoming_list = sorted(upcoming_list, key=lambda x: x["start_datetime"])
    return jsonify(upcoming_list), 200

@home_bp.route("/calendarClasses", methods=["GET"])
def calendarClasses():
    user_id = request.args.get("student_id")
    if not user_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify([]), 200

    student_id = student.student_id
    now = datetime.now()

    student_enrollments = Class_Enrollment.query.filter_by(student_id=student_id).all()
    class_detail_ids = [e.class_detail_id for e in student_enrollments]

    if not class_detail_ids:
        return jsonify([]), 200

    classes_list = []

    for cdid in class_detail_ids:
        schedules = (
            Time_Schedule.query
            .filter(Time_Schedule.class_detail_id == cdid)
            .order_by(Time_Schedule.start_datetime.asc())
            .all()
        )

        for schedule in schedules:
            class_detail = schedule.class_detail
            class_obj = class_detail.class_ if class_detail else None
            subject = class_obj.subject.name if class_obj and class_obj.subject else None
            tutor = class_obj.tutor.user.name if class_obj and class_obj.tutor and class_obj.tutor.user else None
            room = schedule.room.name if schedule.room else None

            if now < schedule.start_datetime:
                class_status = "upcoming"
            elif schedule.start_datetime <= now <= schedule.end_datetime:
                class_status = "ongoing"
            else:  
                any_attendance = (
                    Class_Session.query
                    .join(Attendance)
                    .filter(
                        Class_Session.schedule_id == schedule.schedule_id,
                        Attendance.student_id == student_id
                    )
                    .first()
                )
                class_status = "attended" if any_attendance else "absent"
            
            classes_list.append({
                "class_detail_id": cdid,
                "schedule_id": schedule.schedule_id,
                "subject": subject,
                "tutor": tutor,
                "start_datetime": schedule.start_datetime.isoformat(),
                "end_datetime": schedule.end_datetime.isoformat(),
                "room": room,
                "status": class_status
            })

    return jsonify(classes_list), 200



# ---------------------------
# Tutor Upcoming Classes
# ---------------------------
@home_bp.route("/tutor/upcomingClass", methods=["GET"])
def tutor_upcoming_class():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = System_User.query.filter_by(user_id=user_id, type="tutor").first()
    if not user or not user.tutor:
        return jsonify([]), 200

    tutor_id = user.tutor.tutor_id
    now = datetime.now()
    upcoming_list = []

    # Fetch schedules via explicit joins
    schedules = (
        Time_Schedule.query
        .join(Class_Detail)
        .join(Class)
        .filter(Class.tutor_id == tutor_id)
        .filter(Time_Schedule.start_datetime > now)
        .order_by(Time_Schedule.start_datetime.asc())
        .all()
    )

    for schedule in schedules:
        class_detail = schedule.class_detail
        class_obj = class_detail.class_ if class_detail else None
        subject = class_obj.subject if class_obj else None
        room = schedule.room

        upcoming_list.append({
            "class_detail_id": class_detail.class_detail_id if class_detail else None,
            "subject": subject.name if subject else None,
            "start_datetime": schedule.start_datetime.isoformat(),
            "end_datetime": schedule.end_datetime.isoformat(),
            "room": room.name if room else None
        })

    return jsonify(upcoming_list), 200


# ---------------------------
# Tutor Calendar Classes
# ---------------------------
@home_bp.route("/tutor/calendarClasses", methods=["GET"])
def tutor_calendar_classes():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = System_User.query.filter_by(user_id=user_id, type="tutor").first()
    if not user or not user.tutor:
        return jsonify([]), 200

    tutor_id = user.tutor.tutor_id
    now = datetime.now()
    classes_list = []

    # Fetch all schedules for tutor
    schedules = (
        Time_Schedule.query
        .join(Class_Detail)
        .join(Class)
        .filter(Class.tutor_id == tutor_id)
        .order_by(Time_Schedule.start_datetime.asc())
        .all()
    )

    for schedule in schedules:
        class_detail = schedule.class_detail
        class_obj = class_detail.class_ if class_detail else None
        subject = class_obj.subject if class_obj else None
        room = schedule.room

        if schedule.end_datetime < now:
            class_status = "attended"
        elif schedule.start_datetime <= now <= schedule.end_datetime:
            class_status = "ongoing"
        else:
            class_status = "upcoming"

        classes_list.append({
            "class_detail_id": class_detail.class_detail_id if class_detail else None,
            "schedule_id": schedule.schedule_id,
            "subject": subject.name if subject else None,
            "start_datetime": schedule.start_datetime.isoformat(),
            "end_datetime": schedule.end_datetime.isoformat(),
            "room": room.name if room else None,
            "status": class_status
        })

    return jsonify(classes_list), 200