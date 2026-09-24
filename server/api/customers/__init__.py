from flask import Blueprint
from flask_restful import Api

customers_bp = Blueprint('customers', __name__)

customers_api = Api(customers_bp)

from . import routes
