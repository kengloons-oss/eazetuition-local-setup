from models import db

class Homework(db.Model):
    __tablename__ = 'homework'

    homework_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    homework_subject = db.Column(db.String(100), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    create_by = db.Column(db.Integer, db.ForeignKey('tutor.tutor_id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('class.class_id'), nullable=True)
    description = db.Column(db.Text, nullable=True)

    # Relationships
    tutor = db.relationship("Tutor")
    class_ = db.relationship("Class")
    submissions = db.relationship("Submission", back_populates="homework", cascade="all, delete-orphan")
    evaluation_metrics = db.relationship("Evaluation_Metrics", back_populates="homework", uselist=False)
