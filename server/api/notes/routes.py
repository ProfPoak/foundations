from flask import request

from api.notes import notes_api
from api.helpers import ProtectedResource, get_or_404, current_user, can_modify, reject_unknown
from config import db
from models import Note, Customer
from schema import NoteSchema, notes_schema

