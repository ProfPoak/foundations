from flask import request

from api.notes import notes_api
from api.helpers import ProtectedResource, get_or_404, current_user, can_modify, reject_unknown
from config import db
from models import Note, Customer
from schema import NoteSchema, notes_schema

class CustomerNotes(ProtectedResource):
    def get(self, customer_id):
        get_or_404(Customer, customer_id)
        notes = Note.query.filter_by(customer_id=customer_id).order_by(Note.datetime.desc()).all()
        return notes_schema.dump(notes), 200

    def post(self, customer_id):
        get_or_404(Customer, customer_id)
        user = current_user()
        r = request.get_json()
        data = NoteSchema().load({**r,
                                  "employee_id": user.id,
                                  "customer_id": customer_id})
        note = Note(**data)
        db.session.add(note)
        db.session.commit()
        return NoteSchema().dump(note), 201

class NoteDetail(ProtectedResource):
    def patch(self, id):
        note = get_or_404(Note, id)
        if not can_modify(current_user(), note.employee_id):
            return {"error": "unauthorized access"}, 403
        r = request.get_json(silent=True) or {}
        err = reject_unknown(r, ["content"])
        if err:
            return err
        data = NoteSchema().load(r, partial=True)
        note.content = data["content"]
        db.session.commit()
        return NoteSchema().dump(note), 200

    def delete(self, id):
        note = get_or_404(Note, id)
        if not can_modify(current_user(), note.employee_id):
            return {"error": "unauthorized access"}, 403
        db.session.delete(note)
        db.session.commit()
        return "", 204

notes_api.add_resource(CustomerNotes, "/customers/<int:customer_id>/notes")
notes_api.add_resource(NoteDetail, "/notes/<int:id>")
