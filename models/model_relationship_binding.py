from .student_model import Student
from .class_model import Class
from .class_enrollment_model import Class_Enrollment

from models import db

Class_Enrollment.student_ = db.relationship(
    'Student',
    back_populates='enrollments'
)

Class_Enrollment.class_ = db.relationship(
    'Class',
    back_populates='enrollments'
)

Student.enrollments = db.relationship(
    'Class_Enrollment',
    back_populates='student_',
    cascade='all, delete-orphan'
)

Class.enrollments = db.relationship(
    'Class_Enrollment',
    back_populates='class_',
    cascade='all, delete-orphan'
)
