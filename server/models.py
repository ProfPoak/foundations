from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import date, datetime

from config import db, bcrypt


#Shared check for required text fields: rejects blank/whitespace-only values and trims the rest
def require_text(key, value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key.replace('_', ' ').title()} cannot be left empty")
    return value.strip()

#Shared cleanup for optional text fields: blank form input ("") is stored as None
def optional_text(value):
    if value is None or not value.strip():
        return None
    return value.strip()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    _password_hash = db.Column(db.String, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    MIN_PASSWORD_LENGTH = 8

    #Password handling
    @hybrid_property
    def password_hash(self):
        raise AttributeError('Password cannot be viewed')

    @password_hash.setter
    def password_hash(self, password):
        #Not stripped: leading/trailing spaces are a legitimate part of a password
        if not isinstance(password, str) or len(password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {self.MIN_PASSWORD_LENGTH} characters")
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
    def username_validation(self, key, value):
        #Lowercase so the unique constraint treats JDoe and jdoe as the same username
        value = require_text(key, value).lower()
        if len(value) > 20:
            raise ValueError("Username can be a maximum of 20 characters")
        return value

    def __repr__(self):
        return f"<User {self.id}: {self.username!r} admin={self.is_admin}>"

class Customer(db.Model):
    __tablename__ = 'customers'

    MIN_BIRTHDAY = date(1900, 1, 1)

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
    def email_validation(self, key, value):
        value = optional_text(value)
        if value is None:
            return value
        #Lowercase so the unique constraint treats Josh@x.com and josh@x.com as the same email
        value = value.lower()
        #Email must have one "@" symbol. If there are more or less than 2 parts from the split it is invalid.
        parts = value.split("@")
        if len(parts) != 2 or " " in value:
            raise ValueError("Must be a valid email")
        local, domain = parts
        #Domain needs a "." that isn't at either end (rejects "a@b." and "a@.com")
        if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Must be a valid email")
        return value

    @validates("birthday")
    def birthday_validation(self, key, value):
        if value is None:
            return value
        if value > date.today():
            raise ValueError("Birthday cannot be in the future")
        #Anything earlier is almost certainly a typo (e.g. 1090 for 1990)
        if value < self.MIN_BIRTHDAY:
            raise ValueError(f"Birthday cannot be before {self.MIN_BIRTHDAY.isoformat()}")
        return value

    @validates("phone")
    def phone_validation(self, key, value):
        value = optional_text(value)
        if value is None:
            return value
        #Only allow common phone punctuation so letters/extensions aren't silently dropped
        if not set(value) <= set("0123456789 ()-.+"):
            raise ValueError("Phone number can only contain digits, spaces, and ( ) - . +")
        if "+" in value[1:]:
            raise ValueError("'+' is only allowed at the start of a phone number")
        digits = "".join(char for char in value if char.isdigit())
        #A country code (1-3 digits) must be marked with a leading "+", except the common US "1-555-..." habit
        if value.startswith("+"):
            if not 11 <= len(digits) <= 13:
                raise ValueError("Phone number must have a 1-3 digit country code followed by 10 digits")
            country_code, digits = digits[:-10], digits[-10:]
        elif len(digits) == 11 and digits.startswith("1"):
            country_code, digits = "1", digits[1:]
        elif len(digits) == 10:
            country_code = "1"
        else:
            raise ValueError("Phone number must have 10 digits")
        #Store one consistent format so the frontend can display it as-is; US numbers omit the +1
        number = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        return number if country_code == "1" else f"+{country_code} {number}"

    @validates("address")
    def address_validation(self, key, value):
        return optional_text(value)

    @validates("status")
    def status_validation(self, key, value):
        statuses = ("potential", "client", "inactive")
        if value not in statuses:
            raise ValueError(f"Status must be one of the following: {statuses}")
        return value

    @validates("first_name", "last_name")
    def name_validation(self, key, value):
        return require_text(key, value)

    @hybrid_property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Customer {self.id}: {self.full_name!r} status={self.status!r}>"

class Event(db.Model):
    __tablename__ = 'events'

    #Kept industry-agnostic so any small business can use the timeline
    INTERACTIONS = ("call", "email", "text", "meeting", "service", "follow-up", "other")

    id = db.Column(db.Integer, primary_key=True)
    datetime = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    interaction = db.Column(db.String, nullable=False)
    notes = db.Column(db.String)

    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    #Relationships
    employee = db.relationship('User', back_populates="events")
    customer = db.relationship('Customer', back_populates="events")

    #Validations
    @validates("interaction")
    def interaction_validation(self, key, value):
        if value not in self.INTERACTIONS:
            raise ValueError(f"Interaction must be one of the following: {self.INTERACTIONS}")
        return value

    def __repr__(self):
        return (
            f"<Event {self.id}: {self.interaction!r} at {self.datetime} "
            f"employee_id={self.employee_id} customer_id={self.customer_id}>"
        )

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

    #Validations
    @validates("title")
    def title_validation(self, key, value):
        return require_text(key, value)

    @validates("status")
    def status_validation(self, key, value):
        statuses = ("open", "in_progress", "complete")
        if value not in statuses:
            raise ValueError(f"Status must be one of the following: {statuses}")
        return value

    def __repr__(self):
        return (
            f"<Task {self.id}: {self.title!r} status={self.status!r} due={self.due_date} "
            f"employee_id={self.employee_id} customer_id={self.customer_id}>"
        )

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

    #Validations
    @validates("content")
    def content_validation(self, key, value):
        return require_text(key, value)

    def __repr__(self):
        # Truncate so long notes don't flood the shell output
        preview = self.content if len(self.content) <= 30 else self.content[:27] + "..."
        return (
            f"<Note {self.id}: {preview!r} "
            f"employee_id={self.employee_id} customer_id={self.customer_id}>"
        )