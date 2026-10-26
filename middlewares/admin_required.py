# middlewares/admin_required.py

from functools import wraps
from flask import request, render_template, jsonify, session
from helper import auth_admin

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not auth_admin():
            # AJAX request → return partial HTML WITHOUT data
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return render_template("/admin/unauthorized_ajax.html")

            # Normal request → return empty page but with admin base
            return render_template("/admin/unauthorized_page.html")

        return f(*args, **kwargs)
    return wrapper

def admin_api_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("admin_id"):
            return jsonify({"status": "unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

