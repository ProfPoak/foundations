from random import randint, choice as rc
from faker import Faker
from app import app

from config import db
from models import User, Customer, Event, Task, Note

fake = Faker()

with app.app_context():
    print("Clearing tables...")
    Note.query.delete()
    Task.query.delete()
    Event.query.delete()
    Customer.query.delete()
    User.query.delete()
    db.session.commit()

    print("Seeding users...")
    users = []

    admin = User(username="admin", is_admin=True)
    admin.password_hash = "password"
    users.append(admin)

    for _ in range(5):
        user = User(username=fake.unique.user_name(), is_admin=False)
        user.password_hash = "password"
        users.append(user)

    db.session.add_all(users)
    db.session.commit()

    print("Seeding customers...")
    customers = []
    statuses = ["potential", "client", "inactive"]

    for _ in range(20):
        customer = Customer(
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            birthday=fake.date_of_birth(minimum_age=18, maximum_age=85),
            address=fake.address(),
            phone=fake.phone_number(),
            email=fake.unique.email(),
            status=rc(statuses),
        )
        customers.append(customer)

    db.session.add_all(customers)
    db.session.commit()

    print("Seeding events...")
    interactions = ["call", "email", "in-person meeting", "showing", "follow-up"]
    events = []

    for customer in customers:
        for _ in range(randint(1, 4)):
            event = Event(
                datetime=fake.date_time_between(start_date="-1y", end_date="now"),
                interaction=rc(interactions),
                notes=fake.sentence() if rc([True, False]) else None,
                employee=rc(users),
                customer=customer,
            )
            events.append(event)

    db.session.add_all(events)
    db.session.commit()

    print("Seeding tasks...")
    task_titles = [
        "Follow up call", "Send listing docs", "Schedule showing",
        "Prepare offer paperwork", "Check in on financing",
    ]
    task_statuses = ["open", "in_progress", "complete"]
    tasks = []

    for customer in customers:
        for _ in range(randint(0, 3)):
            task = Task(
                title=rc(task_titles),
                status=rc(task_statuses),
                due_date=fake.date_between(start_date="today", end_date="+60d"),
                notes=fake.sentence() if rc([True, False]) else None,
                employee=rc(users),
                customer=customer,
            )
            tasks.append(task)

    db.session.add_all(tasks)
    db.session.commit()

    print("Seeding notes...")
    notes = []

    for customer in customers:
        for _ in range(randint(0, 3)):
            note = Note(
                datetime=fake.date_time_between(start_date="-1y", end_date="now"),
                content=fake.sentence(nb_words=12),
                employee=rc(users),
                customer=customer,
            )
            notes.append(note)

    db.session.add_all(notes)
    db.session.commit()

    print("Done seeding!")