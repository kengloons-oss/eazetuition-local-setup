from models import db

class Attendance(db.Model):
    __tablename__ = 'attendance'

    attendance_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('class_session.session_id'), nullable=False)
    attendance_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), nullable=False)

    # ✅ Fixed: back_populates now matches "attendance_records" in Student model
    student = db.relationship("Student", back_populates="attendance_records")
    class_session = db.relationship("Class_Session", back_populates="attendances")
