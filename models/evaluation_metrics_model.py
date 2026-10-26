from models import db

class Evaluation_Metrics(db.Model):
    __tablename__ = 'evaluation_metrics'

    evaluation_metrics_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    homework_id = db.Column(db.Integer, db.ForeignKey('homework.homework_id'), nullable=True)

    extension_file = db.Column(db.String(255), nullable=True)
    homework_subject = db.Column(db.String(100), nullable=True)
    comment = db.Column(db.Text, nullable=True)

    accuracy = db.Column(db.Float, nullable=True)
    precision_score = db.Column(db.Float, nullable=True)
    recall = db.Column(db.Float, nullable=True)
    f1_score = db.Column(db.Float, nullable=True)
    loss = db.Column(db.Float, nullable=True)

    # Relationship (many-to-one)
    homework = db.relationship("Homework", back_populates="evaluation_metrics")
