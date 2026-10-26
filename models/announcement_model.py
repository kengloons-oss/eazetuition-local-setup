from models import db

class Announcement(db.Model):
    __tablename__ = 'announcement'

    announcement_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    expiry_at = db.Column(db.DateTime, nullable=False)
    target_role = db.Column(db.String(50), nullable=False)


