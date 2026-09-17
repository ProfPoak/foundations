from datetime import date, datetime

import pytest
from marshmallow import ValidationError

from schema import (
    UserSchema,
    CustomerSchema,
    EventSchema,
    TaskSchema,
    NoteSchema,
)


# ============================================
# USER SCHEMA
# ============================================
class TestUserSchema:
    def test_load_valid_data(self):
        data = {"username": "jdoe"}
        result = UserSchema().load(data)
        assert result["username"] == "jdoe"

    def test_username_is_required(self):
        with pytest.raises(ValidationError) as exc:
            UserSchema().load({})
        assert "username" in exc.value.messages

    def test_username_max_length_enforced(self):
        with pytest.raises(ValidationError) as exc:
            UserSchema().load({"username": "a" * 21})
        assert "username" in exc.value.messages

    def test_username_at_max_length_is_valid(self):
        data = {"username": "a" * 20}
        result = UserSchema().load(data)
        assert result["username"] == "a" * 20

    def test_id_rejected_as_unknown_field_on_load(self):
        # dump_only fields aren't part of the load schema; with the default
        # unknown="raise" behavior, passing one back in raises rather than
        # being silently dropped.
        with pytest.raises(ValidationError) as exc:
            UserSchema().load({"username": "jdoe", "id": 99})
        assert "id" in exc.value.messages

    def test_is_admin_rejected_as_unknown_field_on_load(self):
        with pytest.raises(ValidationError) as exc:
            UserSchema().load({"username": "jdoe", "is_admin": True})
        assert "is_admin" in exc.value.messages

    def test_password_hash_never_exposed_on_dump(self):
        # Simulate a User-like object with a private hash attribute
        class FakeUser:
            id = 1
            username = "jdoe"
            is_admin = False
            _password_hash = "supersecret_hash"

        dumped = UserSchema().dump(FakeUser())
        assert "_password_hash" not in dumped
        assert "password_hash" not in dumped

    def test_dump_includes_expected_fields(self):
        class FakeUser:
            id = 1
            username = "jdoe"
            is_admin = True

        dumped = UserSchema().dump(FakeUser())
        assert dumped == {"id": 1, "username": "jdoe", "is_admin": True}


# ============================================
# CUSTOMER SCHEMA
# ============================================
class TestCustomerSchema:
    def _valid_payload(self, **overrides):
        payload = {
            "first_name": "Josh",
            "last_name": "Smith",
            "birthday": "1990-01-01",
            "address": "123 Main St",
            "phone": "555-1234",
            "email": "josh@example.com",
            "status": "potential",
        }
        payload.update(overrides)
        return payload

    def test_load_valid_data(self):
        result = CustomerSchema().load(self._valid_payload())
        assert result["first_name"] == "Josh"
        assert result["last_name"] == "Smith"
        assert result["birthday"] == date(1990, 1, 1)
        assert result["email"] == "josh@example.com"
        assert result["status"] == "potential"

    def test_first_name_is_required(self):
        payload = self._valid_payload()
        del payload["first_name"]
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "first_name" in exc.value.messages

    def test_last_name_is_required(self):
        payload = self._valid_payload()
        del payload["last_name"]
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "last_name" in exc.value.messages

    def test_optional_fields_can_be_omitted(self):
        payload = {"first_name": "Josh", "last_name": "Smith"}
        result = CustomerSchema().load(payload)
        assert result["first_name"] == "Josh"
        assert "birthday" not in result

    def test_invalid_email_format_rejected(self):
        payload = self._valid_payload(email="not-an-email")
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "email" in exc.value.messages

    def test_status_must_be_valid_choice(self):
        payload = self._valid_payload(status="deleted")
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "status" in exc.value.messages

    def test_status_accepts_each_valid_choice(self):
        for status in ("potential", "client", "inactive"):
            payload = self._valid_payload(status=status)
            result = CustomerSchema().load(payload)
            assert result["status"] == status

    def test_invalid_birthday_format_rejected(self):
        payload = self._valid_payload(birthday="not-a-date")
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "birthday" in exc.value.messages

    def test_id_and_full_name_rejected_as_unknown_fields_on_load(self):
        payload = self._valid_payload()
        payload["id"] = 5
        payload["full_name"] = "Ignored Name"
        with pytest.raises(ValidationError) as exc:
            CustomerSchema().load(payload)
        assert "id" in exc.value.messages
        assert "full_name" in exc.value.messages

    def test_full_name_present_on_dump(self):
        class FakeCustomer:
            id = 1
            first_name = "Josh"
            last_name = "Smith"
            full_name = "Josh Smith"
            birthday = None
            address = None
            phone = None
            email = None
            status = "potential"

        dumped = CustomerSchema().dump(FakeCustomer())
        assert dumped["full_name"] == "Josh Smith"


# ============================================
# SHARED FIXTURES FOR EVENT / TASK / NOTE
# ============================================
class FakeUser:
    id = 1
    username = "jdoe"
    is_admin = False


class FakeCustomer:
    id = 1
    first_name = "Josh"
    last_name = "Smith"
    full_name = "Josh Smith"
    birthday = None
    address = None
    phone = None
    email = "josh@example.com"
    status = "potential"


# ============================================
# EVENT SCHEMA
# ============================================
class TestEventSchema:
    def test_load_valid_data(self):
        payload = {
            "interaction": "call",
            "notes": "Discussed listing options",
            "employee_id": 1,
            "customer_id": 1,
        }
        result = EventSchema().load(payload)
        assert result["interaction"] == "call"
        assert result["employee_id"] == 1
        assert result["customer_id"] == 1

    def test_interaction_is_required(self):
        payload = {"employee_id": 1, "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            EventSchema().load(payload)
        assert "interaction" in exc.value.messages

    def test_employee_id_is_required(self):
        payload = {"interaction": "call", "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            EventSchema().load(payload)
        assert "employee_id" in exc.value.messages

    def test_customer_id_is_required(self):
        payload = {"interaction": "call", "employee_id": 1}
        with pytest.raises(ValidationError) as exc:
            EventSchema().load(payload)
        assert "customer_id" in exc.value.messages

    def test_datetime_and_id_rejected_as_unknown_fields_on_load(self):
        payload = {
            "interaction": "call",
            "employee_id": 1,
            "customer_id": 1,
            "id": 99,
            "datetime": "2026-01-01T00:00:00",
        }
        with pytest.raises(ValidationError) as exc:
            EventSchema().load(payload)
        assert "id" in exc.value.messages
        assert "datetime" in exc.value.messages

    def test_nested_employee_and_customer_on_dump(self):
        class FakeEvent:
            id = 1
            datetime = datetime(2026, 1, 1)
            interaction = "call"
            notes = "Discussed listing options"
            employee_id = 1
            customer_id = 1
            employee = FakeUser()
            customer = FakeCustomer()

        dumped = EventSchema().dump(FakeEvent())
        assert dumped["employee"]["username"] == "jdoe"
        assert dumped["customer"]["full_name"] == "Josh Smith"

    def test_nested_employee_and_customer_rejected_as_unknown_on_load(self):
        # employee/customer are dump_only Nested fields too, so sending
        # them back in on load hits the same "unknown field" behavior.
        payload = {
            "interaction": "call",
            "employee_id": 1,
            "customer_id": 1,
            "employee": {"username": "should-be-ignored"},
            "customer": {"first_name": "should-be-ignored"},
        }
        with pytest.raises(ValidationError) as exc:
            EventSchema().load(payload)
        assert "employee" in exc.value.messages
        assert "customer" in exc.value.messages


# ============================================
# TASK SCHEMA
# ============================================
class TestTaskSchema:
    def test_load_valid_data(self):
        payload = {
            "title": "Follow up call",
            "status": "open",
            "due_date": "2026-10-01",
            "employee_id": 1,
            "customer_id": 1,
        }
        result = TaskSchema().load(payload)
        assert result["title"] == "Follow up call"
        assert result["due_date"] == date(2026, 10, 1)

    def test_title_is_required(self):
        payload = {"employee_id": 1, "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            TaskSchema().load(payload)
        assert "title" in exc.value.messages

    def test_employee_id_is_required(self):
        payload = {"title": "Follow up call", "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            TaskSchema().load(payload)
        assert "employee_id" in exc.value.messages

    def test_customer_id_is_required(self):
        payload = {"title": "Follow up call", "employee_id": 1}
        with pytest.raises(ValidationError) as exc:
            TaskSchema().load(payload)
        assert "customer_id" in exc.value.messages

    def test_status_must_be_valid_choice(self):
        payload = {
            "title": "Follow up call",
            "status": "not_a_real_status",
            "employee_id": 1,
            "customer_id": 1,
        }
        with pytest.raises(ValidationError) as exc:
            TaskSchema().load(payload)
        assert "status" in exc.value.messages

    def test_status_accepts_each_valid_choice(self):
        for status in ("open", "in_progress", "complete"):
            payload = {
                "title": "Follow up call",
                "status": status,
                "employee_id": 1,
                "customer_id": 1,
            }
            result = TaskSchema().load(payload)
            assert result["status"] == status

    def test_optional_fields_can_be_omitted(self):
        payload = {"title": "Follow up call", "employee_id": 1, "customer_id": 1}
        result = TaskSchema().load(payload)
        assert "due_date" not in result
        assert "notes" not in result

    def test_nested_employee_and_customer_on_dump(self):
        class FakeTask:
            id = 1
            title = "Follow up call"
            status = "open"
            due_date = date(2026, 10, 1)
            notes = None
            employee_id = 1
            customer_id = 1
            employee = FakeUser()
            customer = FakeCustomer()

        dumped = TaskSchema().dump(FakeTask())
        assert dumped["employee"]["username"] == "jdoe"
        assert dumped["customer"]["full_name"] == "Josh Smith"


# ============================================
# NOTE SCHEMA
# ============================================
class TestNoteSchema:
    def test_load_valid_data(self):
        payload = {
            "content": "Prefers email contact",
            "employee_id": 1,
            "customer_id": 1,
        }
        result = NoteSchema().load(payload)
        assert result["content"] == "Prefers email contact"

    def test_content_is_required(self):
        payload = {"employee_id": 1, "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            NoteSchema().load(payload)
        assert "content" in exc.value.messages

    def test_employee_id_is_required(self):
        payload = {"content": "Prefers email contact", "customer_id": 1}
        with pytest.raises(ValidationError) as exc:
            NoteSchema().load(payload)
        assert "employee_id" in exc.value.messages

    def test_customer_id_is_required(self):
        payload = {"content": "Prefers email contact", "employee_id": 1}
        with pytest.raises(ValidationError) as exc:
            NoteSchema().load(payload)
        assert "customer_id" in exc.value.messages

    def test_datetime_and_id_rejected_as_unknown_fields_on_load(self):
        payload = {
            "content": "Prefers email contact",
            "employee_id": 1,
            "customer_id": 1,
            "id": 99,
            "datetime": "2026-01-01T00:00:00",
        }
        with pytest.raises(ValidationError) as exc:
            NoteSchema().load(payload)
        assert "id" in exc.value.messages
        assert "datetime" in exc.value.messages

    def test_nested_employee_and_customer_on_dump(self):
        class FakeNote:
            id = 1
            datetime = datetime(2026, 1, 1)
            content = "Prefers email contact"
            employee_id = 1
            customer_id = 1
            employee = FakeUser()
            customer = FakeCustomer()

        dumped = NoteSchema().dump(FakeNote())
        assert dumped["employee"]["username"] == "jdoe"
        assert dumped["customer"]["full_name"] == "Josh Smith"