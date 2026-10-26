from models import db
from datetime import datetime

class EvaluationLevel(db.Model):
    __tablename__ = 'evaluationlevel'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    score = db.Column(db.Integer, nullable=False)   # 例如: 0~10 或者分数区间上限
    edu_lvl_id = db.Column(db.Integer, db.ForeignKey("education_level.edu_lvl_id"), nullable=False)
    level_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationship — 方便 join 查询
    education_level = db.relationship("Education_Lvl", back_populates="evaluation_levels")

    def __repr__(self):
        return f"<EvaluationLevel {self.id} score={self.score} level={self.level_name}>"
