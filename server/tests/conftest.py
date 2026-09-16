import pytest
from config import app, db


@pytest.fixture(autouse=True)
def session():
    """
    Wrap every test in its own app context + clean schema.
    autouse=True means every test in this folder gets this
    without needing to request it explicitly.
    """
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.rollback()
        db.session.remove()
        db.drop_all()