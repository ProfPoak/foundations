from flask import request

from api.users import users_api
from api.helpers import ProtectedResource, get_or_404, current_user
from config import db
from models import User
from schema import UserSchema, users_schema

class UserList(ProtectedResource):
    def get(self):
        return users_schema.dump(User.query.order_by(User.username).all()), 200

    class UserDetail(ProtectedResource):
        def get(self, id):
            return UserSchema().dump(get_or_404(User, id)), 200

        def delete(self, id):
            if not current_user().is_admin:
                return {"error": "unauthorized access"}, 403
            user = get_or_404(User, id)
            if user.id == current_user().id:
                return {"error": "Cannot delete your own admin account"}, 400
            db.session.delete(user)
            db.session.commit()
            return "", 204

users_api.add_resource(UserList, "/users")
users_api.add_resource(UserDetail, "/users/<int:id>")