from flask import request, make_response, jsonify
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from datetime import datetime

from config import app, db, api, jwt
from models import User, Customer, Event, Task, Note
from schema import  UserSchema
from api.customers import customers_bp

@app.shell_context_processor
def make_shell_context():
    return {"db": db, "User": User, "Customer": Customer,
            "Event": Event, "Task": Task, "Note": Note}

class Signup(Resource):
    def post(self):
        try:
            json = request.get_json()
            user = User(
                username=json['username'],
            )

            if 'is_admin' in json:
                user.is_admin=json['is_admin']

            user.password_hash = json['password']

            db.session.add(user)
            db.session.commit()
        except (KeyError, ValueError, IntegrityError) as e:
            db.session.rollback()
            return {'errors': [str(e)]}, 422

        access_token = create_access_token(identity=str(user.id))
        return make_response(
            jsonify(
                token=access_token, 
                user=UserSchema().dump(user)
            ),
            201
        )

class CheckSession(Resource):
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        user = User.query.filter(User.id == user_id).first()
        return UserSchema().dump(user), 200

class Login(Resource):
   def post(self):
        username = request.get_json()['username']
        password = request.get_json()['password']

        user = User.query.filter(User.username == username).first()

        if user and user.authenticate(password):
            access_token = create_access_token(identity=str(user.id))
            return make_response(
                        jsonify(
                            token=access_token, 
                            user=UserSchema().dump(user)
                        ),
                        200
                    )

        return {'error': 'Login failed. Please check Username and Password'}, 401

api.add_resource(Signup, '/signup', endpoint='signup')
api.add_resource(CheckSession, '/check_session', endpoint='check_session')
api.add_resource(Login, '/login', endpoint='login')

app.register_blueprint(customers_bp)

if __name__ == '__main__':
    app.run(port=5555, debug=True) 