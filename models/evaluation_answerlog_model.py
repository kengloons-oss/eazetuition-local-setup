from models import db


class EvaluationAnswerLog(db.Model):
    __tablename__ = 'evaluationanswerlog'

    answer_id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    result_id = db.Column(db.Integer, db.ForeignKey('studentevaluationresult.result_id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('evaluationquestion.question_id'), nullable=False)

    selected_answer = db.Column(db.CHAR(1))
    is_correct = db.Column(db.Boolean)

    # Relationships
    result = db.relationship("StudentEvaluationResult", back_populates="answer_logs")
    question = db.relationship("EvaluationQuestion", back_populates="answer_logs")
    