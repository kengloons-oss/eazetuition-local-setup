from models import db

class System_User(db.Model):
    __tablename__ = 'system_user'

    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    ic_no = db.Column(db.String(50))
    gender = db.Column(db.String(10))
    dob = db.Column(db.Date)
    address = db.Column(db.String(255))
    status = db.Column(db.String(20), nullable=False, default='1')
    type = db.Column(db.String(20), nullable=False)  # parent/student/tutor
    profile_pic = db.Column(db.String(255))

    # relationships
    parent = db.relationship("Parent", back_populates="user", uselist=False)
    student = db.relationship("Student", back_populates="user", uselist=False)
    tutor = db.relationship("Tutor", back_populates="user", uselist=False)

    chat_room_members = db.relationship("Chat_Room_Member", back_populates="user", cascade="all, delete-orphan")
    chat_rooms_created = db.relationship("Chat_Room", back_populates="creator", cascade="all, delete-orphan")
    messages_sent = db.relationship("Message", back_populates="sender", cascade="all, delete-orphan")

    @staticmethod
    def get_by_id(id):
        return System_User.query.get(id)
