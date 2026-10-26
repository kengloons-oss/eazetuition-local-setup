from models import db

class Other_Service(db.Model):
    __tablename__ = 'other_service'

    service_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    service_type = db.Column(db.String(10), nullable=False)
    fee_type = db.Column(db.String(10), nullable=False)
    deposit_fee = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    service_fee_per_month = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    service_fee_per_attend = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    address = db.Column(db.Text)
    status = db.Column(db.Enum('0', '1'), nullable=False, default='1')

    # Relationships
    sessions = db.relationship("Other_Service_Session", back_populates="service")
    enrollments = db.relationship("Service_Enrollment", back_populates="service")
    payment_details = db.relationship("Payment_Detail", back_populates="service")

    @staticmethod
    def get_filtered(name=None, status=None, service_type=None, fee_type=None, fee_filters=None, sort='service_id', dir='asc'):
        if fee_filters is None:
            fee_filters = {}

        query = Other_Service.query

        if name:
            query = query.filter(Other_Service.name.ilike(f"%{name}%"))
        if status:
            query = query.filter(Other_Service.status == status)
        if service_type:
            query = query.filter(Other_Service.service_type == service_type)
        if fee_type:
            query = query.filter(Other_Service.fee_type == fee_type)

        if fee_filters.get('fee_per_month_min') is not None:
            query = query.filter(Other_Service.service_fee_per_month >= fee_filters['fee_per_month_min'])
        if fee_filters.get('fee_per_month_max') is not None:
            query = query.filter(Other_Service.service_fee_per_month <= fee_filters['fee_per_month_max'])
        if fee_filters.get('fee_per_att_min') is not None:
            query = query.filter(Other_Service.service_fee_per_attend >= fee_filters['fee_per_att_min'])
        if fee_filters.get('fee_per_att_max') is not None:
            query = query.filter(Other_Service.service_fee_per_attend <= fee_filters['fee_per_att_max'])

        sort_column = getattr(Other_Service, sort, Other_Service.service_id)
        query = query.order_by(sort_column.desc() if dir == 'desc' else sort_column.asc())

        return query

    @staticmethod
    def add(data):
        new_service = Other_Service(**data)
        db.session.add(new_service)
        db.session.commit()

        return new_service
    
    @staticmethod
    def update(service_id, data):
        service = Other_Service.query.get(service_id)
        if service:
            service.name = data.get('name', service.name)
            service.description = data.get('description', service.description)
            service.service_type = data.get('service_type', service.service_type)
            service.fee_type = data.get('fee_type', service.fee_type)
            service.deposit_fee = data.get('deposit_fee', service.deposit_fee)
            service.service_fee_per_month = data.get('service_fee_per_month', service.service_fee_per_month)
            service.service_fee_per_attend = data.get('service_fee_per_att', service.service_fee_per_attend)

            db.session.commit()
            return service
        else:
            return None

    @staticmethod
    def get_by_id(id):
        return Other_Service.query.get(id)

    @classmethod
    def get_active_service(cls, service_type):
        return db.session.query(cls).filter(
        cls.status == '1',
        cls.service_type == service_type).all()
    

    @staticmethod
    def update_status(id, status):
        subject = Other_Service.query.get(id)
        if subject:
            subject.status = status
            db.session.commit()