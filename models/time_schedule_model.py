from datetime import datetime, time, timedelta
from helper import Helper
from models import db
from models.attendance_model import Attendance
from models.class_detail_model import Class_Detail
from models.class_enrollment_model import Class_Enrollment
from models.class_session_model import Class_Session
from models.subject_model import Subject
from models.system_user_model import System_User
from models.tutor_model import Tutor

class Room(db.Model):
    room_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    room_type = db.Column(db.String(10), nullable=False)
    max_capacity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(10), nullable=False)

    time_schedules = db.relationship("Time_Schedule", back_populates="room")
    package_set_details = db.relationship("Package_Set_Detail", back_populates="room")

    @classmethod
    def get_room_capacity(cls, room_id):
        """Return the max_capacity for a given room_id."""
        room = cls.query.filter_by(room_id=room_id, status='1').first()
        if room:
            return room.max_capacity
        return 0

class Time_Schedule(db.Model):
    __tablename__ = 'time_schedule'

    schedule_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_detail_id = db.Column(db.Integer, db.ForeignKey('class_detail.class_detail_id'), nullable=False)
    set_id = db.Column(db.Integer, db.ForeignKey('schedule_package_set.set_id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=False)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    type = db.Column(db.String(10), default='1', nullable=False)
    student_enroll = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(10), default='1', nullable=False)

    # Relationships
    class_detail = db.relationship('Class_Detail', back_populates='time_schedules')
    package_set = db.relationship('Schedule_Package_Set', back_populates='time_schedules')
    room = db.relationship("Room", back_populates="time_schedules")
    class_sessions = db.relationship("Class_Session", back_populates="time_schedule")

    @classmethod
    def generate_for_package(cls, package, start_date, end_date):
        try:
            generated_count = 0
            print(f"Generating schedules from {start_date} to {end_date}")

            for package_set in package.package_sets:
                for detail in package_set.details:
                    cd = detail.class_detail
                    if not cd or not cd.day_of_week:
                        continue

                    # ✅ Convert day_of_week safely
                    try:
                        day_of_week = int(cd.day_of_week)
                    except (TypeError, ValueError):
                        print(f"⚠️ Invalid day_of_week in class_detail {cd.class_detail_id}: {cd.day_of_week}")
                        continue

                    # ✅ Convert start_time & end_time if needed
                    if isinstance(cd.start_time, str):
                        cd.start_time = datetime.strptime(cd.start_time, "%H:%M:%S").time()
                    if isinstance(cd.end_time, str):
                        cd.end_time = datetime.strptime(cd.end_time, "%H:%M:%S").time()

                    if not isinstance(cd.start_time, time) or not isinstance(cd.end_time, time):
                        print(f"⚠️ Invalid time in class_detail {cd.class_detail_id}: start={cd.start_time}, end={cd.end_time}")
                        continue

                    # ✅ Find the first matching weekday
                    current_date = start_date
                    while current_date.weekday() != day_of_week:
                        current_date += timedelta(days=1)

                    # ✅ Generate weekly schedules until end_date
                    while current_date <= end_date:
                        start_datetime = datetime.combine(current_date, cd.start_time)
                        end_datetime = datetime.combine(current_date, cd.end_time)

                        new_schedule = cls(
                            class_detail_id=cd.class_detail_id,
                            set_id = package_set.set_id,
                            room_id=detail.room_id,
                            start_datetime=start_datetime,
                            end_datetime=end_datetime,
                            student_enroll=0,
                            status='1'
                        )
                        db.session.add(new_schedule)
                        generated_count += 1

                        current_date += timedelta(weeks=1)

            db.session.commit()
            print(f"✅ Generated {generated_count} time schedules for package {package.package_id}")
            return generated_count

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error generating time schedules for package {package.package_id}: {e}")
            raise e

    @classmethod
    def get_active_by_id(cls, schedule_id):
        return cls.query.filter_by(schedule_id=schedule_id, status='1').first()
    
    @staticmethod
    def get_by_set(set_id):
        from models.class_model import Class
        Time_Schedule.autoload_update_status()

        query = (
            db.session.query(
                Time_Schedule.schedule_id,
                Time_Schedule.start_datetime,
                Time_Schedule.end_datetime,
                Time_Schedule.status.label('ts_status'),
                Time_Schedule.type,
                Room.room_id,
                Room.name.label('room_name'),
                Class_Detail.class_detail_id,
                Class.class_id,
                Class.class_type,
                Subject.subject_id,
                Subject.name.label('subject_name'),
                System_User.user_id.label('tutor_user_id'),
                System_User.name.label('tutor_name')
            )
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Tutor, Class.tutor_id == Tutor.tutor_id)
            .join(System_User, Tutor.user_id == System_User.user_id)
            .join(Room, Time_Schedule.room_id == Room.room_id)
            .filter(Time_Schedule.set_id == set_id)
            .filter(Class.status == '1')           # only active classes
            .group_by(Time_Schedule.schedule_id)
            .order_by(Time_Schedule.start_datetime.asc())
        )

        rows = query.all()
        return rows

    # --------------------------------------------------------
    # 🟦 Get schedules for given set & specific tutor
    # --------------------------------------------------------
    @staticmethod
    def get_by_set_and_tutor(set_id, tutor_id):
        from models.class_model import Class
        Time_Schedule.autoload_update_status()
        
        query = (
            db.session.query(
                Time_Schedule.schedule_id,
                Time_Schedule.start_datetime,
                Time_Schedule.end_datetime,
                Time_Schedule.status.label('ts_status'),
                Time_Schedule.type,
                Room.room_id,
                Room.name.label('room_name'),
                Class_Detail.class_detail_id,
                Class.class_id,
                Class.class_type,
                Subject.subject_id,
                Subject.name.label('subject_name'),
                System_User.user_id.label('tutor_user_id'),
                System_User.name.label('tutor_name')
            )
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Tutor, Class.tutor_id == Tutor.tutor_id)
            .join(System_User, Tutor.user_id == System_User.user_id)
            .join(Room, Time_Schedule.room_id == Room.room_id)
            .filter(Time_Schedule.set_id == set_id)
            .filter(Class.tutor_id == tutor_id)
            .group_by(Time_Schedule.schedule_id)
            .order_by(Time_Schedule.start_datetime.asc())
        )

        rows = query.all()

        return rows

    @staticmethod
    def cancel_session(id):
        from models.class_model import Class

        ts = Time_Schedule.query.get(id)
        if not ts:
            return False  # session not found

        try:
            ts.status = '0'
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()  # undo any changes
            print(f"❌ Error canceling session {id}: {e}")
            return False
        
    @staticmethod
    def get_unreplaced_sessions_by_subject(subject_id):
        from models.class_model import Class
        from models.schedule_package_model import Schedule_Package, Schedule_Package_Set
        from datetime import datetime

        # Step 1: get all sessions for this subject
        all_sessions = (
            db.session.query(
                Time_Schedule,
                Class_Detail,
                Class,
                Schedule_Package_Set,
                Schedule_Package
            )
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Schedule_Package_Set, Time_Schedule.set_id == Schedule_Package_Set.set_id)
            .join(Schedule_Package, Schedule_Package_Set.package_id == Schedule_Package.package_id)
            .filter(Class.subject_id == subject_id)
            .filter(Class.status == '1')
            .all()
        )

        print(f"[DEBUG] Total sessions fetched: {len(all_sessions)}")

        # Step 2: group by (set_id, class_detail_id)
        grouped = {}
        for ts, cd, cls, set_, pkg in all_sessions:
            key = (ts.set_id, ts.class_detail_id)

            if key not in grouped:
                grouped[key] = {
                    'subject_name': cls.subject.name,
                    'day': ts.start_datetime.strftime('%A'),
                    'start_time_obj': ts.start_datetime.time(),  # store as time object
                    'end_time_obj': ts.end_datetime.time(),
                    'start_time': Helper.format_time_12h(ts.start_datetime),  # for display
                    'end_time': Helper.format_time_12h(ts.end_datetime),
                    'tutor_name': cls.tutor.user.name,
                    'package_name': pkg.name,
                    'package_set_name': set_.name,
                    'canceled_count': 0,
                    'replacement_count': 0
                }
            else:
                # Compare time objects
                if ts.start_datetime.time() < grouped[key]['start_time_obj']:
                    grouped[key]['day'] = ts.start_datetime.strftime('%A')
                    grouped[key]['start_time_obj'] = ts.start_datetime.time()
                    grouped[key]['end_time_obj'] = ts.end_datetime.time()
                    grouped[key]['start_time'] = Helper.format_time_12h(ts.start_datetime)
                    grouped[key]['end_time'] = Helper.format_time_12h(ts.end_datetime)



            # Count canceled sessions
            if ts.type == '1' and ts.status == '0':
                grouped[key]['canceled_count'] += 1
            # Count replaced sessions
            elif ts.type == '2' and ts.status != '0':
                grouped[key]['replacement_count'] += 1

        # Step 3: calculate remaining
        unreplaced_sessions = []
        for key, info in grouped.items():
            remaining = info['canceled_count'] - info['replacement_count']
            if remaining > 0:
                display_text = f"{info['subject_name']} | {info['day']} {info['start_time']}-{info['end_time']} ({info['tutor_name']}) | {info['package_name']} {info['package_set_name']} | {remaining} class(es) to replace"
                unreplaced_sessions.append({
                    'id': key,  # tuple of (set_id, class_detail_id)
                    'display': display_text,
                    'remaining': remaining,
                    'tutor_name': info['tutor_name'],
                    'duration': cd.class_.duration
                })

        return unreplaced_sessions

    #for add replacement class
    @classmethod
    def check_and_add(cls, edu_lvl_id, subject_id, time_schedule_key, start_dt, end_dt):
        """
        Create a replacement Time_Schedule session safely.
        - Use original canceled session (type='1').
        - Check tutor and room conflicts.
        """
        from models.class_model import Class
        from datetime import datetime

        try:
            set_id, class_detail_id = time_schedule_key  # unpack tuple from frontend

            # --- 1️⃣ Get the original canceled session(s) for this set + class_detail ---
            original = cls.query.filter_by(set_id=set_id, class_detail_id=class_detail_id, type='1', status='0').first()
            if not original:
                return {'success': False, 'message': 'Original canceled session not found.'}

            # --- 2️⃣ Tutor conflict check ---
            tutor_id = Class.query.join(Class_Detail).filter(Class_Detail.class_detail_id == original.class_detail_id).first().tutor_id
            tutor_conflict = (
                cls.query.join(Class_Detail, cls.class_detail_id == Class_Detail.class_detail_id)
                .join(Class, Class_Detail.class_id == Class.class_id)
                .filter(Class.tutor_id == tutor_id)
                .filter(cls.status == '1')
                .filter(cls.start_datetime < end_dt, cls.end_datetime > start_dt)
                .first()
            )
            if tutor_conflict:
                return {'success': False, 'message': 'Tutor has a conflicting schedule.'}

            # --- 3️⃣ Room assignment ---
            original_room_id = original.room_id
            room_conflict = (
                cls.query.filter(cls.room_id == original_room_id)
                .filter(cls.status == '1')
                .filter(cls.start_datetime < end_dt, cls.end_datetime > start_dt)
                .first()
            )

            if room_conflict:
                available_room = Room.query.filter_by(status='1').all()
                found_room = None
                for r in available_room:
                    conflict = (
                        cls.query.filter(cls.room_id == r.room_id)
                        .filter(cls.status == '1')
                        .filter(cls.start_datetime < end_dt, cls.end_datetime > start_dt)
                        .first()
                    )
                    if not conflict:
                        found_room = r.room_id
                        break
                if not found_room:
                    return {'success': False, 'message': 'No rooms available at this time.'}
                room_id = found_room
            else:
                room_id = original_room_id

            # --- 4️⃣ Create replacement session ---
            new_schedule = cls(
                class_detail_id=original.class_detail_id,
                set_id=original.set_id,
                room_id=room_id,
                start_datetime=start_dt,
                end_datetime=end_dt,
                type='2',  # replacement session
                student_enroll=original.student_enroll,
                status='1'
            )
            db.session.add(new_schedule)
            db.session.commit()

            return {'success': True, 'message': f'Replacement session added in room {room_id}.'}

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in check_and_add: {e}")
            return {'success': False, 'message': 'An error occurred while adding replacement session.'}

    @staticmethod
    def autoload_update_status():
        """Auto update all class session status based on current time."""
        now = datetime.now()

        # 1) Completed → status = "3"
        ended = Time_Schedule.query.filter(
            Time_Schedule.end_datetime < now,
            Time_Schedule.status.in_(["1", "2"])
        ).all()
        for s in ended:
            s.status = "3"

        # 2) Ongoing → status = "2"
        ongoing = Time_Schedule.query.filter(
            Time_Schedule.start_datetime <= now,
            Time_Schedule.end_datetime >= now,
            Time_Schedule.status != "2"
        ).all()
        for s in ongoing:
            s.status = "2"

        db.session.commit()



    # ============================================================
    # 🧩 Methods for Student Timetable Sync
    # ============================================================
    @staticmethod
    def get_timetable_by_student(student_id: int, years: list[int]):
        from models.class_model import Class
        start_year = min(years)
        end_year = max(years)
        start_date = datetime(start_year, 1, 1)
        end_date = datetime(end_year, 12, 31, 23, 59, 59)

        # 连结 enrollment → class_detail → class → subject → tutor → room
        query = (
            db.session.query(Time_Schedule)
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Tutor, Class.tutor_id == Tutor.tutor_id)
            .join(Room, Time_Schedule.room_id == Room.room_id)
            .join(Class_Enrollment, Class_Enrollment.class_detail_id == Class_Detail.class_detail_id)
            .filter(
                Class_Enrollment.student_id == student_id,
                Time_Schedule.start_datetime >= start_date,
                Time_Schedule.start_datetime <= end_date,
                Class_Enrollment.status == "1"
            )
        .order_by(Time_Schedule.start_datetime.asc())
        )

        return query.all()
    
    @staticmethod
    def get_attendance_status(schedule_id: int, student_id: int):
        # 1️⃣ 找 session
        session = Class_Session.query.filter_by(schedule_id=schedule_id).first()

        if not session:
            print("❗ No class_session found for this schedule_id")
            return ""

        # 2️⃣ 找 attendance
        attendance = Attendance.query.filter_by(
            session_id=session.session_id,
            student_id=student_id
        ).first()

        if attendance:
            print("  🎉 ATTENDED!")
            return "attended"

        # 3️⃣ 拿 schedule.status
        schedule = Time_Schedule.query.get(schedule_id)

        if schedule and schedule.status in ["0", "1", "2"]:
            return ""

        return "absent"

    
    @staticmethod
    def get_timetable_by_tutor(tutor_id: int, years: list[int]):
        from models.class_model import Class
        from models.schedule_package_model import Schedule_Package, Schedule_Package_Set


        start_year = min(years)
        end_year = max(years)
        start_date = datetime(start_year, 1, 1)
        end_date = datetime(end_year, 12, 31, 23, 59, 59)

        query = (
            db.session.query(Time_Schedule)
            .join(Class_Detail, Time_Schedule.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Schedule_Package_Set, Time_Schedule.set_id == Schedule_Package_Set.set_id)
            .join(Schedule_Package, Schedule_Package_Set.package_id == Schedule_Package.package_id)
            .filter(Class.tutor_id == tutor_id)
            .filter(
                Time_Schedule.start_datetime >= start_date, 
                Time_Schedule.start_datetime <= end_date,
                Schedule_Package.status == "1"
            )
            .order_by(Time_Schedule.start_datetime.asc())
        )
        return query.all()


    @staticmethod
    def serialize_for_mobile(schedule, student_id):
        """
        序列化 mobile timetable 所需的完整字段
        对应 SQLite timetables 表的所有字段
        """
        attendance_status = Time_Schedule.get_attendance_status(
            schedule.schedule_id, 
            student_id
        )
        class_detail = schedule.class_detail
        class_ = class_detail.class_ if hasattr(class_detail, "class_") else None
        subject = class_.subject if class_ else None
        tutor = class_.tutor if class_ else None
        room = schedule.room
        package_set = schedule.package_set if hasattr(schedule, "package_set") else None

        return {
            "timetable_id": schedule.schedule_id,  # 手机端可以沿用 schedule_id
            "schedule_id": schedule.schedule_id,
            "class_detail_id": schedule.class_detail_id,

            "student_id": student_id or None,  # 防呆（前端 override 也没关系）

            # NEW: 完整字段
            "subject_id": subject.subject_id if subject else None,
            "tutor_id": tutor.tutor_id if tutor else None,

            "subject_name": subject.name if subject else None,
            "tutor_name": tutor.user.name if tutor and tutor.user else None,
            "room_name": room.name if room else None,

            # NEW: class detail fields
            "day_of_week": class_detail.day_of_week,          # 1–7
            "class_type": class_.class_type if class_ else None,  # N / F

            # NEW: set info
            "set_id": package_set.set_id if package_set else None,

            # Time
            "start_time": schedule.start_datetime.isoformat() if schedule.start_datetime else None,
            "end_time": schedule.end_datetime.isoformat() if schedule.end_datetime else None,

            "status": schedule.status,
            "attendance_status": attendance_status
        }
