from models import db

class Education_Lvl(db.Model):
    __tablename__ = 'education_level'

    edu_lvl_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(1), default='1')

    # Add this relationship
    students = db.relationship("Student", back_populates="education_level")
    subjects = db.relationship("Subject", back_populates="education_level", cascade="all, delete-orphan")
    schedule_packages = db.relationship("Schedule_Package", back_populates="education_level", cascade="all, delete-orphan")
    evaluation_levels = db.relationship("EvaluationLevel", back_populates="education_level", cascade="all, delete-orphan")

    
    @staticmethod
    def get_all():
        return Education_Lvl.query.all()

    @staticmethod
    def get_active_lvl():
        return Education_Lvl.query.filter_by(status='1').all()

    @staticmethod
    def get_by_id(id, status=None):
        query = Education_Lvl.query.filter_by(edu_lvl_id=id)
        if status is not None:
            query = query.filter_by(status=status)
        return query.first()

    @staticmethod
    def add(data):
        new_lvl = Education_Lvl(
            name=data['name'],
            description=data.get('description'),
            status='1'
        )
        db.session.add(new_lvl)
        db.session.commit()
        return new_lvl