from flask import Blueprint, render_template, request, redirect, jsonify
from models.education_lvl_model import Education_Lvl  # new SQLAlchemy model

education_bp = Blueprint('education', __name__, url_prefix='/education')

@education_bp.route('/validate_edu_lvl', methods=['POST'])
def validate_edu_level():
    edu_lvl_id = request.json.get('edu_lvl_id')

    result = Education_Lvl.get_by_id(edu_lvl_id, '1')

    return jsonify({'valid': bool(result)})


@education_bp.route('/active', methods=['GET'])
def get_active_education_levels():
    lvls = Education_Lvl.get_active_lvl()

    result = [
        {
            "edu_lvl_id": lvl.edu_lvl_id,
            "name": lvl.name
        }
        for lvl in lvls
    ]

    return jsonify(result)


