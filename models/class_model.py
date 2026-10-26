from datetime import datetime
from models import db
from models.class_detail_model import Class_Detail
from models.schedule_package_model import Schedule_Package, Package_Set_Detail, Schedule_Package_Set
from models.subject_model import Subject
from models.system_user_model import System_User
from models.time_schedule_model import Time_Schedule
from models.tutor_model import Tutor

class Class(db.Model):
    __tablename__ = 'class'

    class_id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey('tutor.tutor_id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.subject_id'), nullable=False)
    class_type = db.Column(db.String(5), nullable=False)
    time_per_week = db.Column(db.Integer, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    is_open_for_schedule = db.Column(db.String(5), nullable=False)
    status = db.Column(db.String(5), nullable=False, default='1')

    tutor = db.relationship('Tutor', back_populates='classes')
    subject = db.relationship('Subject', back_populates='classes')
    class_details = db.relationship("Class_Detail", back_populates="class_", cascade="all, delete-orphan")

    @classmethod
    def get_filtered(cls, subject_name=None, tutor_name=None, status=None,
                     class_type=None, time_filters=None,
                     sort='class_id', dir='asc'):

        query = db.session.query(cls) \
            .join(Subject, cls.subject_id == Subject.subject_id) \
            .join(Tutor, cls.tutor_id == Tutor.tutor_id) \
            .distinct(cls.class_id)

        # Filters
        if subject_name:
            query = query.filter(Subject.name.ilike(f"%{subject_name}%"))
        if tutor_name:
            query = query.filter(System_User.name.ilike(f"%{tutor_name}%"))
        if status:
            query = query.filter(cls.status == status)
        # if day_of_week:
        #     query = query.filter(Class_Detail.day_of_week == day_of_week)
        if class_type:
            query = query.filter(cls.class_type.ilike(class_type))

        # Time-based filters
        if time_filters:
            # if time_filters.get('max_capacity_min'):
            #     query = query.filter(cls.max_capacity >= time_filters['max_capacity_min'])
            # if time_filters.get('max_capacity_max'):
            #     query = query.filter(cls.max_capacity <= time_filters['max_capacity_max'])
            if time_filters.get('min_time_per_week'):
                query = query.filter(cls.time_per_week >= time_filters['min_time_per_week'])
            if time_filters.get('max_time_per_week'):
                query = query.filter(cls.time_per_week <= time_filters['max_time_per_week'])

        # Sorting
        
        sort_column = getattr(cls, sort, None)

        if sort_column is not None:
            # normal column sorting (in Class table)
            sort_column = sort_column.desc() if dir == 'desc' else sort_column.asc()
            query = query.order_by(sort_column)
        else:
            # related model sorting (subject.name or tutor.name)
            if sort == 'subject.name':
                sort_column = Subject.name.desc() if dir == 'desc' else Subject.name.asc()
                query = query.order_by(sort_column)
            elif sort == 'tutor.name':
                # Tutor already joined through cls.tutor, just join System_User
                query = query.join(System_User, Tutor.user_id == System_User.user_id)
                sort_column = System_User.name.desc() if dir == 'desc' else System_User.name.asc()
                query = query.order_by(sort_column)

        return query
    


    @classmethod
    def check_tutor_class_execute(cls, tutor_id, day_of_week, start_time, end_time, exclude_class_id=None):
        # Convert incoming strings to datetime.time objects
        start_time_obj = Class.parse_time_str(start_time)
        end_time_obj = Class.parse_time_str(end_time)
        print(f"Exclude ID: {exclude_class_id}")
        print(f"start time: {start_time_obj}")
        print(f"end time: {end_time_obj}")
        print('')

        print('')

        if not start_time_obj or not end_time_obj:
            print("⚠️ Invalid time format:", start_time, end_time)
            return False

        # Step 1: filter by tutor and day
        existing_details = (
            db.session.query(Class_Detail)
            .join(cls, Class_Detail.class_id == cls.class_id)
            .filter(cls.tutor_id == tutor_id)
            .filter(cls.status == '1')
            .filter(Class_Detail.day_of_week == day_of_week)
            .all()
        )

        # Step 2: check overlap (skip same class if editing)
        for detail in existing_details:
            if exclude_class_id and detail.class_detail_id == int(exclude_class_id):
                continue  # skip comparing against itself

            if start_time_obj < detail.end_time and end_time_obj > detail.start_time:
                print(f"Conflict with existing class {detail.class_id} "
                    f"{detail.start_time}-{detail.end_time}")
                return False  # Conflict found
            
        # ========================================================
        # 2️⃣ Check for conflicts within the same package set(s)
        # ========================================================
        # Find which set(s) include this class_detail_id
        set_ids = db.session.query(Package_Set_Detail.set_id).filter_by(class_detail_id=exclude_class_id).subquery()

        # Query all other class_details in those sets (same day)
        set_conflicts = (
            db.session.query(Class_Detail)
            .join(Package_Set_Detail, Package_Set_Detail.class_detail_id == Class_Detail.class_detail_id)
            .join(Schedule_Package_Set, Schedule_Package_Set.set_id == Package_Set_Detail.set_id)
            .join(Schedule_Package, Schedule_Package.package_id == Schedule_Package_Set.package_id)
            .filter(Schedule_Package.status == '1')  # ✅ check active package
            .filter(Package_Set_Detail.set_id.in_(set_ids))
            .filter(Class_Detail.day_of_week == day_of_week)
            .filter(Class_Detail.status == '1')
            .filter(Class_Detail.class_detail_id != exclude_class_id)
            .all()
        )

        for detail in set_conflicts:
            if start_time_obj < detail.end_time and end_time_obj > detail.start_time:
                print(f"⚠️ Package set conflict: overlaps with class detail {detail.class_detail_id} "
                    f"({detail.start_time}-{detail.end_time})")
                return False

        return True  # no conflict
    


    @staticmethod
    def add(data, class_time_pairs):
        new_class = Class(**data)
        db.session.add(new_class)
        db.session.flush()

        for pair in class_time_pairs:
            detail_data = {
                'class_id': new_class.class_id,
                'day_of_week': pair['day_of_week'],
                'start_time': pair['start_time'],
                'end_time': pair['end_time'],
                'status': '1'
            }
            db.session.add(Class_Detail(**detail_data))

        db.session.commit()
        return new_class
    

    @staticmethod
    def update_batch(class_id, class_type, is_open_for_schedule, class_time_pairs):
        """
        Update class and its details in a single transaction.
        Also update related active time schedules to match new time settings.
        """
        try:
            # Step 1: Update main class info
            cls = db.session.query(Class).filter_by(class_id=class_id).first()
            if cls:
                cls.class_type = class_type
                cls.is_open_for_schedule = is_open_for_schedule

            # Step 2: Update each class detail and its active time schedules
            for pair in class_time_pairs:
                detail = (
                    db.session.query(Class_Detail)
                    .filter_by(class_detail_id=pair['class_detail_id'])
                    .first()
                )
                if not detail:
                    continue

                # Update class detail info
                detail.day_of_week = pair['day_of_week']
                detail.start_time = pair['start_time']
                detail.end_time = pair['end_time']
                detail.status = '1'

                # Update active time schedules for this detail
                active_schedules = (
                    db.session.query(Time_Schedule)
                    .filter_by(class_detail_id=detail.class_detail_id, status='1')
                    .all()
                )

                for schedule in active_schedules:
                    schedule.day_of_week = pair['day_of_week']
                    schedule.start_time = pair['start_time']
                    schedule.end_time = pair['end_time']

            # Step 3: Commit all at once
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise e



    @staticmethod
    def deactivate_class(id):
        # Step 1: find class
        class_ = Class.query.get(id)
        if not class_:
            return False  # class not found

        try:
            # Step 1: deactivate class
            class_.status = '0'

            # Step 2: deactivate related class_details
            class_details = Class_Detail.query.filter_by(class_id=id).all()
            for detail in class_details:
                detail.status = '0'

                # Step 3: deactivate related time_schedules
                time_schedules = Time_Schedule.query.filter_by(class_detail_id=detail.class_detail_id).all()
                for schedule in time_schedules:
                    schedule.status = '0'

            db.session.commit()
            return True

        except Exception as e:
            db.session.rollback()
            print(f"Error deactivating class {id}: {e}")
            return False


    @staticmethod
    def get_by_id(id):
        return Class.query.get(id)

    


    @classmethod
    def get_related_packages(cls, class_id):
        """Return all distinct packages that include class details belonging to this class."""
        packages = (
            db.session.query(Schedule_Package)
            .join(Schedule_Package_Set, Schedule_Package_Set.package_id == Schedule_Package.package_id)
            .join(Package_Set_Detail, Package_Set_Detail.set_id == Schedule_Package_Set.set_id)
            .join(Class_Detail, Class_Detail.class_detail_id == Package_Set_Detail.class_detail_id)
            .filter(Class_Detail.class_id == class_id)
            .order_by(Schedule_Package.created_datetime.desc())
            .distinct()
            .all()
        )
        return packages

    
    def parse_time_str(t):
        if not t:
            return None
        for fmt in ("%I:%M %p", "%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(t, fmt).time()
            except ValueError:
                continue
        return None  # None if no format matched
