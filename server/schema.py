from marshmallow import Schema, fields, validate


class UserSchema(Schema):
    id = fields.Integer(dump_only=True)
    username = fields.String(required=True, validate=validate.Length(max=20))
    is_admin = fields.Boolean(dump_only=True)
    # _password_hash is intentionally never exposed


class CustomerSchema(Schema):
    id = fields.Integer(dump_only=True)
    first_name = fields.String(required=True)
    last_name = fields.String(required=True)
    full_name = fields.String(dump_only=True)
    birthday = fields.Date(allow_none=True)
    address = fields.String(allow_none=True)
    phone = fields.String(allow_none=True)
    email = fields.Email(allow_none=True)
    status = fields.String(
        validate=validate.OneOf(["potential", "client", "inactive"])
    )


class EventSchema(Schema):
    id = fields.Integer(dump_only=True)
    datetime = fields.DateTime(dump_only=True)
    interaction = fields.String(required=True)
    notes = fields.String(allow_none=True)

    employee_id = fields.Integer(required=True)
    customer_id = fields.Integer(required=True)

    employee = fields.Nested(UserSchema, dump_only=True)
    customer = fields.Nested(CustomerSchema, dump_only=True)


class TaskSchema(Schema):
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True)
    status = fields.String(
        validate=validate.OneOf(["open", "in_progress", "complete"])
    )
    due_date = fields.Date(allow_none=True)
    notes = fields.String(allow_none=True)

    employee_id = fields.Integer(required=True)
    customer_id = fields.Integer(required=True)

    employee = fields.Nested(UserSchema, dump_only=True)
    customer = fields.Nested(CustomerSchema, dump_only=True)


class NoteSchema(Schema):
    id = fields.Integer(dump_only=True)
    datetime = fields.DateTime(dump_only=True)
    content = fields.String(required=True)

    employee_id = fields.Integer(required=True)
    customer_id = fields.Integer(required=True)

    employee = fields.Nested(UserSchema, dump_only=True)
    customer = fields.Nested(CustomerSchema, dump_only=True)


user_schema = UserSchema()
users_schema = UserSchema(many=True)

customer_schema = CustomerSchema()
customers_schema = CustomerSchema(many=True)

event_schema = EventSchema()
events_schema = EventSchema(many=True)

task_schema = TaskSchema()
tasks_schema = TaskSchema(many=True)

note_schema = NoteSchema()
notes_schema = NoteSchema(many=True)