"""Add idempotent, clearly-labelled demo rows to the local EazeTuition DB.

Run from the project root with the local MySQL service running:
    .venv\\Scripts\\python.exe scripts\\seed_demo_app_data.py

This script never deletes or updates real user data. Demo rows are identified
by titles/descriptions beginning with [DEMO].
"""

from datetime import date, datetime, time, timedelta
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


load_dotenv()
database_uri = os.getenv("DATABASE_URI")
if not database_uri:
    raise SystemExit("DATABASE_URI is missing; configure it in the project .env first.")

engine = create_engine(database_uri, pool_pre_ping=True)


def add_announcement(conn, title, target_role, content):
    if conn.execute(
        text("SELECT 1 FROM announcement WHERE title=:title LIMIT 1"), {"title": title}
    ).first():
        return
    now = datetime.now()
    conn.execute(
        text("""INSERT INTO announcement (title, content, created_at, expiry_at, target_role)
                 VALUES (:title, :content, :created, :expires, :role)"""),
        {
            "title": title,
            "content": content,
            "created": now,
            "expires": now + timedelta(days=90),
            "role": target_role,
        },
    )


with engine.begin() as conn:
    # Recreate the demo 2026 class catalogue on a fresh import of the SQL dump.
    # The dump is an older snapshot and does not include the locally-added 2026
    # package rows, so build the packages/subjects/classes if they are missing.
    tutors = conn.execute(
        text("SELECT tutor_id FROM tutor ORDER BY tutor_id")
    ).scalars().all()
    rooms = conn.execute(
        text("SELECT room_id FROM room WHERE status='1' ORDER BY room_id")
    ).scalars().all()
    if not tutors or not rooms:
        raise SystemExit("The imported DB needs at least one tutor and one active room before demo seeding.")

    levels = conn.execute(
        text("SELECT edu_lvl_id, name FROM education_level WHERE status='1' AND edu_lvl_id BETWEEN 2 AND 12 ORDER BY edu_lvl_id")
    ).mappings().all()
    demo_subject_names = ["Mathematics", "English", "Science", "History"]
    for level in levels:
        subjects = conn.execute(
            text("SELECT subject_id, name FROM subject WHERE edu_lvl_id=:level AND status='1' ORDER BY subject_id"),
            {"level": level["edu_lvl_id"]},
        ).mappings().all()
        if not subjects:
            for subject_name in demo_subject_names:
                conn.execute(
                    text("""INSERT INTO subject
                             (edu_lvl_id, name, description, normal_class_fee, focus_class_fee, material_fee, status)
                             VALUES (:level, :name, :description, 120, 180, 30, '1')"""),
                    {
                        "level": level["edu_lvl_id"],
                        "name": subject_name,
                        "description": "[DEMO] Replace with the official curriculum before real use.",
                    },
                )
            subjects = conn.execute(
                text("SELECT subject_id, name FROM subject WHERE edu_lvl_id=:level AND status='1' ORDER BY subject_id"),
                {"level": level["edu_lvl_id"]},
            ).mappings().all()

        package = conn.execute(
            text("SELECT package_id FROM schedule_package WHERE edu_lvl_id=:level AND year='2026' LIMIT 1"),
            {"level": level["edu_lvl_id"]},
        ).first()
        if package:
            package_id = package[0]
        else:
            package_id = conn.execute(
                text("""INSERT INTO schedule_package
                         (edu_lvl_id, name, year, created_datetime, is_open_for_enrollment, status)
                         VALUES (:level, :name, '2026', NOW(), '1', '1')"""),
                {"level": level["edu_lvl_id"], "name": f"[DEMO] {level['name']} 2026 Class Package"},
            ).lastrowid

        existing_subjects = set(conn.execute(
            text("""SELECT c.subject_id FROM schedule_package_set ss
                     JOIN package_set_detail psd ON psd.set_id=ss.set_id
                     JOIN class_detail cd ON cd.class_detail_id=psd.class_detail_id
                     JOIN class c ON c.class_id=cd.class_id
                     WHERE ss.package_id=:package"""),
            {"package": package_id},
        ).scalars().all())

        for index, subject in enumerate(subjects):
            if subject["subject_id"] in existing_subjects:
                continue
            tutor_id = tutors[(level["edu_lvl_id"] + index - 2) % len(tutors)]
            room_id = rooms[index % len(rooms)]
            class_id = conn.execute(
                text("""INSERT INTO class
                         (tutor_id, subject_id, class_type, time_per_week, duration, is_open_for_schedule, status)
                         VALUES (:tutor, :subject, 'N', 1, 60, '1', '1')"""),
                {"tutor": tutor_id, "subject": subject["subject_id"]},
            ).lastrowid
            weekday = (index % 7) + 1  # Monday=1 ... Sunday=7
            hour = 8 + (index // 7)
            detail_id = conn.execute(
                text("""INSERT INTO class_detail
                         (class_id, day_of_week, start_time, end_time, status)
                         VALUES (:class, :weekday, :start, :end, '1')"""),
                {"class": class_id, "weekday": str(weekday), "start": time(hour, 0), "end": time(hour + 1, 0)},
            ).lastrowid
            set_id = conn.execute(
                text("INSERT INTO schedule_package_set (package_id, name, created_datetime) VALUES (:package, :name, NOW())"),
                {"package": package_id, "name": f"[DEMO] {subject['name']}"},
            ).lastrowid
            conn.execute(
                text("""INSERT INTO package_set_detail (set_id, class_detail_id, room_id, max_capacity)
                         VALUES (:set_id, :detail, :room, 15)"""),
                {"set_id": set_id, "detail": detail_id, "room": room_id},
            )

    # General announcement feed, including role-targeted views.
    for role, title, content in [
        ("all", "[DEMO] Welcome to EazeTuition", "Demo notice: explore the app modules and sample records."),
        ("parent", "[DEMO] Parent portal guide", "Demo notice: review your child's timetable, homework, and payment history."),
        ("student", "[DEMO] Student learning reminder", "Demo notice: check your upcoming classes and submit homework before its due date."),
        ("tutor", "[DEMO] Tutor workspace guide", "Demo notice: review assigned classes and sample homework submissions."),
    ]:
        add_announcement(conn, title, role, content)

    # Prefer Kengloon's existing local demo student (ID 7); on a fresh dump,
    # use the first student assigned to a real education level instead.
    student = conn.execute(
        text("""SELECT student_id, edu_lvl_id FROM student
                 WHERE edu_lvl_id BETWEEN 2 AND 12
                 ORDER BY CASE WHEN student_id=7 THEN 0 ELSE 1 END, student_id LIMIT 1"""),
    ).mappings().first()
    demo_student_id = student["student_id"] if student else None
    demo_homework_id = None
    if student:
        offering = conn.execute(
            text("""SELECT p.package_id, ss.set_id, psd.class_detail_id, cd.class_id,
                          cd.day_of_week, cd.start_time, cd.end_time, psd.room_id,
                          c.tutor_id, sub.name AS subject_name
                   FROM schedule_package p
                   JOIN schedule_package_set ss ON ss.package_id=p.package_id
                   JOIN package_set_detail psd ON psd.set_id=ss.set_id
                   JOIN class_detail cd ON cd.class_detail_id=psd.class_detail_id
                   JOIN class c ON c.class_id=cd.class_id
                   JOIN subject sub ON sub.subject_id=c.subject_id
                   WHERE p.edu_lvl_id=:level AND p.year='2026' AND p.status='1'
                     AND p.is_open_for_enrollment='1' AND c.status='1' AND cd.status='1'
                   ORDER BY p.package_id, ss.set_id LIMIT 1"""),
            {"level": student["edu_lvl_id"]},
        ).mappings().first()

        if offering:
            enrollment = conn.execute(
                text("""SELECT class_enrollment_id FROM class_enrollment
                         WHERE student_id=:student AND class_detail_id=:detail AND status='1'"""),
                {"student": demo_student_id, "detail": offering["class_detail_id"]},
            ).first()
            if not enrollment:
                conn.execute(
                    text("""INSERT INTO class_enrollment
                             (student_id, set_id, class_detail_id, enroll_datetime, status)
                             VALUES (:student, :set_id, :detail, NOW(), '1')"""),
                    {"student": demo_student_id, "set_id": offering["set_id"], "detail": offering["class_detail_id"]},
                )

            # A small dated sample schedule: one completed session and one
            # upcoming session using the offering's actual weekday/time/room.
            day_no = int(offering["day_of_week"])
            weekday = (day_no - 1) % 7  # local seed uses Monday=1 ... Sunday=7
            start_t = offering["start_time"]
            end_t = offering["end_time"]
            if isinstance(start_t, timedelta):
                start_t = (datetime.min + start_t).time()
            if isinstance(end_t, timedelta):
                end_t = (datetime.min + end_t).time()
            for is_upcoming in (False, True):
                base = date.today() + timedelta(days=(7 if is_upcoming else -7))
                target = base + timedelta(days=(weekday - base.weekday()) % 7)
                start_dt = datetime.combine(target, start_t)
                end_dt = datetime.combine(target, end_t)
                schedule = conn.execute(
                    text("""SELECT schedule_id FROM time_schedule
                             WHERE class_detail_id=:detail AND set_id=:set_id
                               AND start_datetime=:start_dt LIMIT 1"""),
                    {"detail": offering["class_detail_id"], "set_id": offering["set_id"], "start_dt": start_dt},
                ).first()
                if not schedule:
                    schedule_id = conn.execute(
                        text("""INSERT INTO time_schedule
                                 (class_detail_id, set_id, room_id, start_datetime, end_datetime,
                                  type, student_enroll, status)
                                 VALUES (:detail, :set_id, :room, :start_dt, :end_dt, '1', 1, :status)"""),
                        {
                            "detail": offering["class_detail_id"],
                            "set_id": offering["set_id"],
                            "room": offering["room_id"],
                            "start_dt": start_dt,
                            "end_dt": end_dt,
                            "status": "3" if not is_upcoming else "1",
                        },
                    ).lastrowid
                else:
                    schedule_id = schedule[0]
                session = conn.execute(
                    text("SELECT session_id FROM class_session WHERE schedule_id=:schedule"),
                    {"schedule": schedule_id},
                ).first()
                if not session:
                    session_id = conn.execute(
                        text("""INSERT INTO class_session
                                 (schedule_id, schedule_datetime, attendance_code, code_expiry_datetime)
                                 VALUES (:schedule, :when, NULL, NULL)"""),
                        {"schedule": schedule_id, "when": start_dt},
                    ).lastrowid
                else:
                    session_id = session[0]
                if not is_upcoming and not conn.execute(
                    text("SELECT 1 FROM attendance WHERE student_id=:student AND session_id=:session"),
                    {"student": demo_student_id, "session": session_id},
                ).first():
                    conn.execute(
                        text("""INSERT INTO attendance (student_id, session_id, attendance_time, status)
                                 VALUES (:student, :session, :when, '1')"""),
                        {"student": demo_student_id, "session": session_id, "when": start_dt},
                    )

            # Homework is attached to the enrolled sample class. Keep one
            # pending submission so both student and tutor views have content.
            homework_title = f"[DEMO] {offering['subject_name']} practice"
            homework = conn.execute(
                text("SELECT homework_id FROM homework WHERE homework_subject=:title AND class_id=:class_id"),
                {"title": homework_title, "class_id": offering["class_id"]},
            ).first()
            if not homework:
                demo_homework_id = conn.execute(
                    text("""INSERT INTO homework
                             (homework_subject, due_date, create_by, class_id, description)
                             VALUES (:title, :due, :tutor, :class_id, :description)"""),
                    {
                        "title": homework_title,
                        "due": date.today() + timedelta(days=7),
                        "tutor": offering["tutor_id"],
                        "class_id": offering["class_id"],
                        "description": "Demo assignment only: answer five practice questions and upload your work.",
                    },
                ).lastrowid
            else:
                demo_homework_id = homework[0]
            if not conn.execute(
                text("SELECT 1 FROM submission WHERE student_id=:student AND homework_id=:homework"),
                {"student": demo_student_id, "homework": demo_homework_id},
            ).first():
                conn.execute(
                    text("""INSERT INTO submission
                             (student_id, homework_id, extension_file, homework_subject, status,
                              comment, upload_time, graded_time, grade, feedback_from_tutor,
                              feedback_from_ai, ai_grade)
                             VALUES (:student, :homework, NULL, :subject, 'Pending', :comment,
                                     NOW(), NULL, NULL, NULL, NULL, NULL)"""),
                    {
                        "student": demo_student_id,
                        "homework": demo_homework_id,
                        "subject": homework_title,
                        "comment": "[DEMO] Sample submission record; no file was uploaded.",
                    },
                )

            # Sample AI analysis metrics, explicitly not a real assessment.
            if not conn.execute(
                text("SELECT 1 FROM evaluation_metrics WHERE homework_id=:homework"),
                {"homework": demo_homework_id},
            ).first():
                conn.execute(
                    text("""INSERT INTO evaluation_metrics
                             (homework_id, extension_file, homework_subject, comment,
                              accuracy, precision_score, recall, f1_score, loss)
                             VALUES (:homework, NULL, :subject, :comment, 0.80, 0.78, 0.82, 0.80, 0.20)"""),
                    {
                        "homework": demo_homework_id,
                        "subject": homework_title,
                        "comment": "[DEMO] Placeholder metrics for UI preview; not generated by AI.",
                    },
                )

    # Evaluation score bands are used as reference/display data. The legacy
    # table schema only has score, level_name and completed_at.
    for score, label in [(0, "Getting Started"), (20, "Building Basics"), (40, "Developing"),
                         (60, "Proficient"), (80, "Advanced"), (100, "Mastery")]:
        if not conn.execute(
            text("SELECT 1 FROM evaluationlevel WHERE score=:score AND level_name=:label"),
            {"score": score, "label": label},
        ).first():
            conn.execute(
                text("INSERT INTO evaluationlevel (score, level_name, completed_at) VALUES (:score, :label, NULL)"),
                {"score": score, "label": label},
            )

    # Preserve the existing 10-question diagnostic. Give its legacy upload
    # relation a descriptive demo record so assessment setup views are not blank.
    upload = conn.execute(
        text("SELECT upload_id FROM evaluationupload WHERE filename=:filename LIMIT 1"),
        {"filename": "[DEMO] Built-in diagnostic question bank (no file)"},
    ).first()
    if not upload:
        upload_id = conn.execute(
            text("""INSERT INTO evaluationupload (filename, uploaded_by, upload_time)
                     VALUES (:filename, 'demo', :uploaded)"""),
            {"filename": "[DEMO] Built-in diagnostic question bank (no file)", "uploaded": datetime.now().isoformat(sep=" ")},
        ).lastrowid
        conn.execute(
            text("UPDATE evaluation_test SET upload_id=:upload WHERE test_id=1 AND upload_id IS NULL"),
            {"upload": upload_id},
        )

    if not conn.execute(
        text("SELECT 1 FROM evaluation_upload WHERE filename=:filename LIMIT 1"),
        {"filename": "[DEMO] Assessment source placeholder (no file)"},
    ).first():
        conn.execute(
            text("""INSERT INTO evaluation_upload (filename, uploaded_by, upload_time)
                     VALUES (:filename, NULL, :uploaded)"""),
            {"filename": "[DEMO] Assessment source placeholder (no file)", "uploaded": datetime.now()},
        )

with engine.connect() as conn:
    tables = [
        "announcement", "class_enrollment", "time_schedule", "class_session", "attendance",
        "homework", "submission", "evaluation_metrics", "evaluation_test", "evaluationquestion",
        "evaluationlevel", "evaluation_upload", "evaluationupload", "studentevaluationresult",
        "payment", "payment_detail", "service_enrollment", "other_service_attendance",
        "chat_room", "chat_room_member", "message",
    ]
    for table in tables:
        count = conn.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar_one()
        print(f"{table}: {count}")

