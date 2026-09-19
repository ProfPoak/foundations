from config import app, db, api, jwt
from models import User, Customer, Event, Task, Note
from api import register_blueprints

@app.shell_context_processor
def make_shell_context():
    return {"db": db, "User": User, "Customer": Customer,
            "Event": Event, "Task": Task, "Note": Note}

register_blueprints(app)

if __name__ == '__main__':
    app.run(port=5555, debug=True) 