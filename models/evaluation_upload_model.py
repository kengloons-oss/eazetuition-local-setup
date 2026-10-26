from models import db

class Evaluation_Upload(db.Model):
    __tablename__ = 'evaluation_upload'

    upload_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    filename = db.Column(db.String(255), nullable=True)
    uploaded_by = db.Column(db.Integer, nullable=True)
    upload_time = db.Column(db.DateTime, nullable=True)

