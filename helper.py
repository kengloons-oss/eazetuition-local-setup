# helper.py

import datetime
from datetime import time
from zoneinfo import ZoneInfo

from flask import flash, session

from models.system_user_model import System_User

LOCAL_TZ = ZoneInfo("Asia/Kuala_Lumpur")

def auth_admin():
    admin_id = session.get("admin_id")
    if not admin_id:
        flash("auth_failed", "auth")
        return False
    
    admin = System_User.query.filter_by(
        user_id=admin_id,
        status="1"
    ).first()

    # type 可以是 'admin' 或你系统设定的角色名
    if not admin or admin.type not in ["", None]:
        flash("auth_failed", "auth")
        session.pop("admin_id", None)
        return False

    return True


class Helper:
    @staticmethod
    def format_day_of_week(day_of_week):
        days = {
            '1': 'Mon',
            '2': 'Tue',
            '3': 'Wed',
            '4': 'Thu',
            '5': 'Fri',
            '6': 'Sat',
            '7': 'Sun'
        }
        return days.get(str(day_of_week), 'Unknown')
        
    @staticmethod
    def format_user_type(user_type):
        types = {
            'parent': 'parent',
            'tutor': 'tutor',
            'student': 'student',
            '': 'admin'
        }
        return types.get(str(user_type).upper(), 'Unknown')
    
    @staticmethod
    def format_class_type(class_type):
        types = {
            'N': 'Normal',
            'F': 'Focus'
        }
        return types.get(str(class_type).upper(), 'Unknown')

    @staticmethod
    def format_service_type(service_type):
        types = {
            '1': 'Daycare',
            '2': 'Transport',
            '3': 'Other'
        }
        return types.get(str(service_type), 'Unknown')

    @staticmethod
    def format_fee_type(fee_type):
        types = {
            '1': 'Pay Direct',
            '2': 'Deposit & Per Attendance'
        }
        return types.get(str(fee_type), 'Unknown')

    @staticmethod
    def format_payment_status(payment_status):
        types = {
            '0': 'Unpaid',
            '1': 'Paid',
            '2': 'Overdue',
            '3': 'Barred'
        }
        return types.get(str(payment_status), 'Unknown')

    @staticmethod
    def format_payment_method(payment_method):
        types = {
            '1': 'Cash',
            '2': 'Stripe',
            '3': 'Touch\'n Go'
        }
        return types.get(str(payment_method), 'N/A')

    @staticmethod
    def format_open_for_enrollment(status):
        mapping = {
            '1': 'Opened',
            '0': 'Closed'
        }
        return mapping.get(str(status), 'Unknown')
    
    @staticmethod
    def format_class_session_status(status):
        mapping = {
            '0': 'Cancelled',
            '1': 'Pending',
            '2': 'Ongoing',
            '3': 'Completed'
        }
        return mapping.get(str(status), 'Unknown')

    @staticmethod
    def format_class_session_type(type):
        mapping = {
            '1': 'Normal',
            '2': 'Replacement',
        }
        return mapping.get(str(type), 'Unknown')

    
    @staticmethod
    def format_time_12h(time_obj):
        """
        Accepts a time object or 'HH:MM:SS' string.
        Returns formatted time in 12-hour format (e.g., '02:30 PM').
        If None, returns None.
        """
        if time_obj is None:
            return 'null'  # or 'null' if you want a string

        if isinstance(time_obj, str):
            try:
                time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()
            except ValueError:
                return time_obj  # return original if not valid format

        return time_obj.strftime("%I:%M %p")  # e.g. 02:30 PM
    
    @staticmethod
    def format_full_datetime_12h(dt_obj, tz_name="Asia/Kuala_Lumpur"):
        """
        Convert UTC datetime to local timezone (default: Malaysia), 
        and return 'dd-mm-yyyy hh:mm AM/PM'.
        """
        if dt_obj is None:
            return 'null'

        # Parse string → datetime
        if isinstance(dt_obj, str):
            try:
                dt_obj = datetime.datetime.strptime(dt_obj, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return dt_obj  # if not parse-able, return original

        # Ensure it's timezone aware (assume UTC from DB)
        if dt_obj.tzinfo is None:
            dt_obj = dt_obj.replace(tzinfo=ZoneInfo("UTC"))

        # Convert to target timezone
        local_dt = dt_obj.astimezone(ZoneInfo(tz_name))

        return local_dt.strftime("%d-%m-%Y %I:%M %p")

    
    @staticmethod
    def format_full_date(dt_obj):
        """
        Accepts a datetime object or 'YYYY-MM-DD HH:MM:SS' string.
        Returns formatted datetime in 'dd-mm-yyyy hh:mm AM/PM'.
        """
        if dt_obj is None:
            return 'null'

        # If string, try to parse
        if isinstance(dt_obj, str):
            try:
                dt_obj = datetime.datetime.strptime(dt_obj, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return dt_obj  # return original if not valid format

        return dt_obj.strftime("%d-%m-%Y")
    
    @staticmethod
    def local_to_utc(local_str):
        if not local_str:
            return None

        try:
            # Try full datetime with seconds
            dt = datetime.datetime.strptime(local_str, "%Y-%m-%d %H:%M:%S")
        except Exception:
            try:
                # Try without seconds
                dt = datetime.datetime.strptime(local_str, "%Y-%m-%d %H:%M")
            except Exception:
                print("❌ Failed to parse:", local_str)
                return None

        # Attach local timezone (Malaysia)
        local_dt = dt.replace(tzinfo=LOCAL_TZ)

        # Convert → UTC
        return local_dt.astimezone(ZoneInfo("UTC"))

    
    @staticmethod
    def safe_serialize(obj):
        # Handle datetime/time
        if isinstance(obj, (datetime.datetime, time)):
            return obj.strftime("%H:%M")

        # Handle date
        if isinstance(obj, datetime.date):
            return obj.isoformat()

        # Handle sets
        if isinstance(obj, set):
            return list(obj)

        # Handle bool
        if isinstance(obj, bool):
            return str(obj).lower()  # "true" / "false"

        # Handle None
        if obj is None:
            return None

        # Fallback
        return str(obj)
    

    def send_async_email(app, msg):
        from app import mail, app
        with app.app_context():
            mail.send(msg)
