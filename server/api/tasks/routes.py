from flask import request

from api.tasks import tasks_api
from api.helpers import ProtectedResource, get_or_404, current_user, can_modify, reject_unknown
from config import db
from models import Task, Customer, User
from schema import TaskSchema, tasks_schema

class CustomerTasks(ProtectedResource):
    def get(self, customer_id):
        get_or_404(Customer, customer_id)
        tasks = Task.query.filter_by(customer_id=customer_id).order_by(Task.due_date).all()
        return tasks_schema.dump(tasks), 200

    def post(self, customer_id):
        get_or_404(Customer, customer_id)
        r = request.get_json(silent=True) or {}
        data = TaskSchema().load({**r, "customer_id": customer_id,})
        get_or_404(User, data["employee_id"])
        task = Task(**data)
        db.session.add(task)
        db.session.commit()
        return TaskSchema().dump(task), 201

class TaskList(ProtectedResource):
    def get(self):
        user = current_user()
        query = Task.query
        if user.is_admin:
            employee_id = request.args.get("employee_id")
            if employee_id:
                query = query.filter_by(employee_id=employee_id)
        else:
            query = query.filter_by(employee_id=user.id)
        status = request.args.get("status")
        if status:
            query = query.filter_by(status=status)
        return tasks_schema.dump(query.order_by(Task.due_date).all()), 200

class TaskDetail(ProtectedResource):
    def get(self, id):
        task = get_or_404(Task, id)
        if not can_modify(current_user(), task.employee_id):
            return {"error": "unauthorized access"}, 403
        return TaskSchema().dump(task), 200

    def patch(self, id):
        task = get_or_404(Task, id)
        if not can_modify(current_user(), task.employee_id):
            return {"error": "unauthorized access"}, 403
        r = request.get_json(silent=True) or {}
        err = reject_unknown(r, {"title", "status", "due_date", "notes", "employee_id"})
        if err:
            return err
        data = TaskSchema().load(r, partial=True)
        if "employee_id" in data: 
            get_or_404(User, data["employee_id"])
        for key, value in data.items():
            setattr(task, key, value)
        db.session.commit()
        return TaskSchema().dump(task), 200

    def delete(self, id):
        task = get_or_404(Task, id)
        if not can_modify(current_user(), task.employee_id):
            return {"error": "unauthorized access"}, 403
        db.session.delete(task)
        db.session.commit()
        return "", 204

tasks_api.add_resource(CustomerTasks, "/customers/<int:customer_id>/tasks")
tasks_api.add_resource(TaskList, "/tasks")
tasks_api.add_resource(TaskDetail, "/tasks/<int:id>")