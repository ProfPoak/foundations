from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Resource, abort
from models import db, User  # Assumes db and User live in root models.py

# 1. Base class for uniform JWT protection across resources
class ProtectedResource(Resource):
    method_decorators = [jwt_required()]

# 2. Fetch the logged-in User instance from DB
def current_user():
    user_id = int(get_jwt_identity())
    return db.session.get(User, user_id)

# 3. Quick fetch with a clean RESTful 404 response
def get_or_404(Model, id):
    obj = db.session.get(Model, id)
    if obj is None:
        abort(404, error=f"{Model.__name__} not found")
    return obj

# 4. Permissions check (Admin override or ownership match)
def can_modify(user, owner_id):
    return user.is_admin or user.id == owner_id

# 5. Formats Marshmallow validation failures into standard JSON errors
def validation_error(err):
    return {"errors": err.messages}, 400

# 6. Rejects payloads containing fields users shouldn't touch
def reject_unknown(payload, allowed_fields):
    blocked = payload.keys() - allowed_fields
    if blocked:
        # Convert set to a readable comma-separated string
        blocked_str = ", ".join(blocked)
        return {"error": f"Cannot modify restricted fields: {blocked_str}"}, 400
    return None
