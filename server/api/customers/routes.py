from flask import request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from api.customers import customers_api
from api.helpers import ProtectedResource, get_or_404, validation_error
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
        try:
            data = CustomerSchema().load(request.get_json())
            customer = Customer(**data)

            db.session.add(customer)
            db.session.commit()

customers_api.add_resource(CustomerList, "/customers")