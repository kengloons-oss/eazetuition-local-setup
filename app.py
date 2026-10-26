# app.py
import os
from threading import Thread
from flask import Flask, send_from_directory, request, session, redirect
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from flask_mail import Mail
from models import db  
from helper import Helper
from dotenv import load_dotenv

from tasks.class_session_tasks import class_session_autoupdate_loop
from tasks.payment_tasks import scheduler_loop
load_dotenv()

# Import models
from models.education_lvl_model import Education_Lvl
from models.student_model import Student
from models.evaluation_question_model import EvaluationQuestion

#kengloon controller part
from controllers.auth_controller import auth_bp
from controllers.evaluation_controller import evaluation_bp
from controllers.home_controller import home_bp
from controllers.announcment_controller import notify_bp
from controllers.system_user_controller import system_user_bp
from controllers.attendance_controller import attendance_bp
from controllers.homework_controller import homework_bp
from controllers.student_controller import student_bp
from controllers.progress_controller import progress_bp

from controllers.dashboard_controller import dashboard_bp
from controllers.subject_controller import subject_bp
from controllers.education_controller import education_bp
from controllers.class_controller import class_bp
from controllers.schedule_package_controller import schedule_package_bp
from controllers.other_service_controller import service_bp
from controllers.payment_controller import payment_bp
from controllers.chat_controller import chat_bp

# Initialize Flask app
app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads", "homework")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Add pictures folder configuration
PROFILES_FOLDER  = os.path.join(os.getcwd(), "uploads", "profiles")
os.makedirs(PROFILES_FOLDER , exist_ok=True)
app.config["PROFILES_FOLDER"] = PROFILES_FOLDER 


app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    "DATABASE_URI",
    "mysql+mysqlconnector://root:@localhost/tuition_fyp",
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv("SECRET_KEY", "local-dev-key-change-before-deploy")

# Enable CORS for HTTP routes (all origins)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO for real-time features (allow all origins)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)


# Initialize Mail
app.config.update(
    MAIL_SERVER=os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
    MAIL_PORT=int(os.getenv('MAIL_PORT', '587')),
    MAIL_USE_TLS=os.getenv('MAIL_USE_TLS', 'true').lower() == 'true',
    MAIL_USE_SSL=os.getenv('MAIL_USE_SSL', 'false').lower() == 'true',
    MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
    MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
    MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER', 'noreply@tuitionapp.com')
)
mail = Mail(app)

# Pictures file serving route - ADD THIS HERE
@app.route('/uploads/profiles/<path:filename>')
def serve_pictures(filename):
    return send_from_directory('uploads/profiles', filename)

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(dashboard_bp)
app.register_blueprint(subject_bp)
app.register_blueprint(education_bp)
app.register_blueprint(class_bp)
app.register_blueprint(schedule_package_bp)
app.register_blueprint(service_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(student_bp)

#kengloon part
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(evaluation_bp, url_prefix="/evaluation")
app.register_blueprint(home_bp, url_prefix="/home")
app.register_blueprint(notify_bp, url_prefix="/announcement")
app.register_blueprint(attendance_bp, url_prefix="/attendance")
app.register_blueprint(homework_bp, url_prefix="/homework")
app.register_blueprint(progress_bp, url_prefix="/progress")
app.register_blueprint(system_user_bp, url_prefix="/users")

# Make Helper globally available in templates
app.jinja_env.globals['Helper'] = Helper

# Create database tables if they don't exist
with app.app_context():
    db.create_all()

@app.route('/')
def root_redirect():
    # If admin is already logged in, go to dashboard
    if "admin_id" in session:
        return redirect("/users/parents/list")
    # Otherwise, go to login
    return redirect("/auth/admin/login")

# Run app
if __name__ == '__main__':
    Thread(target=scheduler_loop, daemon=True).start()
    Thread(target=class_session_autoupdate_loop, args=(app,), daemon=True).start()
    # Accessible from LAN
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False, log_output=True)

