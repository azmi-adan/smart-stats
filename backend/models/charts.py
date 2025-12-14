# backend/models/charts.py
from extensions import db
from datetime import datetime
import json

class Chart(db.Model):
    __tablename__ = 'charts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    chart_type = db.Column(db.String(50), nullable=False)
    data = db.Column(db.Text, nullable=False)
    config = db.Column(db.Text, nullable=True)
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            parsed_data = json.loads(self.data)
        except:
            parsed_data = []

        try:
            parsed_config = json.loads(self.config) if self.config else {}
        except:
            parsed_config = {}

        return {
            'id': self.id,
            'title': self.title,
            'chart_type': self.chart_type,
            'data': parsed_data,
            'config': parsed_config,
            'dashboard_id': self.dashboard_id,
            'created_at': self.created_at.isoformat()
        }
