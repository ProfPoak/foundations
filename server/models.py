from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property
from marshmallow import Schema, fields

from config import db, bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    _password_hash = db.Column(db.String, nullable=False)

    @hybrid_property
    def password_hash(self):
        raise AttributeError('Password cannot be viewed')

    @password_hash.setter
    def password_hash(self, password):
        password_hash = bcrypt.generate_password_hash(password.encode('utf-8'))
        self._password_hash = password_hash.decode('utf-8')

    def authenticate(self, password):
        return bcrypt.check_password_hash(
            self._password_hash, password.encode('utf-8')
        )

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.column(db.integer, primary_key=True)
    first_name = db.Column(db.String, nullable=False)
    last_name = db.Column(db.String, nullable=False)
    birthday = db.Column(db.Date)
    address =db.Column(db.String)
    phone = db.Column(db.String)
    email = db.Column(db.String, unique=True)
    status = db.Column(db.String, default="potential")

class Event(db.Model):
    id = db.Column()
    datetime = db.Column()
    interaction = db.Column()
    notes = db.Column()

class Task(db.Model):
    id = db.Column()
    title = db.Column()
    status = db.Column()
    due_date = db.Column()
    notes = db.Column()

class Note(db.Model):
    id = db.Column()
    datetime = db.Column()
    content = db.Column()