from flask import request
from sqlalchemy.exc import IntegrityError

from api.events import events_api
from api.helpers import ProtectedResource, get_or_404, current_user
from config import db
from models import Event, Customer
from schema import EventSchema, events_schema