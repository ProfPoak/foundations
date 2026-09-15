from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property
from marshmallow import Schema, fields
import datetime

from config import db, bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    _password_hash = db.Column(db.String, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    #Password handling
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

    #relationships
    events = db.relationship('Event', back_populates="employee")
    tasks = db.relationship('Task', back_populates="employee")
    notes = db.relationship('Note', back_populates="employee")

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String, nullable=False)
    last_name = db.Column(db.String, nullable=False)
    birthday = db.Column(db.Date)
    address =db.Column(db.String)
    phone = db.Column(db.String)
    email = db.Column(db.String, unique=True)
    status = db.Column(db.String, default="potential")

    #Relationships
    events = db.relationship('Event', back_populates="customer")
    tasks = db.relationship('Task', back_populates="customer")
    notes = db.relationship('Note', back_populates="customer")



class Event(db.Model):
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    interaction = db.Column(db.String, nullable=False)
    notes = db.Column(db.String)

    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    #Relationships
    employee = db.relationship('User', back_populates="events")
    customer = db.relationship('Customer', back_populates="events")

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primar_key=True)
    title = db.Column(db.String, nullable=False)
    status = db.Column(db.String, default="open")
    due_date = db.Column(db.Date)
    notes = db.Column(db.String)

    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    #Relationships
    employee = db.relationship('User', back_populates="tasks")
    customer = db.relationship('Customer', back_populates="tasks")

class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primar_key=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    content = db.Column(db.String, nullable=False)

    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    #Relationships
    employee = db.relationship('User', back_populates="notes")
    customer = db.relationship('Customer', back_populates="notes")