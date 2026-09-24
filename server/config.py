import os

from flask import Flask
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_restful import Api
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from flask_jwt_extended import JWTManager

app = Flask(__name__)
app.secret_key = b'5a8fa62544c4912f1ad02547b49d1d5c7b0a9d4b353cf1253f74294c1b777b52'
#Tests override this so they never touch the dev database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config["JWT_SECRET_KEY"] = b"771f1762607943b00d7111a488c20e2f15002f5fc054b071d6c2d6474d706205"
app.json.compact = False

metadata = MetaData(naming_convention={
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
})
db = SQLAlchemy(metadata=metadata)

db.init_app(app)
migrate = Migrate(app, db)

bcrypt = Bcrypt(app)

api = Api(app)

jwt = JWTManager(app)