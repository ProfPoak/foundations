from datetime import date

import pytest
from flask_jwt_extended import create_access_token

#Importing app (not config) registers the API blueprints
from app import app
from config import db
from models import User, Customer, Event, Task, Note


# ============================================
# FIXTURES
# ============================================
PASSWORD = "password123"


def make_user(username, is_admin=False):
    user = User(username=username, is_admin=is_admin)
    user.password_hash = PASSWORD
    db.session.add(user)
    db.session.commit()
    return user


def auth(user):
    token = create_access_token(identity=str(user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    return app.test_client()


@pytest.fixture
def admin():
    return make_user("admin", is_admin=True)


@pytest.fixture
def employee():
    return make_user("employee")


@pytest.fixture
def other_employee():
    return make_user("other")


@pytest.fixture
def customer():
    customer = Customer(first_name="Jane", last_name="Smith", email="jane@example.com")
    db.session.add(customer)
    db.session.commit()
    return customer


@pytest.fixture
def task(employee, customer):
    task = Task(title="Call back", employee_id=employee.id, customer_id=customer.id,
                due_date=date(2030, 1, 1))
    db.session.add(task)
    db.session.commit()
    return task


@pytest.fixture
def note(employee, customer):
    note = Note(content="Prefers email", employee_id=employee.id, customer_id=customer.id)
    db.session.add(note)
    db.session.commit()
    return note


# ============================================
# AUTH
# ============================================
class TestSignup:
    def test_creates_user_and_returns_token(self, client):
        resp = client.post("/signup", json={"username": "NewUser", "password": PASSWORD})
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["token"]
        assert body["user"]["username"] == "newuser"
        assert body["user"]["is_admin"] is False
        assert "_password_hash" not in body["user"]

    def test_cannot_make_self_admin(self, client):
        resp = client.post("/signup", json={"username": "sneaky", "password": PASSWORD, "is_admin": True})
        assert resp.status_code == 201
        assert resp.get_json()["user"]["is_admin"] is False

    def test_duplicate_username(self, client, employee):
        resp = client.post("/signup", json={"username": "EMPLOYEE", "password": PASSWORD})
        assert resp.status_code == 409

    def test_short_password(self, client):
        resp = client.post("/signup", json={"username": "newuser", "password": "short"})
        assert resp.status_code == 422
        assert User.query.count() == 0

    def test_missing_password(self, client):
        resp = client.post("/signup", json={"username": "newuser"})
        assert resp.status_code == 422


class TestLogin:
    def test_valid_credentials(self, client, employee):
        resp = client.post("/login", json={"username": "employee", "password": PASSWORD})
        assert resp.status_code == 200
        assert resp.get_json()["token"]
        assert resp.get_json()["user"]["id"] == employee.id

    def test_username_is_case_insensitive(self, client, employee):
        resp = client.post("/login", json={"username": "  Employee ", "password": PASSWORD})
        assert resp.status_code == 200

    def test_wrong_password(self, client, employee):
        resp = client.post("/login", json={"username": "employee", "password": "wrongpass"})
        assert resp.status_code == 401

    def test_unknown_user(self, client):
        resp = client.post("/login", json={"username": "ghost", "password": PASSWORD})
        assert resp.status_code == 401

    def test_missing_fields(self, client):
        resp = client.post("/login", json={})
        assert resp.status_code == 400

    def test_token_works_on_protected_route(self, client, employee):
        token = client.post("/login", json={"username": "employee", "password": PASSWORD}).get_json()["token"]
        resp = client.get("/customers", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


class TestCheckSession:
    def test_returns_current_user(self, client, employee):
        resp = client.get("/check_session", headers=auth(employee))
        assert resp.status_code == 200
        assert resp.get_json()["username"] == "employee"


# ============================================
# CUSTOMERS
# ============================================
class TestCustomerList:
    def test_list_sorted_by_last_then_first_name(self, client, employee):
        db.session.add_all([
            Customer(first_name="Zed", last_name="Adams"),
            Customer(first_name="Amy", last_name="Brown"),
            Customer(first_name="Abe", last_name="Adams"),
        ])
        db.session.commit()
        resp = client.get("/customers", headers=auth(employee))
        assert resp.status_code == 200
        assert [c["full_name"] for c in resp.get_json()] == ["Abe Adams", "Zed Adams", "Amy Brown"]

    def test_filter_by_status(self, client, employee):
        db.session.add_all([
            Customer(first_name="A", last_name="A", status="client"),
            Customer(first_name="B", last_name="B", status="potential"),
        ])
        db.session.commit()
        resp = client.get("/customers?status=client", headers=auth(employee))
        assert [c["first_name"] for c in resp.get_json()] == ["A"]

    def test_invalid_status_filter(self, client, employee):
        resp = client.get("/customers?status=bogus", headers=auth(employee))
        assert resp.status_code == 400

    def test_create(self, client, employee):
        resp = client.post("/customers", headers=auth(employee), json={
            "first_name": "Jane", "last_name": "Smith", "phone": "555.123.4567",
            "email": "JANE@Example.com", "birthday": "1990-05-01",
        })
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["phone"] == "(555) 123-4567"
        assert body["email"] == "jane@example.com"
        assert body["status"] == "potential"

    def test_create_missing_required_fields(self, client, employee):
        resp = client.post("/customers", headers=auth(employee), json={})
        assert resp.status_code == 400
        assert {"first_name", "last_name"} <= resp.get_json()["errors"].keys()

    def test_create_invalid_phone(self, client, employee):
        resp = client.post("/customers", headers=auth(employee),
                           json={"first_name": "A", "last_name": "B", "phone": "123"})
        assert resp.status_code == 400
        assert Customer.query.count() == 0

    def test_create_duplicate_email(self, client, employee, customer):
        resp = client.post("/customers", headers=auth(employee),
                           json={"first_name": "A", "last_name": "B", "email": "jane@example.com"})
        assert resp.status_code == 409


class TestCustomerDetail:
    def test_get(self, client, employee, customer):
        resp = client.get(f"/customers/{customer.id}", headers=auth(employee))
        assert resp.status_code == 200
        assert resp.get_json()["email"] == "jane@example.com"

    def test_get_not_found(self, client, employee):
        resp = client.get("/customers/999", headers=auth(employee))
        assert resp.status_code == 404

    def test_patch(self, client, employee, customer):
        resp = client.patch(f"/customers/{customer.id}", headers=auth(employee), json={"status": "client"})
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "client"
        assert resp.get_json()["first_name"] == "Jane"

    def test_patch_invalid_status(self, client, employee, customer):
        resp = client.patch(f"/customers/{customer.id}", headers=auth(employee), json={"status": "vip"})
        assert resp.status_code == 400

    def test_patch_not_found(self, client, employee):
        resp = client.patch("/customers/999", headers=auth(employee), json={"status": "client"})
        assert resp.status_code == 404


# ============================================
# EVENTS
# ============================================
class TestCustomerEvents:
    def test_create_uses_logged_in_user(self, client, employee, other_employee, customer):
        resp = client.post(f"/customers/{customer.id}/events", headers=auth(employee),
                           json={"interaction": "call", "notes": "Left voicemail", "employee_id": other_employee.id})
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["employee_id"] == employee.id
        assert body["customer_id"] == customer.id

    def test_create_invalid_interaction(self, client, employee, customer):
        resp = client.post(f"/customers/{customer.id}/events", headers=auth(employee),
                           json={"interaction": "carrier pigeon"})
        assert resp.status_code == 400

    def test_create_customer_not_found(self, client, employee):
        resp = client.post("/customers/999/events", headers=auth(employee), json={"interaction": "call"})
        assert resp.status_code == 404

    def test_list(self, client, employee, customer):
        db.session.add(Event(interaction="call", employee_id=employee.id, customer_id=customer.id))
        db.session.commit()
        resp = client.get(f"/customers/{customer.id}/events", headers=auth(employee))
        assert resp.status_code == 200
        assert [e["interaction"] for e in resp.get_json()] == ["call"]

    def test_list_customer_not_found(self, client, employee):
        assert client.get("/customers/999/events", headers=auth(employee)).status_code == 404


# ============================================
# NOTES
# ============================================
class TestCustomerNotes:
    def test_create_uses_logged_in_user(self, client, employee, customer):
        resp = client.post(f"/customers/{customer.id}/notes", headers=auth(employee), json={"content": "Likes mornings"})
        assert resp.status_code == 201
        assert resp.get_json()["content"] == "Likes mornings"
        assert resp.get_json()["employee_id"] == employee.id

    def test_create_blank_content(self, client, employee, customer):
        resp = client.post(f"/customers/{customer.id}/notes", headers=auth(employee), json={"content": "   "})
        assert resp.status_code == 400
        assert Note.query.count() == 0

    def test_create_customer_not_found(self, client, employee):
        resp = client.post("/customers/999/notes", headers=auth(employee), json={"content": "hi"})
        assert resp.status_code == 404

    def test_list(self, client, employee, note):
        resp = client.get(f"/customers/{note.customer_id}/notes", headers=auth(employee))
        assert resp.status_code == 200
        assert [n["content"] for n in resp.get_json()] == ["Prefers email"]


class TestNoteDetail:
    def test_owner_can_edit(self, client, employee, note):
        resp = client.patch(f"/notes/{note.id}", headers=auth(employee), json={"content": "Prefers text"})
        assert resp.status_code == 200
        assert resp.get_json()["content"] == "Prefers text"

    def test_admin_can_edit(self, client, admin, note):
        resp = client.patch(f"/notes/{note.id}", headers=auth(admin), json={"content": "Edited"})
        assert resp.status_code == 200

    def test_other_employee_cannot_edit(self, client, other_employee, note):
        resp = client.patch(f"/notes/{note.id}", headers=auth(other_employee), json={"content": "Hacked"})
        assert resp.status_code == 403

    def test_cannot_edit_restricted_fields(self, client, employee, note):
        resp = client.patch(f"/notes/{note.id}", headers=auth(employee), json={"content": "x", "employee_id": 1})
        assert resp.status_code == 400

    def test_owner_can_delete(self, client, employee, note):
        resp = client.delete(f"/notes/{note.id}", headers=auth(employee))
        assert resp.status_code == 204
        assert db.session.get(Note, note.id) is None

    def test_other_employee_cannot_delete(self, client, other_employee, note):
        assert client.delete(f"/notes/{note.id}", headers=auth(other_employee)).status_code == 403
        assert db.session.get(Note, note.id) is not None

    def test_not_found(self, client, employee):
        assert client.delete("/notes/999", headers=auth(employee)).status_code == 404


# ============================================
# TASKS
# ============================================
class TestCustomerTasks:
    def test_create(self, client, admin, employee, customer):
        resp = client.post(f"/customers/{customer.id}/tasks", headers=auth(admin),
                           json={"title": "Send quote", "employee_id": employee.id, "due_date": "2030-02-01"})
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["status"] == "open"
        assert body["employee_id"] == employee.id
        assert body["customer_id"] == customer.id

    def test_create_unknown_employee(self, client, employee, customer):
        resp = client.post(f"/customers/{customer.id}/tasks", headers=auth(employee),
                           json={"title": "x", "employee_id": 999})
        assert resp.status_code == 404
        assert Task.query.count() == 0

    def test_create_missing_fields(self, client, employee, customer):
        resp = client.post(f"/customers/{customer.id}/tasks", headers=auth(employee), json={})
        assert resp.status_code == 400

    def test_list_sorted_by_due_date(self, client, employee, customer):
        for title, due in (("Later", date(2030, 6, 1)), ("Sooner", date(2030, 1, 1))):
            db.session.add(Task(title=title, due_date=due, employee_id=employee.id, customer_id=customer.id))
        db.session.commit()
        resp = client.get(f"/customers/{customer.id}/tasks", headers=auth(employee))
        assert resp.status_code == 200
        assert [t["title"] for t in resp.get_json()] == ["Sooner", "Later"]


class TestTaskList:
    @pytest.fixture
    def tasks(self, employee, other_employee, customer):
        db.session.add_all([
            Task(title="Mine open", employee_id=employee.id, customer_id=customer.id),
            Task(title="Mine done", status="complete", employee_id=employee.id, customer_id=customer.id),
            Task(title="Theirs", employee_id=other_employee.id, customer_id=customer.id),
        ])
        db.session.commit()

    def test_employee_sees_only_own_tasks(self, client, employee, tasks):
        resp = client.get("/tasks", headers=auth(employee))
        assert resp.status_code == 200
        assert {t["title"] for t in resp.get_json()} == {"Mine open", "Mine done"}

    def test_admin_sees_all_tasks(self, client, admin, tasks):
        resp = client.get("/tasks", headers=auth(admin))
        assert len(resp.get_json()) == 3

    def test_admin_can_filter_by_employee(self, client, admin, other_employee, tasks):
        resp = client.get(f"/tasks?employee_id={other_employee.id}", headers=auth(admin))
        assert [t["title"] for t in resp.get_json()] == ["Theirs"]

    def test_filter_by_status(self, client, employee, tasks):
        resp = client.get("/tasks?status=complete", headers=auth(employee))
        assert [t["title"] for t in resp.get_json()] == ["Mine done"]


class TestTaskDetail:
    def test_owner_can_view(self, client, employee, task):
        resp = client.get(f"/tasks/{task.id}", headers=auth(employee))
        assert resp.status_code == 200
        assert resp.get_json()["title"] == "Call back"

    def test_other_employee_cannot_view(self, client, other_employee, task):
        assert client.get(f"/tasks/{task.id}", headers=auth(other_employee)).status_code == 403

    def test_not_found(self, client, employee):
        assert client.get("/tasks/999", headers=auth(employee)).status_code == 404

    def test_owner_can_update(self, client, employee, task):
        resp = client.patch(f"/tasks/{task.id}", headers=auth(employee), json={"status": "in_progress"})
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "in_progress"

    def test_admin_can_reassign(self, client, admin, other_employee, task):
        resp = client.patch(f"/tasks/{task.id}", headers=auth(admin), json={"employee_id": other_employee.id})
        assert resp.status_code == 200
        assert resp.get_json()["employee_id"] == other_employee.id

    def test_other_employee_cannot_update(self, client, other_employee, task):
        resp = client.patch(f"/tasks/{task.id}", headers=auth(other_employee), json={"status": "complete"})
        assert resp.status_code == 403

    def test_invalid_status(self, client, employee, task):
        resp = client.patch(f"/tasks/{task.id}", headers=auth(employee), json={"status": "done"})
        assert resp.status_code == 400

    def test_cannot_edit_restricted_fields(self, client, employee, task):
        resp = client.patch(f"/tasks/{task.id}", headers=auth(employee), json={"customer_id": 2})
        assert resp.status_code == 400

    def test_owner_can_delete(self, client, employee, task):
        assert client.delete(f"/tasks/{task.id}", headers=auth(employee)).status_code == 204
        assert db.session.get(Task, task.id) is None

    def test_other_employee_cannot_delete(self, client, other_employee, task):
        assert client.delete(f"/tasks/{task.id}", headers=auth(other_employee)).status_code == 403


# ============================================
# USERS
# ============================================
class TestUsers:
    def test_list_sorted_by_username(self, client, employee, admin):
        resp = client.get("/users", headers=auth(employee))
        assert resp.status_code == 200
        assert [u["username"] for u in resp.get_json()] == ["admin", "employee"]

    def test_get(self, client, employee, admin):
        resp = client.get(f"/users/{admin.id}", headers=auth(employee))
        assert resp.status_code == 200
        assert resp.get_json()["is_admin"] is True

    def test_get_not_found(self, client, employee):
        assert client.get("/users/999", headers=auth(employee)).status_code == 404

    def test_admin_can_delete_user(self, client, admin, employee):
        assert client.delete(f"/users/{employee.id}", headers=auth(admin)).status_code == 204
        assert db.session.get(User, employee.id) is None

    def test_non_admin_cannot_delete(self, client, employee, other_employee):
        assert client.delete(f"/users/{other_employee.id}", headers=auth(employee)).status_code == 403

    def test_admin_cannot_delete_self(self, client, admin):
        assert client.delete(f"/users/{admin.id}", headers=auth(admin)).status_code == 400

    def test_cannot_delete_user_with_history(self, client, admin, employee, note):
        assert client.delete(f"/users/{employee.id}", headers=auth(admin)).status_code == 409
