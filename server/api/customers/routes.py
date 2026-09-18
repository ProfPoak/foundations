from flask import request
from sqlalchemy.exc import IntegrityError

from api.customers import customers_api
from api.helpers import ProtectedResource, get_or_404
from config import db
from models import Customer
from schema import CustomerSchema, customers_schema

class CustomerList(ProtectedResource):
    def get(self):
        status = request.args.get("status")
        query = Customer.query
        if status:
            query = query.filter_by(status=status)
        customers = query.order_by(Customer.last_name, Customer.first_name).all()
        return customers_schema.dump(customers), 200

    def post(self):
        data = CustomerSchema().load(request.get_json())
        customer = Customer(**data)
        db.session.add(customer)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {"error": "Email already in use"}, 409
        return CustomerSchema().dump(customer), 201

customers_api.add_resource(CustomerList, "/customers")