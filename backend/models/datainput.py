# backend/models/datainput.py
from extensions import db
from datetime import datetime
import json

class DataInput(db.Model):
    __tablename__ = 'data_inputs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(150), nullable=True)
    raw = db.Column(db.Text, nullable=False)
    parsed = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            parsed = json.loads(self.parsed) if self.parsed else []
        except:
            parsed = []
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'parsed': parsed
        }
