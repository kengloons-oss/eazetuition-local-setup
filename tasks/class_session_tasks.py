import time
from models.time_schedule_model import Time_Schedule

def class_session_autoupdate_loop(app):
    with app.app_context():
        print("[ClassSession] thread started!")

        while True:
            print("[ClassSession] about to run autoload_update_status()")
            try:
                Time_Schedule.autoload_update_status()
            except Exception as e:
                print("[ClassSession] ERROR in autoload_update_status:", e)

            print("[ClassSession] finished one cycle")
            time.sleep(5 * 60)

