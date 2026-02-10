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

def calculate_wine_conditions(raw_material, color, style):
    """Calculate wine conditions for white wine based on raw material"""
    sugar = raw_material.get('sugar', 0)
    acidity = raw_material.get('acidity', 0)
    ph = raw_material.get('ph', 0)
    
    # Calculate alcohol content from sugar
    # Formula: ~16.83 g/L sugar produces 1% alcohol
    # For dry wine, assume almost all sugar is converted
    if style == 'Сухе':
        residual_sugar = round(2.0, 1)  # Dry wine: < 4 g/L residual sugar
        alcohol = round((sugar - residual_sugar) / 16.83, 1)
    elif style == 'Напівсухе':
        residual_sugar = round(8.0, 1)  # Semi-dry: 4-12 g/L
        alcohol = round((sugar - residual_sugar) / 16.83, 1)
    elif style == 'Напівсолодке':
        residual_sugar = round(20.0, 1)  # Semi-sweet: 12-45 g/L
        alcohol = round((sugar - residual_sugar) / 16.83, 1)
    else:  # Солодке
        residual_sugar = round(50.0, 1)  # Sweet: > 45 g/L
        alcohol = round((sugar - residual_sugar) / 16.83, 1)
    
    # Acidity typically decreases slightly during fermentation
    wine_acidity = round(acidity * 0.9, 1)
    
    # pH is disabled
    wine_ph = 0
    
    return {
        'sugar': residual_sugar,
        'acidity': wine_acidity,
        'ph': wine_ph,
        'alcohol': alcohol
    }

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
    # Calculate wine conditions for white wine automatically
    wine_data = session.get('wine_data', {})
    
    if wine_data.get('color') == 'Біле' and 'wine_conditions' not in wine_data:
        raw_material = wine_data.get('raw_material', {})
        style = wine_data.get('style', 'Сухе')
        
        # Calculate wine conditions
        wine_conditions = calculate_wine_conditions(raw_material, 'Біле', style)
        wine_data['wine_conditions'] = wine_conditions
        session['wine_data'] = wine_data
        session.modified = True
    
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

@app.route('/technology-scheme')
def technology_scheme_page():
    """Technology scheme visualization page - Принципова технологічна схема"""
    return render_template('technology_scheme.html')

@app.route('/api/save-choice', methods=['POST'])
def save_choice():
    """API endpoint to save user choice"""
    data = request.json
    step = data.get('step')
    choice = data.get('choice')
    
    # Server-side validation for raw material conditions
    if step == 'raw_material':
        sugar = choice.get('sugar', 0)
        acidity = choice.get('acidity', 0)
        
        # Validate sugar minimum (170 g/dm³ for dry wine production)
        if sugar < 170:
            return jsonify({
                'success': False,
                'error': 'Масова частка цукру повинна бути не менше 170 г/дм³'
            }), 400
        
        # Validate acidity range (4-12 g/dm³ recommended)
        if acidity < 4 or acidity > 12:
            print(f'Warning: Acidity {acidity} g/dm³ is outside recommended range (4-12 g/dm³)')
        
        # Validate acidity absolute minimum
        if acidity < 3:
            return jsonify({
                'success': False,
                'error': 'Масова частка кислоти повинна бути не менше 3 г/дм³'
            }), 400
    
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
