from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import pandas as pd
import numpy as np
from io import StringIO
import json
from extensions import db, bcrypt

from flask_migrate import Migrate
import os


# ========================
# APP CONFIG
# ========================
app = Flask(__name__)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///smart_stats.db'
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "dev-secret")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# ========================
# INIT EXTENSIONS
# ========================
db.init_app(app)          # <-- important
migrate = Migrate(app, db)
bcrypt.init_app(app)


CORS(app, supports_credentials=True)
jwt = JWTManager(app)

# ========================
# IMPORT MODELS
# ========================
from models.signup import User
from models.dashboard import Dashboard
from models.charts import Chart
from models.login import LoginService
from models.datainput import DataInput



# ========================
# ========================
# AUTH ROUTES
# ========================

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    # Hash password using Bcrypt
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], email=data['email'], password=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    
    if user:
        try:
            # Verify password using Bcrypt
            if bcrypt.check_password_hash(user.password, password):
                LoginService.log_attempt(user.username, True)
                access_token = create_access_token(identity=str(user.id))

                return jsonify({
                    'token': access_token,
                    'user': {'id': user.id, 'username': user.username, 'email': user.email}
                }), 200
        except ValueError:
            # If password hash is invalid (legacy hash), fail login
            LoginService.log_attempt(user.username, False)
            return jsonify({'error': 'Invalid credentials'}), 401

    # Log failed attempt
    LoginService.log_attempt(username or 'unknown', False)
    return jsonify({'error': 'Invalid credentials'}), 401


# ========================
# DASHBOARD ROUTES
# ========================

@app.route('/api/dashboards', methods=['GET'])
@jwt_required()
def get_dashboards():
    user_id = get_jwt_identity()
    dashboards = Dashboard.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            'id': d.id,
            'name': d.name,
            'description': d.description,
            'chart_count': len(d.charts.all())  # <-- FIXED
        }
        for d in dashboards
    ]), 200



@app.route('/api/dashboards', methods=['POST'])
@jwt_required()
def create_dashboard():
    user_id = get_jwt_identity()
    data = request.get_json()

    if 'name' not in data:
        return jsonify({'error': 'Dashboard name is required'}), 400

    new_dashboard = Dashboard(
        name=data['name'],
        description=data.get('description', ''),
        user_id=user_id
    )

    db.session.add(new_dashboard)
    db.session.commit()

    return jsonify({
        'id': new_dashboard.id,
        'name': new_dashboard.name,
        'description': new_dashboard.description
    }), 201


@app.route('/api/dashboards/<int:dashboard_id>', methods=['DELETE'])
@jwt_required()
def delete_dashboard(dashboard_id):
    user_id = get_jwt_identity()

    dashboard = Dashboard.query.filter_by(id=dashboard_id, user_id=user_id).first()
    if not dashboard:
        return jsonify({'error': 'Dashboard not found'}), 404

    db.session.delete(dashboard)
    db.session.commit()

    return jsonify({'message': 'Dashboard deleted'}), 200

# ========================
# CHART ROUTES
# ========================

@app.route('/api/dashboards/<int:dashboard_id>/charts', methods=['GET'])
@jwt_required()
def get_charts(dashboard_id):
    user_id = get_jwt_identity()

    dashboard = Dashboard.query.filter_by(id=dashboard_id, user_id=user_id).first()
    if not dashboard:
        return jsonify({'error': 'Dashboard not found'}), 404

    return jsonify([
        {
            'id': c.id,
            'title': c.title,
            'chart_type': c.chart_type,
            'data': json.loads(c.data),
            'config': json.loads(c.config) if c.config else {}
        }
        for c in dashboard.charts
    ]), 200


@app.route('/api/dashboards/<int:dashboard_id>/charts', methods=['POST'])
@jwt_required()
def create_chart(dashboard_id):
    user_id = get_jwt_identity()

    dashboard = Dashboard.query.filter_by(id=dashboard_id, user_id=user_id).first()
    if not dashboard:
        return jsonify({'error': 'Dashboard not found'}), 404

    data = request.get_json()

    new_chart = Chart(
        title=data['title'],
        chart_type=data['chart_type'],
        data=json.dumps(data['data']),
        config=json.dumps(data.get('config', {})),
        dashboard_id=dashboard_id
    )

    db.session.add(new_chart)
    db.session.commit()

    return jsonify({'message': 'Chart created', 'id': new_chart.id}), 201


@app.route('/api/charts/<int:chart_id>', methods=['DELETE'])
@jwt_required()
def delete_chart(chart_id):
    user_id = get_jwt_identity()

    chart = Chart.query.join(Dashboard).filter(
        Chart.id == chart_id,
        Dashboard.user_id == user_id
    ).first()

    if not chart:
        return jsonify({'error': 'Chart not found'}), 404

    db.session.delete(chart)
    db.session.commit()

    return jsonify({'message': 'Chart deleted'}), 200

# ========================
# AI – CHART SUGGESTION ENGINE
# ========================

@app.route('/api/generate-chart', methods=['POST'])
@jwt_required()
def generate_chart():
    data = request.get_json()
    prompt = data.get('prompt', '')
    csv_data = data.get('csv_data')

    if csv_data:
        df = pd.read_csv(StringIO(csv_data))
        stats = analyze_data(df)
        suggestion = suggest_chart_from_data(df, prompt)
        return jsonify({'success': True, 'stats': stats, 'suggestion': suggestion})

    return jsonify(generate_from_prompt(prompt)), 200

# ========================
# DATA ANALYSIS FUNCTIONS
# ========================

def analyze_data(df):
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    stats = {
        'rows': len(df),
        'columns': len(df.columns),
        'column_names': df.columns.tolist(),
        'numeric_columns': numeric_cols,
        'summary': {}
    }

    for col in numeric_cols:
        stats['summary'][col] = {
            'mean': float(df[col].mean()),
            'median': float(df[col].median()),
            'std': float(df[col].std()),
            'min': float(df[col].min()),
            'max': float(df[col].max())
        }

    return stats


def suggest_chart_from_data(df, prompt):
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if 'trend' in prompt.lower():
        chart_type = 'line'
    elif len(numeric_cols) >= 2:
        chart_type = 'scatter'
    elif len(numeric_cols) == 1:
        chart_type = 'bar'
    else:
        chart_type = 'table'

    return {
        'chart_type': chart_type,
        'title': f"Analysis of {df.columns[0]}",
        'columns': df.columns.tolist(),
        'data': df.head(20).to_dict(orient='records')
    }


def generate_from_prompt(prompt):
    p = prompt.lower()
    if 'sales' in p:
        return generate_sales_data()
    if 'temperature' in p or 'weather' in p:
        return generate_temperature_data()
    if 'population' in p:
        return generate_population_data()
    return generate_generic_data()

def generate_sales_data():
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return {
        'chart_type': 'line',
        'title': 'Sales Data',
        'data': [{'name': m, 'value': np.random.randint(1000, 5000)} for m in months]
    }

def generate_temperature_data():
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return {
        'chart_type': 'line',
        'title': 'Weekly Temperature',
        'data': [{'name': d, 'value': np.random.randint(10, 35)} for d in days]
    }

def generate_population_data():
    countries = ['USA', 'India', 'China', 'Brazil', 'Russia']
    return {
        'chart_type': 'bar',
        'title': 'Population by Country',
        'data': [{'name': c, 'value': np.random.randint(100, 1500)} for c in countries]
    }

def generate_generic_data():
    items = ['A', 'B', 'C', 'D']
    return {
        'chart_type': 'bar',
        'title': 'General Data',
        'data': [{'name': x, 'value': np.random.randint(10, 100)} for x in items]
    }

# ========================
# RUN APP
# ========================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
