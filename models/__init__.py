from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


from .discount_metrics_model import Discount_Metric
from .education_lvl_model import Education_Lvl
from .system_user_model import System_User
from .parent_model import Parent
from .student_model import Student
from .tutor_model import Tutor

#============================================================================
from .announcement_model import Announcement
from .attendance_model import Attendance   # <-- add this import
from .class_session_model import Class_Session


# from .evaluation_answerlog_model import EvaluationAnswerLog
# from .evaluation_metrics_model import Evaluation_Metrics
# from .evaluation_question_model import EvaluationQuestion
# from .evaluation_test_model import Evaluation_Test
# from .evaluation_upload_model import Evaluation_Upload
# from .evaluationLevel_model import EvaluationLevel
# from .student_evaluate_result_model import StudentEvaluationResult

# from .homework_model import Homework
# from .submission_model import Submission

from .other_service_attendance_model import Other_Service_Attendance

#============================================================================
from .chat_room_model import Chat_Room, Chat_Room_Member, Message

from .subject_model import Subject
from .class_model import Class
from .class_detail_model import Class_Detail
from .class_enrollment_model import Class_Enrollment

from .other_service_model import Other_Service
from .other_service_session_model import Other_Service_Session
from .service_enrollment_model import Service_Enrollment

from .time_schedule_model import Time_Schedule

from .payment_model import Payment, Payment_Detail
from .schedule_package_model import Schedule_Package, Schedule_Package_Set, Package_Set_Detail



