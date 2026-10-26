from datetime import datetime, time
from sqlalchemy import distinct, func
from sqlalchemy.orm import joinedload

from models import db
from models.class_detail_model import Class_Detail
from models.class_enrollment_model import Class_Enrollment
from models.subject_model import Subject
from models.system_user_model import System_User
from models.time_schedule_model import Room, Time_Schedule
from models.tutor_model import Tutor

class Package_Set_Detail(db.Model):
    __tablename__ = 'package_set_detail'

    set_id = db.Column(db.Integer, db.ForeignKey('schedule_package_set.set_id'), primary_key=True)
    class_detail_id = db.Column(db.Integer, db.ForeignKey('class_detail.class_detail_id'), primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), primary_key=True)
    max_capacity = db.Column(db.Integer, nullable=False)

    package_set = db.relationship("Schedule_Package_Set", back_populates="details")
    class_detail = db.relationship("Class_Detail", back_populates="package_set_details")
    room = db.relationship("Room", back_populates="package_set_details")

    @classmethod
    def get_class_detail_by_set_ids(cls, set_ids):
        return (db.session.query(cls)
        .join(Schedule_Package_Set)
        .filter(cls.set_id.in_(set_ids))
        .all())
    
    @staticmethod
    def get_class_by_set_and_tutor(set_id, tutor_id):
        from models.class_model import Class
        return (
            db.session.query(
                Class_Detail.class_detail_id,
                Class_Detail.start_time,
                Class_Detail.end_time,
                Class.subject_name,
                Class.class_type
            )
            .join(Class, Class.class_id == Class_Detail.class_id)
            .join(Package_Set_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .filter(Package_Set_Detail.set_id == set_id, Class.tutor_id == tutor_id)
            .all()
        )
    
    @staticmethod
    def get_by_class_and_set(class_detail_id, set_id):
        return (
            Package_Set_Detail.query
            .filter_by(class_detail_id=class_detail_id, set_id=set_id)
            .first()
        )


# ####################################################################
# Schedule Package Set
# ####################################################################

class Schedule_Package_Set(db.Model):
    __tablename__ = 'schedule_package_set'

    set_id = db.Column(db.Integer, primary_key=True)
    package_id = db.Column(db.Integer, db.ForeignKey('schedule_package.package_id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_datetime = db.Column(db.DateTime, nullable=False)

    package = db.relationship('Schedule_Package', back_populates='package_sets')
    details = db.relationship("Package_Set_Detail", back_populates="package_set", cascade="all, delete-orphan")
    time_schedules = db.relationship("Time_Schedule", back_populates="package_set", cascade="all, delete-orphan")
    enrollments = db.relationship("Class_Enrollment", back_populates="package_set", cascade="all, delete-orphan")


    @classmethod
    def get_by_package_ids(cls, package_ids):
        return cls.query.filter(cls.package_id.in_(package_ids)).all()
    
    @staticmethod
    def get_by_package_id(package_id):
        return Schedule_Package_Set.query.filter_by(package_id=package_id).all()
    
    @staticmethod
    def get_tutors_in_set(set_id):
        from models.class_model import Class
        return (
            db.session.query(Tutor.tutor_id, System_User.name)
            .join(Tutor, System_User.user_id == Tutor.user_id)
            .join(Class, Tutor.tutor_id == Class.tutor_id)
            .join(Class_Detail, Class.class_id == Class_Detail.class_id)
            .join(Package_Set_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .filter(Package_Set_Detail.set_id == set_id)
            .distinct()
            .all()
        )

# ####################################################################
# Schedule Package
# ####################################################################

class Schedule_Package(db.Model):
    __tablename__ = 'schedule_package'

    package_id = db.Column(db.Integer, primary_key=True)
    edu_lvl_id = db.Column(db.Integer, db.ForeignKey('education_level.edu_lvl_id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(100), nullable=False)
    created_datetime = db.Column(db.DateTime, nullable=False)
    is_open_for_enrollment = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(10), nullable=False)

    education_level = db.relationship('Education_Lvl', back_populates='schedule_packages')
    package_sets = db.relationship("Schedule_Package_Set", back_populates="package", cascade="all, delete-orphan")

    @classmethod
    def get_filtered(cls, package_name=None, tutor_name=None, status=None, education_level=None,
                     intake_year=None, min_subject=None, max_subject=None, sort='package_id', dir='desc'):
        from models.class_model import Class 

        query = (
            db.session.query(
                Schedule_Package.package_id.label("packageId"),
                Schedule_Package.name.label("name"),
                Schedule_Package.year.label("intakeYear"),
                Schedule_Package.education_level.label("educationLevel"),
                func.count(distinct(Subject.subject_id)).label("noOfSubject"),
                func.count(distinct(Class_Enrollment.student_id)).label("noOfStudentEnroll"),
                System_User.name.label("tutorName"),
                Schedule_Package.status.label("status")
            )
            .join(Schedule_Package_Set, Schedule_Package.package_id == Schedule_Package_Set.package_id)
            .join(Package_Set_Detail, Schedule_Package_Set.set_id == Package_Set_Detail.set_id)
            .join(Class_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .join(Tutor, Class.tutor_id == Tutor.tutor_id)
            .join(System_User, Tutor.user_id == System_User.user_id)
            .outerjoin(Class_Enrollment, Class_Detail.class_detail_id == Class_Enrollment.class_detail_id)
            .group_by(Schedule_Package.package_id)
        )

        # Filters
        if package_name:
            query = query.filter(Schedule_Package.name.ilike(f"%{package_name}%"))
        if tutor_name:
            query = query.filter(System_User.name.ilike(f"%{tutor_name}%"))
        if status:
            query = query.filter(cls.status == status)
        if education_level:
            query = query.filter(Schedule_Package.edu_lvl_id == int(education_level))
        if intake_year:
            query = query.filter(Schedule_Package.year == intake_year)

        # --- Subject count range ---
        # Use HAVING because NoOfSubject is an aggregate field
        if min_subject:
            query = query.having(func.count(distinct(Subject.subject_id)) >= min_subject)
        if max_subject:
            query = query.having(func.count(distinct(Subject.subject_id)) <= max_subject)

        # Sorting
        sort_column = None
        if sort in ['package_id', 'name', 'intake_year', 'edu_lvl', 'status']:
            sort_column = getattr(Schedule_Package, sort.lower(), None)
        elif sort == 'num_of_subject':
            sort_column = func.count(distinct(Subject.subject_id))
        elif sort == 'num_of_student_enroll':
            sort_column = func.count(distinct(Class_Enrollment.student_id))

        if sort_column is not None:
            sort_column = sort_column.desc() if dir == 'desc' else sort_column.asc()
            query = query.order_by(sort_column)
        else:
            # fallback: default ordering
            query = query.order_by(Schedule_Package.package_id.asc())

        return query
    
    @classmethod
    def create_with_sets(cls, name, edu_lvl_id, intake_year, is_open, selected_packages):
        try:
            now = datetime.utcnow()
            new_package = cls(
                name = name,
                edu_lvl_id=edu_lvl_id,
                year=intake_year,
                created_datetime=now,
                is_open_for_enrollment='1' if is_open else '0',
                status='1'
            )
            db.session.add(new_package)
            db.session.flush()

            for pkg in selected_packages:
                new_set = Schedule_Package_Set(
                    package_id=new_package.package_id,
                    name=pkg.get('package_name', 'Unnamed_Set'),
                    created_datetime=datetime.now()
                )
                db.session.add(new_set)
                db.session.flush()

                for subject_id, classes in pkg.get('subjects', {}).items():
                    for c in classes:
                        class_detail_id = c.get('class_detail_id')
                        room_id = c.get('room_id')

                        cd = Class_Detail.query.get(class_detail_id)
                        if cd:
                            # 如果 class_detail 没有时间信息则补齐
                            if not cd.day_of_week or not cd.start_time or not cd.end_time:
                                cd.day_of_week = c.get('day_of_week')
                                cd.start_time = parse_time_str(c.get('start_time'))
                                cd.end_time = parse_time_str(c.get('end_time'))
                                # SQLAlchemy 自动追踪更新，不用重新 add

                        room = Room.query.get(room_id)
                        max_capacity = room.max_capacity if room else 0

                        new_detail = Package_Set_Detail(
                            set_id=new_set.set_id,
                            class_detail_id=class_detail_id,
                            room_id=room_id,
                            max_capacity=max_capacity
                        )
                        db.session.add(new_detail)

            db.session.commit()
            print(f"✅ Package '{new_package.name}' successfully inserted with {len(selected_packages)} sets.")
            return new_package

        except Exception as e:
            db.session.rollback()
            print("❌ Error during package creation:", e)
            raise e


    @staticmethod
    def update(id, is_open_for_enrollment):
        # Step 1: find class
        package = Schedule_Package.query.get(id)
        if not package:
            return False  # class not found

        try:
            # Step 1: deactivate class
            package.is_open_for_enrollment = is_open_for_enrollment
            db.session.commit()
            return True

        except Exception as e:
            db.session.rollback()
            print(f"Error deactivating class {id}: {e}")
            return False


    @staticmethod
    def deactivate_package(id):
        package = Schedule_Package.query.get(id)
        if not package:
            return False  # package not found

        try:
            # Step 1: deactivate package
            package.status = '0'
            package.is_open_for_enrollment = '0'

            # Step 2: deactivate all related sets
            for pkg_set in package.package_sets:
                pkg_set.status = '0' if hasattr(pkg_set, 'status') else None  # optional if you have a status column

                # Step 3: deactivate all related time schedules for each set
                time_schedules = Time_Schedule.query.filter_by(set_id=pkg_set.set_id).all()
                for schedule in time_schedules:
                    schedule.status = '0'

            db.session.commit()
            print(f"✅ Deactivated package {id} and all related time schedules.")
            return True

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error deactivating package {id}: {e}")
            return False


    @classmethod
    def get_full_package_by_id(cls, package_id):
        from models.class_model import Class
        package = (
            Schedule_Package.query
            .options(
                # Load package sets
                joinedload(Schedule_Package.package_sets)
                .joinedload(Schedule_Package_Set.details)
                .joinedload(Package_Set_Detail.class_detail)
                # Follow class_detail -> class -> tutor -> user
                .joinedload(Class_Detail.class_)
                .joinedload(Class.tutor)
                .joinedload(Tutor.user),
                
                # Follow class_detail -> class -> subject -> education_level
                joinedload(Schedule_Package.package_sets)
                .joinedload(Schedule_Package_Set.details)
                .joinedload(Package_Set_Detail.class_detail)
                .joinedload(Class_Detail.class_)
                .joinedload(Class.subject)
                .joinedload(Subject.education_level),
                
                # Load room directly from Package_Set_Detail
                joinedload(Schedule_Package.package_sets)
                .joinedload(Schedule_Package_Set.details)
                .joinedload(Package_Set_Detail.room)
            )
            .filter(Schedule_Package.package_id == package_id)
            .first()
        )
        return package


    @staticmethod
    def get_pacakge_for_enrollment(intake_year, edu_lvl_id):

        from models.class_model import Class

        return (Schedule_Package.query.filter_by(
            edu_lvl_id=edu_lvl_id,
            year=intake_year,
            is_open_for_enrollment='1',
            status='1'
        ).options(
            joinedload(Schedule_Package.package_sets)
            .joinedload(Schedule_Package_Set.details)
            .joinedload(Package_Set_Detail.class_detail)
            .joinedload(Class_Detail.class_)
            .joinedload(Class.subject),

            joinedload(Schedule_Package.package_sets)
            .joinedload(Schedule_Package_Set.details)
            .joinedload(Package_Set_Detail.room),

            joinedload(Schedule_Package.package_sets)
            .joinedload(Schedule_Package_Set.details)
            .joinedload(Package_Set_Detail.class_detail)
            .joinedload(Class_Detail.class_)
            .joinedload(Class.tutor)
            .joinedload(Tutor.user),
        ).all())

        

# ================================================================
# Generate Package
# ================================================================
    @staticmethod
    def get_already_used_class_detail_ids(intake_year):
        """return class detail list already be scheduled in the same year"""
        used = (db.session.query(Package_Set_Detail.class_detail_id)
                .join(Schedule_Package_Set, Package_Set_Detail.set_id == Schedule_Package_Set.set_id)
                .join(Schedule_Package, Schedule_Package.package_id == Schedule_Package_Set.package_id)
                .filter(Schedule_Package.year == str(intake_year))
                .distinct().all())
        return [r[0] for r in used]
    
    @classmethod
    def get_available_rooms(cls, cd, intake_year, prefer_max_capacity=False):
        """Return a room_id that has no conflict for this class detail's time."""
        from models.time_schedule_model import Room
        
        # Skip if class detail has missing start/end time
        if not cd.start_time or not cd.end_time:
            print(f"⚠️ Skipping room check for class_detail {cd.class_detail_id} (missing start/end time)")
            return None

        # Get all rooms
        all_rooms = db.session.query(Room.room_id, Room.max_capacity).all()

        # Get all rooms currently used at same day/time
        conflicting_rooms = (
            db.session.query(Package_Set_Detail.room_id)
            .join(Schedule_Package_Set, Package_Set_Detail.set_id == Schedule_Package_Set.set_id)
            .join(Schedule_Package, Schedule_Package.package_id == Schedule_Package_Set.package_id)
            .join(Class_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .filter(Schedule_Package.year == str(intake_year))
            .filter(Class_Detail.day_of_week == cd.day_of_week)
            .filter(Class_Detail.status == '1')  # ✅ only active
            .filter(
                (Class_Detail.start_time < cd.end_time)
                & (Class_Detail.end_time > cd.start_time)
            )
            .distinct()
            .all()
        )

        conflict_ids = [r[0] for r in conflicting_rooms]

        # Filter available rooms
        available_rooms = [r for r in all_rooms if r[0] not in conflict_ids]

        if not available_rooms:
            return []

        if prefer_max_capacity:
            available_rooms.sort(key=lambda x: x[1], reverse=True)
        return [r[0] for r in available_rooms]

    
    @classmethod
    def has_tutor_conflict_in_db(cls, tutor_id, cd, intake_year):
        """Check if a tutor has another active class that overlaps with this cd's time."""
        from models.class_model import Class
        from models.class_detail_model import Class_Detail

        # Fetch overlapping class details for the same tutor & year
        conflicts = (
            db.session.query(Class_Detail.class_detail_id)
            .join(Class, Class_Detail.class_id == Class.class_id)
            .filter(Class.tutor_id == tutor_id)
            .filter(Class.status == 'active')  # Only check active classes
            .filter(Class.intake_year == str(intake_year))
            .filter(Class_Detail.day_of_week == cd.day_of_week)
            .filter(
                (Class_Detail.start_time < cd.end_time)
                & (Class_Detail.end_time > cd.start_time)
            )
            .all()
        )

        return len(conflicts) > 0


    @classmethod
    def get_tutor_occupied_slots(cls, tutor_id, intake_year, time_window):
        """Get all occupied (start_time, end_time, day_of_week) slots for a tutor in a given intake year and time window."""

        from models.class_model import Class
        from models.class_detail_model import Class_Detail

        # Map time windows to specific time ranges
        from datetime import time
        if time_window == 'M':  # Morning
            start_window, end_window = time(8, 0), time(12, 0)
        elif time_window == 'A':  # Afternoon
            start_window, end_window = time(13, 0), time(21, 0)
        else:  # Night
            start_window, end_window = time(8, 0), time(21, 0)

        # Query all class details where tutor is teaching and overlaps the selected time window
        occupied = (
            db.session.query(
                Class_Detail.day_of_week,
                Class_Detail.start_time,
                Class_Detail.end_time
            )
            .join(Class, Class.class_id == Class_Detail.class_id)
            .join(Package_Set_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .join(Schedule_Package_Set, Schedule_Package_Set.set_id == Package_Set_Detail.set_id)
            .join(Schedule_Package, Schedule_Package.package_id == Schedule_Package_Set.package_id)
            .filter(Class.tutor_id == tutor_id)
            .filter(Schedule_Package.year == str(intake_year))  # ✅ match the package's year
            .filter(Class.status == '1')
            .filter(Class_Detail.status == '1')
            .filter(Class_Detail.start_time.isnot(None))
            .filter(Class_Detail.end_time.isnot(None))
            .filter(
                (Class_Detail.start_time < end_window)
                & (Class_Detail.end_time > start_window)
            )
            .all()
        )
        
        # print(f"[DEBUG] Query returned {len(occupied)} rows:")
        # for i, row in enumerate(occupied, start=1):
        #     print(f"  {i}. day={row.day_of_week}, {row.start_time} → {row.end_time}")

        # Return as a clean list of dicts (optional for readability)
        return [
            {
                "day_of_week": row.day_of_week,
                "start_time": row.start_time,
                "end_time": row.end_time
            }
            for row in occupied
        ]
    

    @classmethod
    def get_room_capacity(cls, room_id):
        """Return the max_capacity of a room given its room_id."""

        room = db.session.query(Room.max_capacity).filter(Room.room_id == room_id).first()

        return room[0] if room else 0


# ================================================================
# For Class Enrollment
# ================================================================
    @classmethod
    def get_package_for_enrollment(cls, edu_lvl_id, intake_year=None, package_name=None):
        package_query = cls.query.filter_by(edu_lvl_id=edu_lvl_id, is_open_for_enrollment='1', status='1')  # only active packages

        if intake_year:
            package_query = package_query.filter_by(year=intake_year)

        if package_name:
            package_query = package_query.filter(cls.name.ilike(f"%{package_name}%"))

        return package_query.all()

    @staticmethod
    def get_package_by_edu_lvl(edu_lvl_id):
        return Schedule_Package.query.filter_by(edu_lvl_id=edu_lvl_id, status='1').all()

def parse_time_str(time_str):
        if not time_str:
            return None
        try:
            return datetime.strptime(time_str, "%H:%M").time()
        except ValueError:
            return datetime.strptime(time_str, "%H:%M:%S").time()
