from flask import Flask, render_template, request, jsonify, session
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = 'winery-secret-key-2026'  # Change this in production

# Database file path
DATA_DIR = 'data'
DB_FILE = os.path.join(DATA_DIR, 'wines.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def load_wines():
    """Load wines from JSON database"""
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_wines(wines):
    """Save wines to JSON database"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(wines, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    """Welcome page - Почати"""
    return render_template('index.html')

@app.route('/color')
def color_page():
    """Color selection page - Колір"""
    return render_template('color.html')

@app.route('/style')
def style_page():
    """Style selection page - Стиль"""
    return render_template('style.html')

@app.route('/style-co2')
def style_co2_page():
    """Style by CO2 page - Стиль за CO2"""
    return render_template('style_co2.html')

@app.route('/raw-material')
def raw_material_page():
    """Raw material conditions page - Кондиції сировини"""
    return render_template('raw_material.html')

@app.route('/wine-conditions')
def wine_conditions_page():
    """Wine conditions page - Кондиції вина"""
    return render_template('wine_conditions.html')

@app.route('/choice')
def choice_page():
    """Choice page - Опис вина or Схема"""
    return render_template('choice.html')

@app.route('/wine-description')
def wine_description_page():
    """Wine description page - Опис вина"""
    return render_template('wine_description.html')

@app.route('/scheme-type')
def scheme_type_page():
    """Scheme type page - Схема"""
    return render_template('scheme_type.html')

@app.route('/create-scheme')
def create_scheme_page():
    """Create scheme page - Створити схему"""
    return render_template('create_scheme.html')

@app.route('/api/save-choice', methods=['POST'])
def save_choice():
    """API endpoint to save user choice"""
    data = request.json
    step = data.get('step')
    choice = data.get('choice')
    
    if 'wine_data' not in session:
        session['wine_data'] = {
            'id': str(uuid.uuid4()),
            'created_at': datetime.now().isoformat()
        }
    
    session['wine_data'][step] = choice
    session.modified = True
    
    return jsonify({'success': True, 'session_data': session['wine_data']})

@app.route('/api/get-session', methods=['GET'])
def get_session():
    """API endpoint to get current session data"""
    return jsonify(session.get('wine_data', {}))

@app.route('/api/save-wine', methods=['POST'])
def save_wine():
    """API endpoint to save complete wine data"""
    data = request.json
    create_next = data.get('create_next', False)
    
    wine_data = session.get('wine_data', {})
    
    # Load existing wines
    wines = load_wines()
    
    # Add new wine
    wines.append(wine_data)
    
    # Save to database
    save_wines(wines)
    
    wine_id = wine_data.get('id')
    
    # Only clear session if not creating next
    if not create_next:
        session.pop('wine_data', None)
    
    return jsonify({'success': True, 'wine_id': wine_id, 'create_next': create_next})

@app.route('/api/wines', methods=['GET'])
def get_wines():
    """API endpoint to get all wines"""
    wines = load_wines()
    return jsonify(wines)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
