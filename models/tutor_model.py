from models import db
from .system_user_model import System_User

class Tutor(db.Model):
    __tablename__ = "tutor"

    tutor_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("system_user.user_id"), nullable=False)
    tel_no = db.Column(db.String(15), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    position = db.Column(db.String(50), nullable=False)
    salary = db.Column(db.Numeric(10,2), nullable=False)

    # relationships
    user = db.relationship("System_User", back_populates="tutor")
    classes = db.relationship("Class", back_populates="tutor")
    other_service_sessions = db.relationship("Other_Service_Session", back_populates="tutor")
    
    @staticmethod
    def get_active_tutors():
        """Return all tutors whose linked system user is active (status = 1)."""
        return (
            db.session.query(Tutor)
            .join(System_User)
            .filter(System_User.status == '1')
            .all()
        )