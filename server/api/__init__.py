
def register_blueprints(app):
    from api.customers import customers_bp
    from api.events import events_bp
    from api.notes import notes_bp
    from api.tasks import tasks_bp
    from api.users import users_bp

    for bp in (customers_bp, events_bp, notes_bp, tasks_bp, users_bp):
        app.register_blueprint(bp)