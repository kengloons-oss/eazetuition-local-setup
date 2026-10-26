from flask import Blueprint, jsonify, request, render_template
from datetime import datetime
from models import db
from controllers.system_user_controller import admin_required
from models.announcement_model import Announcement
from models.system_user_model import System_User

notify_bp = Blueprint("notify_bp", __name__)



@notify_bp.route("/list", methods=["GET"])
@admin_required
def announcement_list_page():
    return render_template("admin/announcement/announcement_list.html")

@notify_bp.route("/add", methods=["GET"])
@admin_required
def announcement_add_page():
    return render_template("admin/announcement/announcement_add.html")

@notify_bp.route("/edit/<int:announcement_id>", methods=["GET"])
@admin_required
def announcement_edit_page(announcement_id):
    return render_template("admin/announcement/announcement_edit.html", announcement_id=announcement_id)



@notify_bp.route("/create", methods=["POST"])
def create_announcement():
    try:
        data = request.get_json()

        title = data.get("title")
        content = data.get("content")
        target_role = data.get("target_role")
        expiry_at = data.get("expiry_at")

        if not all([title, content, target_role, expiry_at]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        expiry_at = datetime.strptime(expiry_at, "%Y-%m-%d %H:%M:%S")

        new_announcement = Announcement(
            title=title,
            content=content,
            target_role=target_role.lower(),
            created_at=datetime.now(),
            expiry_at=expiry_at
        )

        db.session.add(new_announcement)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Announcement created successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@notify_bp.route("/edit/<int:announcement_id>", methods=["PUT"])
def edit_announcement(announcement_id):
    try:
        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404

        data = request.get_json()

        if "title" in data:
            announcement.title = data["title"]
        if "content" in data:
            announcement.content = data["content"]
        if "target_role" in data:
            announcement.target_role = data["target_role"].lower()
        if "expiry_at" in data:
            announcement.expiry_at = datetime.strptime(data["expiry_at"], "%Y-%m-%d %H:%M:%S")

        db.session.commit()
        return jsonify({"message": "Announcement updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@notify_bp.route("/delete/<int:announcement_id>", methods=["DELETE"])
def delete_announcement(announcement_id):
    try:
        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404

        db.session.delete(announcement)
        db.session.commit()

        return jsonify({"message": "Announcement deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@notify_bp.route("/all", methods=["GET"])
def get_all_announcements():
    try:
        # Base query
        query = Announcement.query

        # Filters
        target_role = request.args.get("target_role")
        search_title = request.args.get("search_title")
        created_min = request.args.get("created_at_min")
        created_max = request.args.get("created_at_max")
        per_page = int(request.args.get("per_page", 10))
        page = int(request.args.get("page", 1))

        if target_role and target_role != "all":
            query = query.filter(Announcement.target_role == target_role)

        if search_title:
            query = query.filter(Announcement.title.ilike(f"%{search_title}%"))

        if created_min:
            try:
                dt_min = datetime.strptime(created_min, "%Y-%m-%d")
                query = query.filter(Announcement.created_at >= dt_min)
            except ValueError:
                pass

        if created_max:
            try:
                dt_max = datetime.strptime(created_max, "%Y-%m-%d")
                query = query.filter(Announcement.created_at <= dt_max)
            except ValueError:
                pass

        # Pagination
        pagination = query.order_by(Announcement.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        announcements = pagination.items

        data = [
            {
                "announcement_id": a.announcement_id,
                "title": a.title,
                "content": a.content,
                "target_role": a.target_role,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
                "expiry_at": a.expiry_at.strftime("%Y-%m-%d %H:%M:%S") if a.expiry_at else None,
            }
            for a in announcements
        ]

        return jsonify({
            "announcements": data,
            "total": pagination.total,
            "page": pagination.page,
            "pages": pagination.pages
        })

    except Exception as e:
        print("🔥 ERROR in /announcement/all:", e)
        return jsonify({"error": str(e)}), 500
    
    
@notify_bp.route("/receive/<int:user_id>", methods=["GET"])
def get_user_announcements(user_id):
    try:
        user = System_User.query.filter_by(user_id=user_id, status="1").first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        now = datetime.now()

        announcements = (
            Announcement.query
            .filter(
                (Announcement.target_role == user.type) | (Announcement.target_role == "all"),
                Announcement.expiry_at > now
            )
            .order_by(Announcement.created_at.desc())
            .all()
        )

        data = [
            {
                "announcement_id": a.announcement_id,
                "title": a.title,
                "content": a.content,
                "target_role": a.target_role,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "expiry_at": a.expiry_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for a in announcements
        ]

        return jsonify({"announcements": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
