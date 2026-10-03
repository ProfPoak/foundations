# Foundations CRM

Foundations is a customer relationship manager for small teams. Employees sign in, keep a shared list of customers, log every interaction with them, leave notes, and assign follow-up tasks with due dates. An admin can manage the team's user accounts.

The app isn't tied to one industry. Customer statuses (`potential`, `client`, `inactive`) and interaction types (call, email, text, meeting, service, follow-up, other) are generic enough for any business that tracks relationships with its customers.

**Live demo:** [finfoundations.netlify.app](https://finfoundations.netlify.app)\
The demo resets to seed data when the server sleeps.

## Technologies used

**Frontend** (`client/`)
- React 19 and React Router 8
- Vite 8 for the dev server and build
- CSS modules for component styles, with theme variables in `src/styles/index.css`
- Vitest, React Testing Library and jsdom for tests
- oxlint for linting

**Backend** (`server/`)
- Python 3.12 and Flask
- Flask-RESTful for the API resources
- Flask-SQLAlchemy and Flask-Migrate (Alembic) for the database and migrations
- Marshmallow for serialization and validation
- Flask-Bcrypt for password hashing
- Flask-JWT-Extended for token-based authentication
- Faker for seed data
- pytest for tests
- Gunicorn as the production server

**Deployment**
- Frontend on Netlify, which proxies `/api/*` requests to the backend
- Backend on Render (see `render.yaml`)

## Setup and running locally

You need Python 3.12, [pipenv](https://pipenv.pypa.io/) and Node.js (version 24 is used in deployment).

### 1. Clone the repository

```bash
git clone https://github.com/ProfPoak/foundations.git
cd foundations
```

### 2. Backend

```bash
pipenv install
pipenv shell
cd server
flask db upgrade      # creates the SQLite database (server/instance/app.db)
python seed.py        # fills it with sample users, customers, events, notes and tasks
python app.py         # runs the API on http://localhost:5555
```

The seed creates an admin account (`admin` / `password`) and five regular users that also use the password `password`. These are for local development only.

The server works without any setup, using development defaults. To override them, set these environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Database connection string | `sqlite:///app.db` |
| `SECRET_KEY` | Flask secret key | a development key |
| `JWT_SECRET_KEY` | Signs login tokens | a development key |

### 3. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev           # runs the app on http://localhost:5173
```

The Vite dev server forwards every request starting with `/api` to the Flask server on port 5555, so both must be running.

### 4. Tests and checks

```bash
# from the project root, inside pipenv shell
pytest

# from client/
npm test              # Vitest suite
npm run lint
npm run build
```

## Core functionality

### Accounts and sign-in
- Sign up with a username and password, or log in to an existing account. Passwords are hashed with bcrypt.
- Logging in returns a JWT. The client stores it and sends it with every API request, and the session is restored on page reload.
- Every page except Login and Signup requires a signed-in user.

### Customers
- The Home page lists every customer, sorted by last name, with their status and phone number.
- A search box filters the list by name as you type.
- Add a customer with a name, status, birthday, phone, email and address. The server validates each field (for example, a unique and well-formed email, and a birthday that isn't in the future).
- Each customer has their own page showing their details. Edit the details in place with the ✏️ button.

### Events, notes and tasks
Each customer page has three sections:
- **Events:** a log of interactions (call, email, meeting and so on), each with optional notes. The employee who logged it and the time are recorded automatically.
- **Notes:** free-text notes about the customer, stamped with author and time.
- **Tasks:** follow-ups with a title, assignee, required due date, status (`open`, `in_progress`, `complete`) and optional notes. A task can be assigned to any user.

A note can be edited or deleted by the employee who wrote it, and a task by the employee it's assigned to. Admins can edit or delete any note or task.

### Admin portal
- Admins see an **Admin Portal** link in the nav bar.
- The portal lists every user with their id and an Admin badge where it applies.
- Admins can delete other users' accounts, but not their own.

## API overview

All routes except signup and login require an `Authorization: Bearer <token>` header. In the browser they're called through the `/api` prefix.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/signup` | Create an account and return a token |
| POST | `/login` | Log in and return a token |
| GET | `/check_session` | Return the signed-in user |
| GET, POST | `/customers` | List customers (optional `?status=`) / create a customer |
| GET, PATCH | `/customers/<id>` | Get / update one customer |
| GET, POST | `/customers/<id>/events` | List / log events for a customer |
| GET, POST | `/customers/<id>/notes` | List / add notes for a customer |
| PATCH, DELETE | `/notes/<id>` | Edit / delete a note |
| GET, POST | `/customers/<id>/tasks` | List / add tasks for a customer |
| GET | `/tasks` | List tasks (filter with `?employee_id=` and `?status=`) |
| GET, PATCH, DELETE | `/tasks/<id>` | Get / edit / delete a task |
| GET | `/users` | List users |
| DELETE | `/users/<id>` | Delete a user (admin only) |

## Project structure

```
foundations/
├── client/                 React frontend
│   ├── src/
│   │   ├── components/     layout, auth, home, newCustomer, customer, shared, admin
│   │   ├── pages/          one component per route
│   │   ├── hooks/          shared form and list logic
│   │   ├── context/        auth state
│   │   ├── services/       apiFetch: the one place requests go to the API
│   │   ├── utils/          shared constants (statuses, interaction types)
│   │   └── styles/         CSS modules, mirroring components/
│   ├── tests/              Vitest suite
│   └── netlify.toml        build settings and the /api proxy
├── server/                 Flask backend
│   ├── api/                one blueprint per resource
│   ├── models.py           SQLAlchemy models and validations
│   ├── schema.py           Marshmallow schemas
│   ├── seed.py             sample data
│   ├── migrations/         Alembic migrations
│   └── tests/              pytest suite
├── Pipfile                 Python dependencies
└── render.yaml             backend deployment config
```
