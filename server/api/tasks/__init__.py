from flask import Blueprint
from flask_restful import Api

tasks_bp = Blueprint('tasks', __name__)

tasks_api = Api(tasks_bp)

from . import routes