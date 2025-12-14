# backend/models/dashboard.py
from extensions import db
from datetime import datetime

class Dashboard(db.Model):
    __tablename__ = 'dashboards'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default='')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    charts = db.relationship(
        'Chart',
        backref='dashboard',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
