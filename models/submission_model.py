from models import db

class Submission(db.Model):
    __tablename__ = 'submission'

    submission_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=False)
    homework_id = db.Column(db.Integer, db.ForeignKey('homework.homework_id'), nullable=False)
    extension_file = db.Column(db.String(255))
    comment = db.Column(db.Text)
    status = db.Column(db.String(20), default="Pending")
    upload_time = db.Column(db.DateTime)
    graded_time = db.Column(db.DateTime)
    grade = db.Column(db.Float, nullable=True)         
    ai_grade = db.Column(db.Float, nullable=True)      
    feedback_from_tutor = db.Column(db.Text, nullable=True)
    feedback_from_ai = db.Column(db.Text, nullable=True)

    student = db.relationship("Student", back_populates="submissions")
    homework = db.relationship("Homework", back_populates="submissions")
