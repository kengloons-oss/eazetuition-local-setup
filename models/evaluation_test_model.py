from models import db

class Evaluation_Test(db.Model):
    __tablename__ = 'evaluation_test'

    test_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('evaluation_upload.upload_id'), nullable=True)
    test_level = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=True)

    # 用字符串延迟解析，避免循环导入
    
    results = db.relationship("StudentEvaluationResult", back_populates="test")
