from models import db

class Discount_Metric(db.Model):
    __tablename__ = 'discount_metric'

    discount_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    num_of_enrolment = db.Column(db.Integer, nullable=False)
    discount_amt = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)

