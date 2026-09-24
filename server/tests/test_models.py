from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from config import db
from models import User, Customer, Event, Task, Note


# ============================================
# USER
# ============================================
class TestUser:
    def test_can_create_user(self, session):
        user = User(username="jdoe", is_admin=False)
        user.password_hash = "supersecret"
        session.add(user)
        session.commit()

        assert user.id is not None
        assert user.username == "jdoe"
        assert user.is_admin is False

    def test_password_is_write_only(self, session):
        user = User(username="jdoe")
        user.password_hash = "supersecret"

        with pytest.raises(AttributeError):
            user.password_hash

    def test_authenticate_correct_password(self, session):
        user = User(username="jdoe")
        user.password_hash = "supersecret"

        assert user.authenticate("supersecret") is True

    def test_authenticate_incorrect_password(self, session):
        user = User(username="jdoe")
        user.password_hash = "supersecret"

        assert user.authenticate("wrongpassword") is False

    def test_password_minimum_length(self, session):
        user = User(username="jdoe")
        with pytest.raises(ValueError):
            user.password_hash = "short"

    def test_password_cannot_be_none(self, session):
        user = User(username="jdoe")
        with pytest.raises(ValueError):
            user.password_hash = None

    def test_requires_username(self, session):
        with pytest.raises(ValueError):
            User(username="")

    def test_username_cannot_be_whitespace(self, session):
        with pytest.raises(ValueError):
            User(username="   ")

    def test_username_is_stripped(self, session):
        user = User(username="  jdoe  ")
        assert user.username == "jdoe"

    def test_username_is_lowercased(self, session):
        user = User(username="JDoe")
        assert user.username == "jdoe"

    def test_username_uniqueness_ignores_case(self, session):
        user1 = User(username="jdoe")
        user1.password_hash = "password1"
        session.add(user1)
        session.commit()

        user2 = User(username="JDOE")
        user2.password_hash = "password2"
        session.add(user2)

        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_username_must_be_unique(self, session):
        user1 = User(username="jdoe")
        user1.password_hash = "password1"
        session.add(user1)
        session.commit()

        user2 = User(username="jdoe")
        user2.password_hash = "password2"
        session.add(user2)

        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_is_admin_defaults_false(self, session):
        user = User(username="jdoe")
        user.password_hash = "supersecret"
        session.add(user)
        session.commit()

        assert user.is_admin is False

    def test_is_admin_none_on_create_uses_default(self, session):
        #SQLAlchemy applies the column default when None is passed on insert
        user = User(username="jdoe", is_admin=None)
        user.password_hash = "supersecret"
        session.add(user)
        session.commit()

        assert user.is_admin is False

    def test_is_admin_cannot_be_updated_to_null(self, session):
        user = User(username="jdoe")
        user.password_hash = "supersecret"
        session.add(user)
        session.commit()

        user.is_admin = None
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()


# ============================================
# CUSTOMER
# ============================================
class TestCustomer:
    def test_can_create_customer(self, session):
        customer = Customer(
            first_name="Josh",
            last_name="Smith",
            birthday=date(1990, 1, 1),
            address="123 Main St",
            phone="555-123-4567",
            email="josh@example.com",
        )
        session.add(customer)
        session.commit()

        assert customer.id is not None
        assert customer.first_name == "Josh"

    def test_requires_first_name(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="", last_name="Smith")

    def test_requires_last_name(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="")

    def test_names_cannot_be_whitespace(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="   ", last_name="Smith")
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="   ")

    def test_names_are_stripped(self, session):
        customer = Customer(first_name="  Josh ", last_name=" Smith  ")
        assert customer.full_name == "Josh Smith"

    def test_status_defaults_to_potential(self, session):
        customer = Customer(first_name="Josh", last_name="Smith")
        session.add(customer)
        session.commit()

        assert customer.status == "potential"

    def test_status_must_be_valid(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", status="deleted")

    def test_email_must_be_unique(self, session):
        c1 = Customer(first_name="Josh", last_name="Smith", email="josh@example.com")
        session.add(c1)
        session.commit()

        c2 = Customer(first_name="Jane", last_name="Doe", email="josh@example.com")
        session.add(c2)

        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_email_format_is_validated(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", email="not-an-email")

    @pytest.mark.parametrize("email", ["@example.com", "josh@example.", "josh@.com", "josh @example.com"])
    def test_malformed_emails_rejected(self, session, email):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", email=email)

    def test_email_is_lowercased_and_stripped(self, session):
        customer = Customer(first_name="Josh", last_name="Smith", email="  Josh@Example.com ")
        assert customer.email == "josh@example.com"

    def test_email_uniqueness_ignores_case(self, session):
        session.add(Customer(first_name="Josh", last_name="Smith", email="josh@example.com"))
        session.commit()

        session.add(Customer(first_name="Jane", last_name="Doe", email="JOSH@example.com"))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_birthday_cannot_be_in_future(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", birthday=date.today() + timedelta(days=1))

    def test_birthday_cannot_be_before_minimum(self, session):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", birthday=date(1899, 12, 31))

    def test_birthday_can_be_minimum(self, session):
        customer = Customer(first_name="Josh", last_name="Smith", birthday=Customer.MIN_BIRTHDAY)
        assert customer.birthday == Customer.MIN_BIRTHDAY

    def test_birthday_can_be_today(self, session):
        customer = Customer(first_name="Josh", last_name="Smith", birthday=date.today())
        assert customer.birthday == date.today()

    @pytest.mark.parametrize("phone", [
        "5551234567", "555-123-4567", "555.123.4567", "(555) 123-4567", "+1 555 123 4567", "1-555-123-4567",
    ])
    def test_phone_is_formatted(self, session, phone):
        customer = Customer(first_name="Josh", last_name="Smith", phone=phone)
        assert customer.phone == "(555) 123-4567"

    @pytest.mark.parametrize("phone, expected", [
        ("+44 207 946 0958", "+44 (207) 946-0958"),
        ("+52 (555) 123-4567", "+52 (555) 123-4567"),
        ("+353 555 123 4567", "+353 (555) 123-4567"),
    ])
    def test_phone_keeps_country_code(self, session, phone, expected):
        customer = Customer(first_name="Josh", last_name="Smith", phone=phone)
        assert customer.phone == expected

    @pytest.mark.parametrize("phone", [
        "555-1234", "555-123-45678", "555-123-4567 x22", "555-CALL-NOW",
        "+5551234567", "+1234 555 123 4567", "555+123-4567",
    ])
    def test_invalid_phone_rejected(self, session, phone):
        with pytest.raises(ValueError):
            Customer(first_name="Josh", last_name="Smith", phone=phone)

    def test_blank_optional_fields_stored_as_none(self, session):
        customer = Customer(first_name="Josh", last_name="Smith", email="", phone="  ", address="")
        assert customer.email is None
        assert customer.phone is None
        assert customer.address is None

    def test_full_name_hybrid_property(self, session):
        # Only relevant if you implement the optional full_name hybrid_property
        customer = Customer(first_name="Josh", last_name="Smith")
        assert customer.full_name == "Josh Smith"


# ============================================
# EVENT
# ============================================
class TestEvent:
    def _make_user_and_customer(self, session):
        user = User(username="jdoe")
        user.password_hash = "password"
        customer = Customer(first_name="Josh", last_name="Smith")
        session.add_all([user, customer])
        session.commit()
        return user, customer

    def test_can_create_event(self, session):
        user, customer = self._make_user_and_customer(session)
        event = Event(
            interaction="call",
            notes="Discussed listing options",
            employee=user,
            customer=customer,
        )
        session.add(event)
        session.commit()

        assert event.id is not None
        assert event.employee == user
        assert event.customer == customer

    def test_datetime_defaults_to_now(self, session):
        user, customer = self._make_user_and_customer(session)
        event = Event(interaction="call", employee=user, customer=customer)
        session.add(event)
        session.commit()

        assert isinstance(event.datetime, datetime)

    def test_datetime_reads_back_as_utc(self, session):
        user, customer = self._make_user_and_customer(session)
        event = Event(interaction="call", employee=user, customer=customer)
        session.add(event)
        session.commit()
        session.expire_all()

        assert session.get(Event, event.id).datetime.tzinfo == timezone.utc

    def test_non_utc_datetime_is_converted_to_utc(self, session):
        user, customer = self._make_user_and_customer(session)
        central = timezone(timedelta(hours=-5))
        event = Event(
            interaction="call",
            datetime=datetime(2026, 9, 23, 20, 5, tzinfo=central),
            employee=user,
            customer=customer,
        )
        session.add(event)
        session.commit()
        session.expire_all()

        assert session.get(Event, event.id).datetime == datetime(2026, 9, 24, 1, 5, tzinfo=timezone.utc)

    def test_interaction_must_be_valid(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Event(interaction="carrier pigeon", employee=user, customer=customer)

    def test_requires_interaction(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Event(interaction="", employee=user, customer=customer)

    def test_requires_employee(self, session):
        _, customer = self._make_user_and_customer(session)
        event = Event(interaction="call", customer=customer)
        session.add(event)

        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_requires_customer(self, session):
        user, _ = self._make_user_and_customer(session)
        event = Event(interaction="call", employee=user)
        session.add(event)

        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

    def test_relationship_back_populates(self, session):
        user, customer = self._make_user_and_customer(session)
        event = Event(interaction="call", employee=user, customer=customer)
        session.add(event)
        session.commit()

        assert event in user.events
        assert event in customer.events


# ============================================
# TASK
# ============================================
class TestTask:
    def _make_user_and_customer(self, session):
        user = User(username="jdoe")
        user.password_hash = "password"
        customer = Customer(first_name="Josh", last_name="Smith")
        session.add_all([user, customer])
        session.commit()
        return user, customer

    def test_can_create_task(self, session):
        user, customer = self._make_user_and_customer(session)
        task = Task(
            title="Follow up call",
            due_date=date(2026, 10, 1),
            employee=user,
            customer=customer,
        )
        session.add(task)
        session.commit()

        assert task.id is not None
        assert task.title == "Follow up call"

    def test_status_defaults_to_open(self, session):
        user, customer = self._make_user_and_customer(session)
        task = Task(title="Follow up call", employee=user, customer=customer)
        session.add(task)
        session.commit()

        assert task.status == "open"

    def test_requires_title(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Task(title="", employee=user, customer=customer)

    def test_title_cannot_be_whitespace(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Task(title="   ", employee=user, customer=customer)

    def test_title_is_stripped(self, session):
        user, customer = self._make_user_and_customer(session)
        task = Task(title="  Follow up call  ", employee=user, customer=customer)
        assert task.title == "Follow up call"

    def test_status_must_be_valid(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Task(
                title="Follow up call",
                status="not_a_real_status",
                employee=user,
                customer=customer,
            )

    def test_relationship_back_populates(self, session):
        user, customer = self._make_user_and_customer(session)
        task = Task(title="Follow up call", employee=user, customer=customer)
        session.add(task)
        session.commit()

        assert task in user.tasks
        assert task in customer.tasks


# ============================================
# NOTE
# ============================================
class TestNote:
    def _make_user_and_customer(self, session):
        user = User(username="jdoe")
        user.password_hash = "password"
        customer = Customer(first_name="Josh", last_name="Smith")
        session.add_all([user, customer])
        session.commit()
        return user, customer

    def test_can_create_note(self, session):
        user, customer = self._make_user_and_customer(session)
        note = Note(content="Prefers email contact", employee=user, customer=customer)
        session.add(note)
        session.commit()

        assert note.id is not None
        assert note.content == "Prefers email contact"

    def test_requires_content(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Note(content="", employee=user, customer=customer)

    def test_content_cannot_be_whitespace(self, session):
        user, customer = self._make_user_and_customer(session)
        with pytest.raises(ValueError):
            Note(content="   ", employee=user, customer=customer)

    def test_relationship_back_populates(self, session):
        user, customer = self._make_user_and_customer(session)
        note = Note(content="Prefers email contact", employee=user, customer=customer)
        session.add(note)
        session.commit()

        assert note in user.notes
        assert note in customer.notes