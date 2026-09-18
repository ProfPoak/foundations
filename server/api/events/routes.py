from flask import request
from sqlalchemy.exc import IntegrityError

from api.events import events_api
from api.helpers import ProtectedResource, get_or_404, current_user
from config import db
from models import Event, Customer
from schema import EventSchema, events_schema

class CustomerEvents(ProtectedResource):
    def get(self, customer_id):
        get_or_404(Customer, customer_id)
        events = Event.query.filter_by(customer_id=customer_id).order_by(Event.datetime.desc()).all()
        return events_schema.dump(events), 200

    def post(self, customer_id):
        get_or_404(Customer, customer_id)
        user = current_user()
        data = EventSchema().load({**request.get_json(),
                                   "employee_id": user.id,
                                   "customer_id": customer_id})
        event = Event(**data)
        db.session.add(event)
        db.session. commit
        return EventSchema().dump(event), 201

events_api.add_resource(CustomerEvents, "/customers/<int:customer_id>/events")