import time
from controllers.payment_controller import check_and_create_monthly_payments, check_and_update_payment_status


def scheduler_loop():
    while True:
        print("[Scheduler] Running main loop check...")

        check_and_create_monthly_payments()
        check_and_update_payment_status()

        print("[Scheduler] Sleeping 24 hours...")
        time.sleep(24 * 60 * 60)