from models import db
from .system_user_model import System_User
from .education_lvl_model import Education_Lvl

class Student(db.Model):
    __tablename__ = 'student'

    student_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("system_user.user_id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("parent.parent_id"), nullable=False)
    edu_lvl_id = db.Column(db.Integer, db.ForeignKey("education_level.edu_lvl_id"), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    payment_status = db.Column(db.String(5), default='0', nullable=False)

    # Relationships
    user = db.relationship("System_User", back_populates="student")
    parent = db.relationship("Parent", back_populates="students")
    education_level = db.relationship("Education_Lvl", back_populates="students")
    enrollments = db.relationship("Class_Enrollment", back_populates="student")
    payments = db.relationship("Payment", back_populates="student")

    attendance_records = db.relationship("Attendance", back_populates="student")

    # ✅ FIXED (plural form)
    other_service_attendances = db.relationship(
        "Other_Service_Attendance",
        back_populates="student",
        cascade="all, delete-orphan"
    )
     # ✅ Add this to fix the submission relationship
    submissions = db.relationship(
        "Submission",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    service_enrollments = db.relationship("Service_Enrollment", back_populates="student", cascade="all, delete-orphan")
    evaluation_results = db.relationship("StudentEvaluationResult", back_populates="student", cascade="all, delete-orphan")

    @staticmethod
    def get_active_student():
        students = (
            Student.query
            .join(System_User)
            .filter(
                System_User.status == '1'
            )
            .all()
        )
        return students

    @staticmethod
    def get_by_edu_lvl_id(edu_lvl_id):
        from models.education_lvl_model import Education_Lvl  # to avoid circular import

        # Check if the education level exists
        edu_lvl = Education_Lvl.get_by_id(edu_lvl_id)
        if not edu_lvl:
            return None  # return None if not found

        # Otherwise, return subjects belonging to it
        students = (
            Student.query
            .join(System_User)
            .filter(
                Student.edu_lvl_id == edu_lvl_id,
                System_User.status == '1'
            )
            .all()
        )
        return students
    
    @staticmethod
    def get_by_id(id):
        return Student.query.get(id)
    
    @staticmethod
    def get_by_parent_id(parent_id: int):
        """Return all students belonging to a specific parent"""
        return (
            Student.query
            .join(System_User)
            .filter(
                Student.parent_id == parent_id,
                System_User.status == '1'
            )
            .all()
        )
    
    @staticmethod
    def serialize(student):
        """Convert student ORM object to JSON serializable dict"""
        return {
            "student_id": student.student_id,
            "name": getattr(student.user, "name", None),
            "parent_id": student.parent_id,
            "email": getattr(student.user, "email", None),
            "gender": getattr(student.user, "gender", None),
            "dob": str(student.user.dob) if student.user.dob else None,
            "edu_lvl_id": student.edu_lvl_id,
            "edu_level_name": getattr(student.education_level, "name", None),
            "age": student.age,
            "payment_status": student.payment_status,
            "status": getattr(student.user, "status", None),
        }