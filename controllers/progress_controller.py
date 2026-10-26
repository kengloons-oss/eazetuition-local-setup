from flask import Blueprint, request, jsonify
import datetime
from models import db
from models.student_model import Student
from models.system_user_model import System_User
from models.education_lvl_model import Education_Lvl
from models.evaluation_test_model import Evaluation_Test
from models.evaluation_question_model import EvaluationQuestion
from models.parent_model import Parent
from datetime import datetime
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import io
from flask import send_file

progress_bp = Blueprint("progress_bp", __name__)

@progress_bp.route("/parent/students", methods=["GET"])
def get_parent_students():
    user_id = request.args.get("user_id")  
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    
    parent = Parent.query.filter_by(user_id=user_id).first()
    if not parent:
        return jsonify({"error": "Parent not found"}), 404

    student_list = []
    for student in parent.students:
        edu_lvl = Education_Lvl.query.get(student.edu_lvl_id)
        student_list.append({
            "student_id": student.student_id,
            "name": student.user.name if student.user else "",
            "age": student.age,
            "edu_lvl_id": student.edu_lvl_id,
            "edu_lvl_name": edu_lvl.name if edu_lvl else "",
            "payment_status": student.payment_status
        })

    return jsonify({
        "parent_id": parent.parent_id,
        "user_id": parent.user_id,
        "students": student_list
    }), 200

@progress_bp.route("/student/progress", methods=["GET"])
def get_student_progress():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    results = student.evaluation_results
    # Sort by completed_at if exists, otherwise result_id
    results.sort(key=lambda r: r.completed_at or r.result_id)

    progress_list = []
    labels = []
    scores = []

    for idx, r in enumerate(results):
        # Use total_questions if available, else fallback to answer_logs count
        total_questions = getattr(r, 'total_questions', None)
        if total_questions is None:
            total_questions = len(r.answer_logs) if r.answer_logs else 0

        raw_score = r.score if r.score is not None else 0
        # Safety: don't allow raw_score to exceed total_questions
        if raw_score > total_questions:
            raw_score = total_questions

        percentage = round((raw_score / total_questions) * 100, 2) if total_questions > 0 else 0

        scores.append(percentage)
        labels.append(f"Test {idx + 1}")

        # Generate comment based on percentage
        if percentage >= 80:
            comment = "Excellent performance! Keep it up."
        elif percentage >= 50:
            comment = "Good progress, continue practicing."
        else:
            comment = "Needs improvement. Please guide your child more."

        progress_list.append({
            "result_id": r.result_id,
            "raw_score": raw_score,
            "total_questions": total_questions,
            "percentage": percentage,
            "level_name": r.level_name,
            "completed_at": r.completed_at.strftime("%Y-%m-%d") if r.completed_at else "",
            "comment": comment
        })

    return jsonify({
        "student_id": student.student_id,
        "name": student.user.name if student.user else "",
        "labels": labels,      
        "scores": scores,      
        "progress": progress_list
    }), 200

@progress_bp.route("/student/homework/progress", methods=["GET"])
def get_student_homework_progress():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    submissions = student.submissions
    submissions.sort(key=lambda s: s.upload_time or s.submission_id)

    homework_progress_list = []
    labels = []
    scores = []

    for idx, sub in enumerate(submissions):
        
        grade = sub.grade if sub.grade is not None else (sub.ai_grade or 0)
        percentage = round(grade, 2)  

        labels.append(f"HW {idx+1}")
        scores.append(percentage)

        
        if percentage >= 80:
            comment = "Excellent submission!"
        elif percentage >= 50:
            comment = "Good effort, room for improvement."
        else:
            comment = "Needs improvement. Review the material."

        homework_progress_list.append({
            "submission_id": sub.submission_id,
            "homework_id": sub.homework_id,
            "homework_subject": sub.homework.homework_subject if sub.homework else "",
            "grade": grade,
            "percentage": percentage,
            "status": sub.status,
            "feedback_from_tutor": sub.feedback_from_tutor,
            "feedback_from_ai": sub.feedback_from_ai,
            "comment": comment,
            "upload_time": sub.upload_time.strftime("%Y-%m-%d") if sub.upload_time else "",
            "graded_time": sub.graded_time.strftime("%Y-%m-%d") if sub.graded_time else "",
        })

    return jsonify({
        "student_id": student.student_id,
        "name": student.user.name if student.user else "",
        "labels": labels,      
        "scores": scores,      
        "homework_progress": homework_progress_list
    }), 200

@progress_bp.route("/student/attendance/progress", methods=["GET"])
def get_student_attendance_progress():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    attendance_records = student.attendance_records  # list of Attendance objects

    # Group by month (YYYY-MM)
    monthly_attendance = {}
    for record in attendance_records:
        month_key = record.attendance_time.strftime("%Y-%m")  # e.g., 2025-11
        if month_key not in monthly_attendance:
            monthly_attendance[month_key] = {"present": 0, "total": 0}

        monthly_attendance[month_key]["total"] += 1
        if record.status.lower() == "present":
            monthly_attendance[month_key]["present"] += 1

    # Convert to chart format
    labels = []
    percentages = []
    attendance_list = []

    sorted_months = sorted(monthly_attendance.items(), key=lambda x: x[0])

    for month_key, data in sorted_months:
        total = data["total"]
        present = data["present"]
        absent = total - present
        percentage = round((present / total) * 100, 2) if total > 0 else 0

        # Label format: "Nov 2025"
        month_label = month_key
        labels.append(month_label)
        percentages.append(percentage)

        attendance_list.append({
            "month": month_key,
            "total_classes": total,
            "attended": present,
            "absent": absent,
            "percentage": percentage
        })

    return jsonify({
        "student_id": student.student_id,
        "name": student.user.name if student.user else "",
        "labels": labels,
        "percentages": percentages,
        "attendance_list": attendance_list
    }), 200



@progress_bp.route("/student/export/progress-report", methods=["GET"])
def export_progress_report():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    story = []

    # ------- HEADER -------
    story.append(Paragraph("<b>Student Progress Report</b>", styles["Title"]))
    story.append(Paragraph(f"<b>Name:</b> {student.user.name}", styles["Normal"]))
    story.append(Paragraph(f"<b>Education Level:</b> {student.education_level.name}", styles["Normal"]))
    story.append(Spacer(1, 0.25 * inch))

    # ---------------------------------------------------------------
    # 🔵 TEST RESULTS (TABLE + CHART)
    # ---------------------------------------------------------------



    story.append(Paragraph("<b>Test Results</b>", styles["Heading2"]))

    results = student.evaluation_results
    results.sort(key=lambda r: r.completed_at or r.result_id)

    if len(results) == 0:
        story.append(Paragraph("No test data available.", styles["Normal"]))
    else:
        # Table
        data = [["Test No.", "Level", "Score", "Comment"]]

        bar_values = []
        bar_labels = []

        for idx, r in enumerate(results):
            total = len(r.answer_logs)
            percent = round((r.score / total) * 100, 2) if total else 0
            score_text = f"{r.score}/{total} ({percent}%)" if total else "0%"

            # comment
            if percent >= 80:
                comment = "Excellent!"
            elif percent >= 50:
                comment = "Good progress"
            else:
                comment = "Needs improvement"

            data.append([f"Test {idx+1}", r.level_name, score_text, comment])
            bar_values.append(percent)
            bar_labels.append(f"T{idx+1}")

        table = Table(data, colWidths=[70, 150, 100, 150])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#007bff")),
            ('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.4 * inch))
        

        # Bar Chart
        drawing = Drawing(400, 250)
        chart = VerticalBarChart()
        chart.x = 50
        chart.y = 60
        chart.height = 150
        chart.width = 200
        chart.data = [bar_values]
        chart.barWidth = 20
        chart.valueAxis.valueMin = 0
        chart.valueAxis.valueMax = 100
        chart.valueAxis.valueStep = 10
        chart.categoryAxis.categoryNames = bar_labels
        drawing.add(chart)
        story.append(drawing)
        story.append(Spacer(1, 0.4 * inch))

    

    # ---------------------------------------------------------------
    # 🔵 HOMEWORK RESULTS (TABLE)
    # ---------------------------------------------------------------
    story.append(Paragraph("<b>Homework Results</b>", styles["Heading2"]))

    submissions = student.submissions
    submissions.sort(key=lambda s: s.upload_time or s.submission_id)

    if len(submissions) == 0:
        story.append(Paragraph("No homework data available.", styles["Normal"]))
    else:
        hw_data = [["HW", "Subject", "Grade", "Status", "Comment"]]
        for idx, h in enumerate(submissions):
            comment = ""
            if h.grade is not None and h.grade >= 80:
                comment = "Excellent!"
            elif h.grade is not None and h.grade >= 50:
                comment = "Good effort"
            else:
                comment = "Needs improvement"

            hw_data.append([
                f"HW {idx+1}",
                h.homework.homework_subject,
                f"{h.grade}%",
                h.status,
                comment
            ])

        hw_table = Table(hw_data, colWidths=[60, 160, 60, 80, 140])
        hw_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#28a745")),
            ('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ]))
        story.append(hw_table)

    doc.build(story)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{student.user.name}_progress_report.pdf",
        mimetype="application/pdf"
    )


@progress_bp.route("/student/export/attendance-report", methods=["GET"])
def export_attendance_report():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    student = Student.query.filter_by(student_id=student_id).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    story = []

    # ------- HEADER -------
    story.append(Paragraph("<b>Attendance Report</b>", styles["Title"]))
    story.append(Paragraph(f"<b>Name:</b> {student.user.name}", styles["Normal"]))
    story.append(Paragraph(f"<b>Education Level:</b> {student.education_level.name}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))

    # ======== GROUP BY MONTH ==========
    from collections import defaultdict
    from datetime import datetime

    monthly_attendance = defaultdict(lambda: {"present": 0, "total": 0})

    for rec in student.attendance_records:
        date = rec.attendance_time.date()
        month_key = date.strftime("%Y-%m")
        monthly_attendance[month_key]["total"] += 1
        if rec.status.lower() == "present":
            monthly_attendance[month_key]["present"] += 1

    if len(monthly_attendance) == 0:
        story.append(Paragraph("No attendance records found.", styles["Normal"]))
        doc.build(story)
        buffer.seek(0)
        return send_file(buffer, as_attachment=True,
                         download_name="attendance_report.pdf",
                         mimetype="application/pdf")

    # ======== CREATE SINGLE TABLE ==========
    table_data = [["Month", "Present", "Total", "Percentage"]]
    sorted_keys = sorted(monthly_attendance.keys())  # sort by year-month

    bar_vals = []
    bar_labels = []

    for month_key in sorted_keys:
        year, month = month_key.split("-")
        month_name = datetime(int(year), int(month), 1).strftime("%B %Y")

        present = monthly_attendance[month_key]["present"]
        total = monthly_attendance[month_key]["total"]
        percent = round((present / total) * 100, 2) if total > 0 else 0

        table_data.append([month_name, present, total, f"{percent}%"])

        # Add to bar chart
        bar_vals.append(percent)
        bar_labels.append(month_name[:3])  # Jan, Feb, Mar

    table = Table(table_data, colWidths=[150, 80, 80, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#17a2b8")),
        ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.lightgrey])
    ]))

    story.append(table)
    story.append(Spacer(1, 0.5 * inch))

    # ======== BAR CHART ==========
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.barcharts import VerticalBarChart

    drawing = Drawing(400, 250)
    chart = VerticalBarChart()

    chart.x = 40
    chart.y = 40
    chart.width = 320
    chart.height = 160

    chart.data = [bar_vals]
    chart.categoryAxis.categoryNames = bar_labels

    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.valueAxis.valueStep = 10

    drawing.add(chart)
    story.append(Paragraph("<b>Monthly Attendance Percentage</b>", styles["Heading2"]))
    story.append(drawing)

    doc.build(story)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{student.user.name}_attendance_report.pdf",
        mimetype="application/pdf"
    )
