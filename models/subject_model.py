from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from models import db
from models.education_lvl_model import Education_Lvl  # Make sure this points to your db instance

class Subject(db.Model):
    __tablename__ = 'subject'

    subject_id = db.Column(db.Integer, primary_key=True)
    edu_lvl_id = db.Column(db.Integer, db.ForeignKey('education_level.edu_lvl_id'), nullable=False)
    name = db.Column(db.String(100))
    description = db.Column(db.String(300))
    normal_class_fee = db.Column(db.Float)
    focus_class_fee = db.Column(db.Float)
    material_fee = db.Column(db.Float)
    status = db.Column(db.String(10))

    education_level = db.relationship("Education_Lvl", back_populates="subjects")
    classes = db.relationship("Class", back_populates="subject", cascade="all, delete-orphan")

    
    @staticmethod
    def get_filtered(name=None, status=None, fee_filters=None, sort='subject_id', dir='asc'):
        if fee_filters is None:
            fee_filters = {}

        query = Subject.query.join(Education_Lvl)

        if name:
            query = query.filter(Subject.name.ilike(f"%{name}%"))
        if status:
            query = query.filter(Subject.status == status)

        if fee_filters.get('normal_class_fee_min') is not None:
            query = query.filter(Subject.normal_class_fee >= fee_filters['normal_class_fee_min'])
        if fee_filters.get('normal_class_fee_max') is not None:
            query = query.filter(Subject.normal_class_fee <= fee_filters['normal_class_fee_max'])
        if fee_filters.get('focus_class_fee_min') is not None:
            query = query.filter(Subject.focus_class_fee >= fee_filters['focus_class_fee_min'])
        if fee_filters.get('focus_class_fee_max') is not None:
            query = query.filter(Subject.focus_class_fee <= fee_filters['focus_class_fee_max'])
        if fee_filters.get('material_fee_min') is not None:
            query = query.filter(Subject.material_fee >= fee_filters['material_fee_min'])
        if fee_filters.get('material_fee_max') is not None:
            query = query.filter(Subject.material_fee <= fee_filters['material_fee_max'])

        # ----- sorting -----
        if sort == "education_level":
            sort_column = Education_Lvl.name
        else:
            sort_column = getattr(Subject, sort, Subject.subject_id)

        query = query.order_by(
            sort_column.desc() if dir == 'desc' else sort_column.asc()
        )

        query = query.order_by(sort_column.desc() if dir == 'desc' else sort_column.asc())

        return query

    @staticmethod
    def add(data):
        new = Subject(**data)
        db.session.add(new)
        db.session.commit()

    @staticmethod
    def update(subject_id, data):
        subject = Subject.query.get(subject_id)
        if subject:
            subject.name = data.get('name', subject.name)
            subject.description = data.get('description', subject.description)
            subject.normal_class_fee = data.get('normal_class_fee', subject.normal_class_fee)
            subject.focus_class_fee = data.get('focus_class_fee', subject.focus_class_fee)
            subject.material_fee = data.get('material_fee', subject.material_fee)

            db.session.commit()
            return subject
        else:
            return None


    @staticmethod
    def get_by_id(id):
        return Subject.query.get(id)
    
    @staticmethod
    def get_by_edu_lvl_id(edu_lvl_id):
        from models.education_lvl_model import Education_Lvl  # to avoid circular import

        # Check if the education level exists
        edu_lvl = Education_Lvl.get_by_id(edu_lvl_id)
        if not edu_lvl:
            return None  # return None if not found

        # Otherwise, return subjects belonging to it
        subjects = Subject.query.filter_by(edu_lvl_id=edu_lvl_id, status='1').all()
        return subjects


    @staticmethod
    def update_status(subject_id, status):
        from models.class_model import Class

        subject = Subject.query.get(subject_id)
        if not subject:
            return False  # subject not found

        try:
            # Step 1: Update subject status
            subject.status = status

            # Step 2: Deactivate all related classes if subject is deactivated
            if status == '0':
                for cls in subject.classes:
                    # Call the class model's deactivate_class to handle class_details & time_schedules
                    Class.deactivate_class(cls.class_id)

            db.session.commit()
            return True

        except Exception as e:
            db.session.rollback()
            print(f"Error updating subject {subject_id}: {e}")
            return False

    @staticmethod
    def check_duplicate_subject_full(name, edu_lvl_id, normal_fee, focus_fee, material_fee, subject_id=None):
        query = Subject.query.filter(
            Subject.edu_lvl_id == edu_lvl_id,
            func.lower(Subject.name) == func.lower(name),
            Subject.normal_class_fee == normal_fee,
            Subject.focus_class_fee == focus_fee,
            Subject.material_fee == material_fee
        )

        if subject_id:
            query = query.filter(Subject.subject_id != subject_id)

        return query.first()

    
    @staticmethod
    def insert_one(name, edu_lvl_id, description, normal_fee, focus_fee, material_fee):

        # 1. Check edu level exists
        if not str(edu_lvl_id).isdigit() or not Education_Lvl.get_by_id(edu_lvl_id):
            return False, f"{name} (Invalid Level ID: {edu_lvl_id})"

        # 2. Duplicate full match (same subject + fees)
        duplicate = Subject.check_duplicate_subject_full(
            name=name,
            edu_lvl_id=edu_lvl_id,
            normal_fee=normal_fee,
            focus_fee=focus_fee,
            material_fee=material_fee
        )

        if duplicate:
            return False, f"{name} (Duplicate)"

        # 3. Insert
        try:
            new = Subject(
                edu_lvl_id=edu_lvl_id,
                name=name,
                description=description,
                normal_class_fee=normal_fee,
                focus_class_fee=focus_fee,
                material_fee=material_fee,
                status='1'
            )
            db.session.add(new)
            db.session.commit()
            return True, name

        except Exception as e:
            db.session.rollback()
            print("Insert error:", e)
            return False, f"{name} (DB Insert Error)"

    @staticmethod
    def import_dataframe(df):
        required_cols = [
            "name", "edu_lvl_id", "description",
            "normal_class_fee", "focus_class_fee", "material_fee"
        ]

        # Validate column structure
        if list(df.columns) != required_cols:
            return False, 0, 0, ["Invalid file format. Column order mismatch."]

        success_count = 0
        failed = []

        for _, row in df.iterrows():
            name = str(row["name"]).strip()
            edu_lvl_id = str(row["edu_lvl_id"]).strip()

            desc = row["description"]
            n_fee = row["normal_class_fee"]
            f_fee = row["focus_class_fee"]
            m_fee = row["material_fee"]

            ok, msg = Subject.insert_one(
                name=name,
                edu_lvl_id=edu_lvl_id,
                description=desc,
                normal_fee=n_fee,
                focus_fee=f_fee,
                material_fee=m_fee
            )

            if ok:
                success_count += 1
            else:
                failed.append(msg)

        return True, success_count, len(failed), failed
