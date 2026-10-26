from models import db

class StudentEvaluationResult(db.Model):
    __tablename__ = 'studentevaluationresult'

    result_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    test_id = db.Column(db.Integer, db.ForeignKey('evaluation_test.test_id'), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.student_id'), nullable=True)
    score = db.Column(db.Integer, nullable=True)
    level_name = db.Column(db.String(100), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    student = db.relationship("Student", back_populates="evaluation_results")
    test = db.relationship("Evaluation_Test", back_populates="results")
    answer_logs = db.relationship(
        "EvaluationAnswerLog", back_populates="result", cascade="all, delete-orphan"
    )
