import re
import os
import base64
from io import BytesIO
from sqlalchemy import func
from PIL import Image
from time import time   
from functools import wraps
from flask import request, jsonify, current_app, session, render_template,url_for, Blueprint,redirect
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import date
from models import db
from models.system_user_model import System_User
from models.parent_model import Parent
import random, datetime
from flask_mail import Message
from extensions import mail
from models.student_model import Student
from models.education_lvl_model import Education_Lvl
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

auth_bp = Blueprint("auth_bp", __name__)

#Goolge_Client_ID 
GOOGLE_CLIENT_ID = "255070625857-pqqv7sqdb1htl52b9p1ko30gpjk3lojv.apps.googleusercontent.com"  # 必填！

#Storing OTP(number, expires_date)
otp_storing = {}

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Regex patterns
IC_PATTERN = re.compile(r"^\d{6}-\d{2}-\d{4}$")
TEL_PATTERN = re.compile(r"^\+60\d{1,2}-\d{7,8}$")
EMAIL_PATTERN = re.compile(r"^[^@]+@[^@]+\.[^@]+$")

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")
    tel_no = data.get("tel_no")
    occupation = data.get("occupation") or "N/A"
    gender = data.get("gender") or "M"

    # =======================
    # 🔍 VALIDATION FIRST
    # =======================
    if not all([name, email, password, confirm_password, tel_no]):
        return jsonify({"error": "All fields are required"}), 400

    if not EMAIL_PATTERN.match(email):
        return jsonify({"error": "Invalid email format. Example: user@example.com"}), 400

    if not TEL_PATTERN.match(tel_no):
        return jsonify({"error": "Invalid Malaysian phone number format. Example: +6012-3456789"}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if not any(c.islower() for c in password):
        return jsonify({"error": "Password must include at least one lowercase letter"}), 400

    if not any(c.isupper() for c in password):
        return jsonify({"error": "Password must include at least one uppercase letter"}), 400

    if not any(c.isdigit() for c in password):
        return jsonify({"error": "Password must include at least one number"}), 400

    # Check if user exists
    existing_user = System_User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    # =======================
    # 🔧 SAFE DATABASE PART
    # =======================
    try:
        hashed_password = generate_password_hash(password)

        new_user = System_User(
            name=name,
            email=email,
            password=hashed_password,
            gender=gender,
            type="parent",
            status="1"
        )
        db.session.add(new_user)
        db.session.commit()  # commit to get user_id

        new_parent = Parent(
            user_id=new_user.user_id,
            tel_no=tel_no,
            occupation=occupation
        )
        db.session.add(new_parent)
        db.session.commit()

        # Send welcome email
        msg = Message(
            subject="Welcome to Tuition App",
            sender="noreply@tuitionapp.com",
            recipients=[email],
            body=f"Hello {name}, your account has been created successfully!"
        )
        mail.send(msg)

        return jsonify({"message": "Account created successfully"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = System_User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid email"}), 401

 
    if not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid password"}), 401
    
  
    if user.status != "1":  
        return jsonify({"error": "User is inactive. Please contact admin."}), 403

  
    user_info = {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "type": user.type,
        "gender": user.gender
    }

    if user.type == "parent" and user.parent:
        user_info.update({
            "parent_id": user.parent.parent_id,
            "tel_no": user.parent.tel_no,
            "occupation": user.parent.occupation,
            "students" : [s.student_id for s in user.parent.students]
        })
    elif user.type == "student" and user.student:
        user_info.update({
            "student_id": user.student.student_id,
            "parent_id": user.student.parent_id,
            "edu_lvl_id": user.student.edu_lvl_id,
            "age": user.student.age,
            "payment_status": user.student.payment_status
        })
    elif user.type == "tutor" and user.tutor:
        user_info.update({
            "tutor_id": user.tutor.tutor_id,
            "tel_no": user.tutor.tel_no,
            "age": user.tutor.age,
            "position": user.tutor.position,
            "salary": float(user.tutor.salary)
        })

    return jsonify({"message": "Login successful", "user": user_info}), 200

@auth_bp.route("/admin/login", methods=["GET"])
def login_page():
    if "admin_id" in session:
        return redirect("/users/parents/list")
    
    show_modal = request.args.get("show_modal", default=0, type=int)
    return render_template("admin/login.html", show_modal=show_modal)

# ---------------- Admin Login ----------------

login_attempts = {}

@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid request format. Expected JSON."
        }), 400

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username:
        return jsonify({"success": False, "error": "Username is required"}), 400
    if not password:
        return jsonify({"success": False, "error": "Password is required"}), 400

    ip = request.remote_addr

    if ip not in login_attempts:
        login_attempts[ip] = {"count": 0, "time": time()}

    attempt_info = login_attempts[ip]

    if time() - attempt_info["time"] > 60:
        attempt_info["count"] = 0
        attempt_info["time"] = time()

    if attempt_info["count"] >= 10:
        return jsonify({
            "success": False,
            "error": "Too many login attempts. Try again after 1 minute."
        }), 429

    try:
        user = System_User.query.filter(
            func.lower(System_User.name) == username.lower(),
            (System_User.type.is_(None) | (System_User.type == ''))
        ).first()
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Server error during lookup.",
            "details": str(e)
        }), 500

    if not user:
        attempt_info["count"] += 1
        return jsonify({"success": False, "error": "Admin not found"}), 404


    if not check_password_hash(user.password, password):
        attempt_info["count"] += 1
        return jsonify({"success": False, "error": "Invalid password"}), 401

    session["admin_id"] = user.user_id

    # Reset attempts after success
    attempt_info["count"] = 0

    return jsonify({
        "success": True,
        "message": "Login successful",
        "admin_id": user.user_id,
        "redirect": "/dashboard/"
    }), 200

@auth_bp.route("/check-session", methods=["GET"])
def check_admin_session():
    return jsonify({"logged_in": "admin_id" in session})

@auth_bp.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin_id", None)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@auth_bp.route("/addStudent", methods=["POST"])
def addStudent():
    data = request.get_json()
    parent_id = data.get("parent_id")
    name = data.get("name")
    email = data.get("email")
    gender = data.get("gender")
    ic_no = data.get("ic_no")
    age = data.get("age")
    password = data.get("password")
    confirmPassword = data.get("confirmPassword")


    if not all([parent_id, name, gender, age, password, confirmPassword, ic_no, email]):
        return jsonify({"error": "Missing required fields"}), 400
    
    if not EMAIL_PATTERN.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    parent = Parent.query.filter_by(parent_id=parent_id).first()
    if not parent:
        return jsonify({"error": "Parent does not exist"}), 404

    try:
        defaultEducationLevel = Education_Lvl.query.filter_by(name='None', status='1').first()
        if not defaultEducationLevel:
            return jsonify({"error": "Default education level (None) not found"}), 500

        new_user = System_User(
            name=name,
            email = email,
            password=generate_password_hash(password),
            ic_no = ic_no,
            gender=gender,
            dob=date.today(),
            type='student',
            status='1'
        )
        db.session.add(new_user)
        db.session.flush()

        new_student = Student(
            user_id=new_user.user_id,
            parent_id=parent_id,
            edu_lvl_id=defaultEducationLevel.edu_lvl_id,
            age=age,
            payment_status='0'
        )
        db.session.add(new_student)
        db.session.commit()

        return jsonify({
            "message": "Student created successfully",
            "student_id": new_student.student_id,
            "user_id": new_user.user_id,
            "education_level": defaultEducationLevel.name
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@auth_bp.route("/forgotPassword", methods=["POST"])
def forgotPassword():
    try:
        data = request.get_json()
        email = data.get("email")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        user = System_User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Email not found"}), 404

        mail_username = current_app.config.get("MAIL_USERNAME")
        mail_password = current_app.config.get("MAIL_PASSWORD")
        if not mail_username or not mail_password:
            return jsonify({"error": "Password reset email is not configured. Set MAIL_USERNAME and MAIL_PASSWORD in .env."}), 503

        otp_code = str(random.randint(10000, 99999))
        expire_time = datetime.datetime.now() + datetime.timedelta(minutes=5)

        msg = Message(
            subject="EazeTuition Password Reset OTP",
            sender=mail_username,
            recipients=[email],
            body=f"Your OTP code is: {otp_code}. It is valid for 5 minutes."
        )
        
        mail.send(msg)

        otp_storing[email] = {
            "otp": otp_code,
            "expires": expire_time
        }

        return jsonify({"message": "OTP has been sent to your email"}), 200
    except Exception as e:
        print("ForgotPassword error:", e)
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/verifyOTP", methods=["POST"])
def verifyOTP():
    data = request.get_json()
    email = data.get("emailVerify")
    otp_code = data.get("otp_code")

    if not email or not otp_code:
        return jsonify({"error": "Email and OTP are required"}), 400

    otp_data = otp_storing.get(email)
    if not otp_data:
        return jsonify({"error": "No OTP found for this email"}), 404
    
    
    if datetime.datetime.now() > otp_data["expires"]:
        otp_storing.pop(email, None)
        return jsonify({"error": "OTP expired"}), 400
    
    
    if str(otp_code) != otp_data["otp"]:
         return jsonify({"error": "Invalid OTP"}), 400
    
    otp_storing[email]["verified"] = True
    return jsonify({"message": "OTP verified successfully"}), 200

@auth_bp.route("/resetPassword", methods=["POST"])
def resetPassword():
    data = request.get_json()
    email = data.get("email")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not email or not new_password or not confirm_password:
        return jsonify({"error": "Missing required fields"}), 400

    if confirm_password != new_password:
        return jsonify({"error": "Passwords do not match"}), 400

    password = new_password

    # ✅ Password validation rules
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if not any(c.islower() for c in password):
        return jsonify({"error": "Password must include at least 1 lowercase letter"}), 400

    if not any(c.isupper() for c in password):
        return jsonify({"error": "Password must include at least 1 uppercase letter"}), 400

    if not any(c.isdigit() for c in password):
        return jsonify({"error": "Password must include at least 1 number"}), 400


    otp_data = otp_storing.get(email)
    if not otp_data or not otp_data.get("verified"):
        return jsonify({"error": "OTP not verified"}), 403

    user = System_User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Save new password
    user.password = generate_password_hash(password)
    db.session.commit()

    # Clear stored OTP
    otp_storing.pop(email, None)

    return jsonify({"message": "Password reset successfully"}), 200


@auth_bp.route("/googleLogin", methods=["POST"])
def loginWithGoogle():
    data = request.get_json()
    id_token_str = data.get("id_token")
    
    if not id_token_str:
        return jsonify({"error": "Missing Google ID token"}), 400
    
    try:
        id_info = id_token.verify_oauth2_token(
            id_token_str,
            grequests.Request(),
            GOOGLE_CLIENT_ID
        )

        
        email = id_info.get("email")
        name = id_info.get("name")
        
        if not email:
            return jsonify({"error": "No email in Google token"}), 400

        
        parent = Parent.query.filter_by(email=email).first()

        if parent:
            
            has_student = len(parent.students) > 0
            
            return jsonify({
                "message": "Login successful",
                "user_id": parent.user_id,
                "role": "parent",
                "name": parent.name,
                "email": parent.email,
                "tel_no": parent.tel_no,
                "parent_id": parent.parent_id,
                "has_student": has_student  
            }), 200
        
        
        new_parent = Parent(
            name=name or email.split('@')[0],
            password=generate_password_hash(str(random.randint(100000, 999999))),
            ic_no=f"google-{int(datetime.now().strftime('%y%m%d%H%M%S'))}",
            gender="M",
            dob=date.today(),
            address=None,
            status="1",
            type="parent",
            tel_no="+60-Unknown",
            email=email,
            occupation="N/A"
        )

        db.session.add(new_parent)
        db.session.commit()
        
        return jsonify({
            "message": "Registered successfully",
            "user_id": new_parent.user_id,
            "role": "parent",
            "name": new_parent.name,
            "email": new_parent.email,
            "parent_id": new_parent.parent_id,
            "has_student": False  
        }), 201

    except ValueError as e:
        print(f"Google token verification failed: {e}")
        return jsonify({"error": "Invalid Google token"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Google login error: {e}")
        return jsonify({"error": "Internal server error"}), 500
        
@auth_bp.route("/profileDisplay", methods=["GET"])
def profileDisplay():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    user = System_User.query.filter_by(user_id=user_id).first()

    if not user:
        return jsonify({"error": "User Not Foud !!!!!!!"}), 404
    
    userDetails = {
        "user_id":  user.user_id,
        "name": user.name,
        "email": user.email,
        "ic_no": user.ic_no,
        "gender": user.gender,
        "address": user.address,
        "type": user.type,
        "profile_pic": user.profile_pic,
    }

    if user.type == "parent" and user.parent:
        userDetails.update({
            "tel_no": user.parent.tel_no,
            "occupation": user.parent.occupation,
            "students": [s.student_id for s in user.parent.students]
        })

    elif user.type == "student" and user.student:
        userDetails.update({
            "student_id": user.student.student_id,
            "age": user.student.age,
            "payment_status": user.student.payment_status
        })

    
    elif user.type == "tutor" and user.tutor:
        userDetails.update({
            "tutor_id": user.tutor.tutor_id,
            "tel_no": user.tutor.tel_no,
            "position": user.tutor.position,
        })

    return jsonify({"profile": userDetails}), 200
    
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image_file(file_data, filename, user_id):
    try:

        upload_dir = current_app.config["PROFILES_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)
        
       
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'jpg'
        new_filename = f"user_{user_id}_{int(datetime.datetime.now().timestamp())}.{file_ext}"
        file_path = os.path.join(upload_dir, new_filename)
        
        
        if ',' in file_data:
            file_data = file_data.split(',')[1]
        
        
        image_data = base64.b64decode(file_data)
        
        
        img = Image.open(BytesIO(image_data))
        if img.size[0] > 800 or img.size[1] > 800:
            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
        
        
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        img.save(file_path, 'JPEG' if file_ext in ['jpg', 'jpeg'] else file_ext.upper(), quality=85)
        
        
        return new_filename
        
    except Exception as e:
        print(f"Error saving image: {e}")
        return None

@auth_bp.route("/uploadProfileImage", methods=["POST"])
def upload_profile_image():
    try:
        user_id = request.form.get('user_id')
        image_data = request.form.get('image_data')  
        
        if not user_id or not image_data:
            return jsonify({"error": "User ID and image data are required"}), 400
        
        if len(image_data) > MAX_FILE_SIZE:
            return jsonify({"error": "File too large"}), 400
        
        user = System_User.query.filter_by(user_id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        
        filename = f"profile_{user_id}.jpg"
        saved_filename = save_image_file(image_data, filename, user_id)
        
        if not saved_filename:
            return jsonify({"error": "Failed to save image"}), 500
        
        
        base_url = request.host_url.rstrip('/')
        user.profile_pic = f"{base_url}/uploads/profiles/{saved_filename}"
        
        db.session.commit()
        
        return jsonify({
            "message": "Profile image uploaded successfully",
            "profile_pic": user.profile_pic
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/updateProfile", methods=["POST"])
def profileUpdate():
    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    user = System_User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    
    protected_fields = ["email", "ic_no", "position", "salary"]
    for field in protected_fields:
        data.pop(field, None)

    try:
        
        if "profile_pic" in data and data["profile_pic"]:
            profile_pic = data["profile_pic"]
            
            
            if profile_pic.startswith('data:image/'):
                filename = f"profile_{user_id}.jpg"
                saved_filename = save_image_file(profile_pic, filename, user_id)
                
                if saved_filename:
                    base_url = request.host_url.rstrip('/')
                    user.profile_pic = f"{base_url}/uploads/profiles/{saved_filename}"
                else:
                    return jsonify({"error": "Failed to process profile image"}), 400
            else:
                
                user.profile_pic = profile_pic

        
        if "name" in data and data["name"]:
            user.name = str(data["name"]).strip()

        if "gender" in data and data["gender"]:
            user.gender = str(data["gender"]).strip()

        if "address" in data:
            user.address = str(data["address"]) if data["address"] is not None else None

        
        if user.type == "parent" and user.parent:
            parent = user.parent
            
            if "tel_no" in data:
                parent.tel_no = str(data["tel_no"]) if data["tel_no"] is not None else parent.tel_no

            if "occupation" in data:
                parent.occupation = str(data["occupation"]) if data["occupation"] is not None else parent.occupation

        elif user.type == "student" and user.student:
            student = user.student
            if "age" in data:
                try:
                    student.age = int(data["age"])
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid age value"}), 400
        
        elif user.type == "tutor" and user.tutor:
            tutor = user.tutor
            if "tel_no" in data:
                tutor.tel_no = str(data["tel_no"]) if data["tel_no"] is not None else tutor.tel_no
        
        db.session.commit()
        
        # Return updated profile
        profile = {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "ic_no": user.ic_no,
            "gender": user.gender,
            "address": user.address,
            "type": user.type,
            "profile_pic": user.profile_pic,
        }

        # Add role-specific fields
        if user.type == "parent" and user.parent:
            profile.update({
                "tel_no": user.parent.tel_no,
                "occupation": user.parent.occupation,
                "students": [s.student_id for s in user.parent.students]
            })
        elif user.type == "student" and user.student:
            profile.update({
                "student_id": user.student.student_id,
                "age": user.student.age,
            })
        elif user.type == "tutor" and user.tutor:
            profile.update({
                "tutor_id": user.tutor.tutor_id,
                "tel_no": user.tutor.tel_no,
            })

        return jsonify({"message": "Profile updated", "profile": profile}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
