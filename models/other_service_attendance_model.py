from models import db

class Other_Service_Attendance(db.Model):
    __tablename__ = 'other_service_attendance'

    other_service_att_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('other_service_session.session_id'), nullable=False)
    attendance_time = db.Column(db.DateTime, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False)

    # ✅ Relationship matches Student model
    student = db.relationship("Student", back_populates="other_service_attendances")
    session = db.relationship("Other_Service_Session", back_populates="attendances")
