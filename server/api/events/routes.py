from flask import request
from sqlalchemy.exc import IntegrityError

from api.customers import customers_api
from api.helpers import ProtectedResource, get_or_404
from config import db
from models import Customer
from schema import CustomerSchema, customers_schema