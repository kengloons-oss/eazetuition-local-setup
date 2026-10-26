from models import db
class EvaluationQuestion(db.Model):
    __tablename__ = 'evaluationquestion'

    question_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    test_id = db.Column(db.Integer, db.ForeignKey('evaluation_test.test_id'), nullable=False)

    question_text = db.Column(db.Text)
    option_a = db.Column(db.Text)
    option_b = db.Column(db.Text)
    option_c = db.Column(db.Text)
    option_d = db.Column(db.Text)
    correct_answer = db.Column(db.CHAR(1))

    answer_logs = db.relationship("EvaluationAnswerLog", back_populates="question")
