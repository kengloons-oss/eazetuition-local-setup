from datetime import datetime, time

from sqlalchemy import or_
from models import db
from models.subject_model import Subject
from models.tutor_model import Tutor

class Class_Detail(db.Model):
    __tablename__ = 'class_detail'

    class_detail_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('class.class_id'), nullable=False)
    day_of_week = db.Column(db.String(20))
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    status = db.Column(db.String(5), nullable=False, default='1')

    class_ = db.relationship('Class', back_populates='class_details')
    enrollments = db.relationship("Class_Enrollment", back_populates="class_detail", cascade="all, delete-orphan")
    package_set_details = db.relationship("Package_Set_Detail", back_populates="class_detail")
    time_schedules = db.relationship('Time_Schedule', back_populates='class_detail')
    
    @staticmethod
    def add(data):
        new = Class_Detail(**data)
        db.session.add(new)
        db.session.commit()


    # For schedule package generation
    @classmethod
    def get_available_details(cls, subject_ids, edu_lvl_id, intake_year, time_window):
        """Return available class_details for given subjects and edu level, excluding already used in same year."""
        from models.class_model import Class
        from models.schedule_package_model import Schedule_Package  # avoid circular

        # Step 1: get already_used_class_detail_id in the intake year
        used_ids = Schedule_Package.get_already_used_class_detail_ids(intake_year)

        # Step 2: Startup check — filter out  class_detail based on subject belongs edu_lvl and subject_ids
        query = (
            db.session.query(cls)
            .join(Class, cls.class_id == Class.class_id)
            .join(Subject, Class.subject_id == Subject.subject_id)
            .filter(Subject.edu_lvl_id == edu_lvl_id)
            .filter(Subject.subject_id.in_(subject_ids))
            .filter(Subject.status == '1')        # Active Subject
            .filter(Class.status == '1')          # Active class
            .filter(cls.status == '1')            # Active class_detail
            .filter(Class.is_open_for_schedule == '1') # Only classes want to be included in schedule
        )

        # Step 3: filter out already scheduled's class_detail
        if used_ids:
            query = query.filter(~cls.class_detail_id.in_(used_ids))

        # Step 4: filter based on time window
        if time_window == 'M':
            query = query.filter(
                or_(
                    cls.start_time == None,  # include unassigned
                    cls.start_time >= time(8, 0)
                ),
                or_(
                    cls.end_time == None,    # include unassigned
                    cls.end_time <= time(12, 0)
                )
            )
        elif time_window == 'A':
            query = query.filter(
                or_(cls.start_time == None, cls.start_time >= time(13, 0)),
                or_(cls.end_time == None, cls.end_time <= time(21, 0))
            )
        elif time_window == 'F':
            query = query.filter(
                or_(cls.start_time == None, cls.start_time >= time(8, 0)),
                or_(cls.end_time == None, cls.end_time <= time(21, 0))
            )

        all_details = query.all()

    
        # Step 5: break to assigned / unassigned
        assigned = [d for d in all_details if d.start_time is not None and d.end_time is not None]
        unassigned = [d for d in all_details if d.start_time is None or d.end_time is None]

        print("Assigned class details:", [d.class_detail_id for d in assigned])
        print("Unassigned class details:", [d.class_detail_id for d in unassigned])

        return {
            "assigned": assigned,
            "unassigned": unassigned
        }
    

    @staticmethod
    def get_class_detail(class_detail_id):
        return Class_Detail.query.filter_by(class_detail_id=class_detail_id).first()
