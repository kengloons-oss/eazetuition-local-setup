from models import db

class Other_Service_Session(db.Model):
    __tablename__ = 'other_service_session'

    session_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    service_id = db.Column(db.Integer, db.ForeignKey('other_service.service_id'), nullable=False)
    tutor_id = db.Column(db.Integer, db.ForeignKey('tutor.tutor_id'), nullable=False)
    service_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    # Relationships
    service = db.relationship("Other_Service", back_populates="sessions")
    tutor = db.relationship("Tutor", back_populates="other_service_sessions")
    attendances = db.relationship("Other_Service_Attendance", back_populates="session", cascade="all, delete-orphan")

