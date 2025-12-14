# backend/models/login.py
from .signup import User
from extensions import bcrypt

class LoginService:
    @staticmethod
    def verify_password(hashed_password, password):
        # Use Bcrypt to check hashed password
        return bcrypt.check_password_hash(hashed_password, password)

    @staticmethod
    def log_attempt(username, success):
        # Log login attempts (console or DB)
        print(f"Login attempt for '{username}': {'Success' if success else 'Failed'}")
