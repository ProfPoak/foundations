from flask import request, make_response, jsonify
from flask_restful import Resource
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from config import app, db, api, jwt
from models import User, Customer, Event, Task, Note

@app.shell_context_processor
def make_shell_context():
    return {"db": db, "User": User, "Customer": Customer,
            "Event": Event, "Task": Task, "Note": Note}

if __name__ == '__main__':
    app.run(port=5555, debug=True)