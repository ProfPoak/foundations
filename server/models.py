from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property
from marshmallow import Schema, fields
from datetime import datetime

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

    #Validations
    @validates("username")
    def username_validation(self, value):
        if not value:
            raise ValueError("Username cannot be left empty")
        if len(value) > 20:
            raise ValueError("Username can be a maximum of 20 characters")
        return value

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

    #Validations
    @validates("email")
    def email_validation(self, value):
        if value is none:
            return value
        #Email must have one "@" symbol. If there are more or less than 2 parts from the split it is invalid.
        parts = value.split("@")
        if len(parts) !=2 or "." not in parts[-1]:
            raise ValueError("Must be a valid email")
        return value

    @validates("status")
    def status_validation(self, value):
        statuses = ("potential", "client", "inactive")
        if value not in statuses:
            raise ValueError(f"Status must be one of the following: {statuses}")
        return value

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

    id = db.Column(db.Integer, primary_key=True)
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

    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    content = db.Column(db.String, nullable=False)

    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    #Relationships
    employee = db.relationship('User', back_populates="notes")
    customer = db.relationship('Customer', back_populates="notes")