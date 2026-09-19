from flask import request

from api.users import users_api
from api.helpers import ProtectedResource, get_or_404, current_user
from config import db
from models import User
from schema import UserSchema, users_schema