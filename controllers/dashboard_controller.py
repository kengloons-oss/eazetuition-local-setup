from flask import Blueprint, render_template, request, jsonify, url_for
from datetime import datetime, timedelta
from sqlalchemy import desc, func
from middlewares.admin_required import admin_required, admin_api_required

from models import db
from models.other_service_model import Other_Service
from models.payment_model import Payment, Payment_Detail
from models.service_enrollment_model import Service_Enrollment

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

@dashboard_bp.route("/", methods=["GET"])
@admin_required
def dashboard():
    now = datetime.now()
    
    months = [
        (1, "Jan"), (2, "Feb"), (3, "Mar"), (4, "Apr"),
        (5, "May"), (6, "Jun"), (7, "Jul"), (8, "Aug"),
        (9, "Sep"), (10, "Oct"), (11, "Nov"), (12, "Dec")
    ]

    breadcrumbs = [('Dashboard', url_for('dashboard.dashboard'))]

    return render_template(
        '/admin/dashboard/dashboard.html',
        breadcrumbs=breadcrumbs,
        title="Admin Dashboard",
        current_year=now.year,
        current_month=now.month,
        months=months
    )

@dashboard_bp.route("/revenue/data", methods=["GET"])
@admin_api_required
def revenue_data():
    try:
        now = datetime.now()
        year = int(request.args.get("rev_year", now.year))
        month = request.args.get("rev_month")
        module_type = request.args.get("rev_module_type", "")
        payment_method = request.args.get("rev_payment_method", "")

        month = int(month) if month else None

        # ----------------------------------
        # Step 1: Base query -> ONLY PAID
        # ----------------------------------
        payment_query = Payment.query.filter(
            Payment.payment_status == "1",
            db.extract("year", Payment.payment_datetime) == year
        )

        if payment_method:
            payment_query = payment_query.filter(Payment.payment_method == payment_method)

        if month:
            payment_query = payment_query.filter(db.extract("month", Payment.payment_datetime) == month)

        payments = payment_query.all()
        payment_ids = [p.payment_id for p in payments]

        if not payment_ids:
            return jsonify({
                "summary": {"total_revenue": 0, "avg_revenue_per_student": 0},
                "chart": {"labels": [], "revenue": []}
            })

        # ----------------------------------
        # Step 2: Fetch Payment Details for these payments
        # ----------------------------------
        detail_query = Payment_Detail.query.filter(
            Payment_Detail.payment_id.in_(payment_ids)
        )

        # Module filtering
        if module_type == "tuition":
            detail_query = detail_query.filter(Payment_Detail.class_fee != None)
        elif module_type == "service":
            detail_query = detail_query.filter(Payment_Detail.service_fee != None)

        details = detail_query.all()

        # ----------------------------------
        # Step 3: Calculate revenue per payment (sum of details)
        # ----------------------------------
        revenue_per_payment = {}

        for d in details:
            pid = d.payment_id
            if pid not in revenue_per_payment:
                revenue_per_payment[pid] = 0.0

            if d.class_fee:
                revenue_per_payment[pid] += float(d.class_fee)

            if d.service_fee:
                revenue_per_payment[pid] += float(d.service_fee)

        # Now we have precise revenue
        total_revenue = sum(revenue_per_payment.values())

        # Unique students
        student_ids = {p.student_id for p in payments}
        avg_revenue = total_revenue / len(student_ids) if student_ids else 0

        # ----------------------------------
        # Step 4: Build Chart Data
        # ----------------------------------
        labels = []
        revenue_chart = []

        if month:
            # Weekly breakdown
            first_day = datetime(year, month, 1)
            next_month = (first_day.replace(day=28) + timedelta(days=4)).replace(day=1)
            last_day = next_month - timedelta(days=1)

            weeks = []
            start = first_day
            while start <= last_day:
                end = start + timedelta(days=6)
                weeks.append((start, min(end, last_day)))
                start = end + timedelta(days=1)

            for i, (ws, we) in enumerate(weeks, start=1):
                w_rev = sum(
                    revenue_per_payment.get(p.payment_id, 0)
                    for p in payments
                    if ws <= p.payment_datetime <= we
                )
                labels.append(f"Week {i}")
                revenue_chart.append(w_rev)

        else:
            # Month breakdown
            for m in range(1, 13):
                m_rev = sum(
                    revenue_per_payment.get(p.payment_id, 0)
                    for p in payments
                    if p.payment_datetime.month == m
                )
                labels.append(datetime(year, m, 1).strftime("%b"))
                revenue_chart.append(m_rev)

        return jsonify({
            "summary": {
                "total_revenue": round(total_revenue, 2),
                "avg_revenue_per_student": round(avg_revenue, 2)
            },
            "chart": {
                "labels": labels,
                "revenue": revenue_chart
            }
        })

    except Exception as e:
        print("❌ Revenue Chart Error:", e)
        return jsonify({"error": "Unexpected error"}), 500

@dashboard_bp.route("/outstanding/data", methods=["GET"])
@admin_api_required
def outstanding_data():
    try:
        now = datetime.now()
        year = int(request.args.get("out_year", now.year))
        month = request.args.get("out_month")
        module_type = request.args.get("out_module_type", "")

        month = int(month) if month else None

        # ----------------------------------
        # 1) Base query: ONLY OUTSTANDING
        # ----------------------------------
        payment_query = Payment.query.filter(
            Payment.payment_status.in_(["0", "2", "3"]),   # 0=unpaid, 2=overdue, 3=barred
            db.extract("year", Payment.created_datetime) == year
        )

        if month:
            payment_query = payment_query.filter(db.extract("month", Payment.created_datetime) == month)

        payments = payment_query.all()
        if not payments:
            return jsonify({
                "summary": {
                    "total_outstanding": 0,
                    "unpaid_count": 0,
                    "overdue_count": 0,
                    "barred_count": 0,
                    "avg_outstanding_per_student": 0
                },
                "chart": {
                    "labels": [],
                    "unpaid": [],
                    "overdue": [],
                    "barred": []
                }
            })

        payment_ids = [p.payment_id for p in payments]

        # ----------------------------------
        # 2) Payment_Detail 按 module_type 过滤
        # ----------------------------------
        detail_query = Payment_Detail.query.filter(
            Payment_Detail.payment_id.in_(payment_ids)
        )

        if module_type == "tuition":
            detail_query = detail_query.filter(Payment_Detail.class_fee != None)
        elif module_type == "service":
            detail_query = detail_query.filter(Payment_Detail.service_fee != None)

        details = detail_query.all()
        if not details:
            return jsonify({
                "summary": {
                    "total_outstanding": 0,
                    "unpaid_count": 0,
                    "overdue_count": 0,
                    "barred_count": 0,
                    "avg_outstanding_per_student": 0
                },
                "chart": {
                    "labels": [],
                    "unpaid": [],
                    "overdue": [],
                    "barred": []
                }
            })

        # ----------------------------------
        # 3) 计算每个 payment 的 outstanding 金额
        # ----------------------------------
        amount_per_payment: dict[int, float] = {}

        for d in details:
            pid = d.payment_id
            if pid not in amount_per_payment:
                amount_per_payment[pid] = 0.0

            if d.class_fee:
                amount_per_payment[pid] += float(d.class_fee or 0)
            if d.service_fee:
                amount_per_payment[pid] += float(d.service_fee or 0)

        # 剔除对这个 module_type 来说金额为 0 的 payment
        filtered_payments = [
            p for p in payments
            if amount_per_payment.get(p.payment_id, 0) > 0
        ]

        if not filtered_payments:
            return jsonify({
                "summary": {
                    "total_outstanding": 0,
                    "unpaid_count": 0,
                    "overdue_count": 0,
                    "barred_count": 0,
                    "avg_outstanding_per_student": 0
                },
                "chart": {
                    "labels": [],
                    "unpaid": [],
                    "overdue": [],
                    "barred": []
                }
            })

        # ----------------------------------
        # 4) Summary 统计
        # ----------------------------------
        total_outstanding = sum(
            amount_per_payment[p.payment_id] for p in filtered_payments
        )

        unpaid_count = sum(1 for p in filtered_payments if p.payment_status == "0")
        overdue_count = sum(1 for p in filtered_payments if p.payment_status == "2")
        barred_count = sum(1 for p in filtered_payments if p.payment_status == "3")

        student_ids = {p.student_id for p in filtered_payments}
        avg_outstanding = (
            total_outstanding / len(student_ids)
            if student_ids else 0
        )

        # ----------------------------------
        # 5) Build Chart Data
        # ----------------------------------
        labels = []
        unpaid_series = []
        overdue_series = []
        barred_series = []

        if month:
            # 按周
            first_day = datetime(year, month, 1)
            next_month = (first_day.replace(day=28) + timedelta(days=4)).replace(day=1)
            last_day = next_month - timedelta(days=1)

            weeks = []
            start = first_day
            while start <= last_day:
                end = start + timedelta(days=6)
                weeks.append((start, min(end, last_day)))
                start = end + timedelta(days=1)

            for i, (ws, we) in enumerate(weeks, start=1):
                w_unpaid = 0.0
                w_overdue = 0.0
                w_barred_val = 0.0

                for p in filtered_payments:
                    if ws <= p.created_datetime <= we:
                        amt = amount_per_payment.get(p.payment_id, 0.0)
                        if p.payment_status == "0":
                            w_unpaid += amt
                        elif p.payment_status == "2":
                            w_overdue += amt
                        elif p.payment_status == "3":
                            w_barred_val += amt

                labels.append(f"Week {i}")
                unpaid_series.append(w_unpaid)
                overdue_series.append(w_overdue)
                barred_series.append(w_barred_val)

        else:
            # 按月
            for m in range(1, 13):
                m_unpaid = 0.0
                m_overdue = 0.0
                m_barred_val = 0.0

                for p in filtered_payments:
                    if p.created_datetime.month == m:
                        amt = amount_per_payment.get(p.payment_id, 0.0)
                        if p.payment_status == "0":
                            m_unpaid += amt
                        elif p.payment_status == "2":
                            m_overdue += amt
                        elif p.payment_status == "3":
                            m_barred_val += amt

                labels.append(datetime(year, m, 1).strftime("%b"))
                unpaid_series.append(m_unpaid)
                overdue_series.append(m_overdue)
                barred_series.append(m_barred_val)

        return jsonify({
            "summary": {
                "total_outstanding": round(total_outstanding, 2),
                "unpaid_count": unpaid_count,
                "overdue_count": overdue_count,
                "barred_count": barred_count,
                "avg_outstanding_per_student": round(avg_outstanding, 2)
            },
            "chart": {
                "labels": labels,
                "unpaid": unpaid_series,
                "overdue": overdue_series,
                "barred": barred_series
            }
        })

    except Exception as e:
        print("❌ Outstanding Chart Error:", e)
        return jsonify({"error": "Unexpected error"}), 500

@dashboard_bp.route("/service-subscription/data", methods=["GET"])
@admin_api_required
def service_subscription_data():
    try:
        now = datetime.now()
        year = int(request.args.get("svc_year", now.year))
        month = request.args.get("svc_month")
        service_type = request.args.get("svc_service_type", "")

        month = int(month) if month else None

        # ----------------------------------
        # 1) Base query: active enrollments + active services
        # ----------------------------------
        query = (
            db.session.query(
                Other_Service.service_id,
                Other_Service.name,
                func.count(Service_Enrollment.service_enrollment_id).label("cnt")
            )
            .join(Service_Enrollment, Service_Enrollment.service_id == Other_Service.service_id)
            .filter(
                Service_Enrollment.status == "1",   # active enrollment
                Other_Service.status == "1",        # active service
                func.extract("year", Service_Enrollment.enroll_datetime) == year
            )
        )

        if month:
            query = query.filter(func.extract("month", Service_Enrollment.enroll_datetime) == month)

        if service_type:
            # service_type: 例如 "1" = Transport, "2" = Childcare（依你 DB 的设计）
            query = query.filter(Other_Service.service_type == service_type)

        # 按 service 分组，算订阅数量
        rows = (
            query
            .group_by(Other_Service.service_id, Other_Service.name)
            .order_by(desc("cnt"))
            .limit(5)
            .all()
        )

        if not rows:
            return jsonify({
                "summary": {
                    "total_subscriptions": 0
                },
                "chart": {
                    "labels": [],
                    "counts": []
                }
            })

        labels = [r.name for r in rows]
        counts = [int(r.cnt) for r in rows]
        total_subscriptions = sum(counts)

        return jsonify({
            "summary": {
                "total_subscriptions": total_subscriptions
            },
            "chart": {
                "labels": labels,
                "counts": counts
            }
        })

    except Exception as e:
        print("❌ Service Subscription Chart Error:", e)
        return jsonify({"error": "Unexpected error"}), 500
    