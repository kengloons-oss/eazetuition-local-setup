from models import db

class Class_Session(db.Model):
    __tablename__ = 'class_session'

    session_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('time_schedule.schedule_id'), nullable=False)
    schedule_datetime = db.Column(db.DateTime, nullable=False)
    attendance_code = db.Column(db.String(20))
    code_expiry_datetime = db.Column(db.DateTime)

    # Relationships
    attendances = db.relationship("Attendance", back_populates="class_session")
    time_schedule = db.relationship("Time_Schedule", back_populates="class_sessions")
