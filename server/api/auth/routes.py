from flask import request, make_response, jsonify
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from api.auth import auth_api
from config import db
from models import User
from schema import  UserSchema

class Signup(Resource):
    def post(self):
        try:
            json = request.get_json()
            user = User(
                username=json['username'],
            )

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

auth_api.add_resource(Signup, '/signup', endpoint='signup')
auth_api.add_resource(CheckSession, '/check_session', endpoint='check_session')
auth_api.add_resource(Login, '/login', endpoint='login')
