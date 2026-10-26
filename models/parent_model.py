from models import db
from .system_user_model import System_User

class Parent(db.Model):
    __tablename__ = 'parent'

    parent_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("system_user.user_id"), nullable=False)
    tel_no = db.Column(db.String(15), nullable=False)
    occupation = db.Column(db.String(100))

    # relationships
    user = db.relationship("System_User", back_populates="parent")
    students = db.relationship("Student", back_populates="parent")
