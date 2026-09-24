from flask import Blueprint
from flask_restful import Api

events_bp = Blueprint('events', __name__)

events_api = Api(events_bp)

from . import routes