from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import json
import os
import uuid
from datetime import datetime, timedelta

# Import auth module
from auth import init_auth

app = Flask(__name__)
app.secret_key = 'winery-secret-key-2026'  # Change this in production

# Session configuration - 30 minutes timeout
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# Initialize authentication module
init_auth(app)

# Database file paths
DATA_DIR = 'data'
DB_FILE = os.path.join(DATA_DIR, 'wines.json')
BLOCKS_FILE = os.path.join(DATA_DIR, 'blocks.json')
SCHEMAS_FILE = os.path.join(DATA_DIR, 'schemas.json')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Session timeout check
@app.before_request
def check_session_timeout():
    """Check if session has expired due to inactivity"""
    # Skip session check for auth routes (login, signup, etc.)
    if request.endpoint and request.endpoint.startswith('auth.'):
        return
    
    # Skip for static files
    if request.endpoint == 'static':
        return
    
    # Check if user is logged in
    if 'user' in session:
        # Get last activity time
        last_activity = session.get('last_activity')
        
        if last_activity:
            # Convert string to datetime
            last_activity_time = datetime.fromisoformat(last_activity)
            # Check if session has expired (30 minutes of inactivity)
            if datetime.now() - last_activity_time > timedelta(minutes=30):
                # Session expired - clear session
                session.clear()
                
                # Check if this is an AJAX request
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
                    # Return JSON response for AJAX requests
                    return jsonify({
                        'error': 'Сесія завершилась',
                        'session_expired': True,
                        'redirect': url_for('auth.login', timeout='1')
                    }), 401
                else:
                    # Regular redirect for page requests
                    return redirect(url_for('auth.login', timeout='1'))
        
        # Update last activity time
        session['last_activity'] = datetime.now().isoformat()
        session.permanent = True
    elif request.endpoint and not request.endpoint.startswith('auth.'):
        # User not logged in but trying to access protected route
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
            return jsonify({
                'error': 'Необхідна авторизація',
                'session_expired': True,
                'redirect': url_for('auth.login')
            }), 401
        else:
            return redirect(url_for('auth.login'))

# Login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('auth.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

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

def load_blocks():
    """Load blocks from JSON database"""
    if os.path.exists(BLOCKS_FILE):
        with open(BLOCKS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def load_schemas():
    """Load schemas from JSON database"""
    if os.path.exists(SCHEMAS_FILE):
        with open(SCHEMAS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def find_schema_for_wine(wine_data):
    """Find the appropriate schema based on wine parameters"""
    schemas = load_schemas()
    
    for schema in schemas:
        params = schema.get('parameters', {})
        match = True
        
        # Check if all parameters match
        for key, value in params.items():
            if wine_data.get(key) != value:
                match = False
                break
        
        if match:
            return schema
    
    return None

def get_blocks_for_schema(schema):
    """Get the list of block objects for a given schema"""
    if not schema:
        return []
    
    all_blocks = load_blocks()
    block_ids = schema.get('blocks', [])
    
    # Create a dict for quick lookup
    blocks_dict = {block['id']: block for block in all_blocks}
    
    # Return blocks in the order specified by the schema
    schema_blocks = []
    for block_id in block_ids:
        if block_id in blocks_dict:
            schema_blocks.append(blocks_dict[block_id])
    
    return schema_blocks

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

# Authentication routes
@app.route('/')
def index():
    """Welcome page - redirect to login or welcome page"""
    if 'user' not in session:
        return redirect(url_for('auth.login'))
    return redirect(url_for('welcome_page'))

@app.route('/welcome')
@login_required
def welcome_page():
    """Welcome page after login - choose to create new or continue previous"""
    user_id = session.get('user', {}).get('id')
    in_progress_schemes = []
    
    # Load all in-progress wines for this user from database
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            wines = json.load(f)
        
        # Find all in-progress wines for this user
        user_wines = [w for w in wines if w.get('user_id') == user_id and w.get('status') == 'in_progress']
        # Sort by created_at (most recent first)
        user_wines.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        in_progress_schemes = user_wines
    
    has_previous = len(in_progress_schemes) > 0
    
    return render_template('welcome.html', 
                         has_previous_session=has_previous,
                         in_progress_schemes=in_progress_schemes)

@app.route('/color')
@login_required
def color_page():
    """Color selection page - Колір"""
    # Clear current wine_data when starting new scheme (but keep previous_wine_data)
    if 'wine_data' in session:
        session.pop('wine_data', None)
        session.modified = True
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

@app.route('/summary')
def summary_page():
    """Summary page - Підсумок"""
    return render_template('create_scheme.html')

@app.route('/technology-scheme')
def technology_scheme_page():
    """Technology scheme visualization page - Принципова технологічна схема"""
    return render_template('technology_scheme.html')

@app.route('/api/save-choice', methods=['POST'])
@login_required
def save_choice():
    """API endpoint to save user choice"""
    try:
        data = request.json
        step = data.get('step')
        choice = data.get('choice')
        
        print(f"[save_choice] Saving step: {step}, choice: {choice}")
        
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
        
        # Get current user
        user_id = session.get('user', {}).get('id')
        
        if 'wine_data' not in session:
            session['wine_data'] = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'created_at': datetime.now().isoformat(),
                'status': 'in_progress'
            }
        
        # Ensure wine_data has required fields
        if 'id' not in session['wine_data']:
            session['wine_data']['id'] = str(uuid.uuid4())
        if 'user_id' not in session['wine_data']:
            session['wine_data']['user_id'] = user_id
        if 'created_at' not in session['wine_data']:
            session['wine_data']['created_at'] = datetime.now().isoformat()
        if 'status' not in session['wine_data']:
            session['wine_data']['status'] = 'in_progress'
        
        session['wine_data'][step] = choice
        
        # Also save to previous_wine_data for "continue" functionality
        if 'previous_wine_data' not in session:
            session['previous_wine_data'] = {}
        session['previous_wine_data'][step] = choice
        
        # Save to database
        wines = []
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                wines = json.load(f)
        
        # Find if this wine already exists in database (by id and user_id)
        wine_id = session['wine_data']['id']
        existing_wine_index = None
        for i, wine in enumerate(wines):
            if wine.get('id') == wine_id and wine.get('user_id') == user_id:
                existing_wine_index = i
                break
        
        # Update existing or add new
        if existing_wine_index is not None:
            wines[existing_wine_index] = session['wine_data'].copy()
            print(f"[save_choice] Updated existing wine at index {existing_wine_index}")
        else:
            wines.append(session['wine_data'].copy())
            print(f"[save_choice] Added new wine")
        
        # Save to file
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(wines, f, ensure_ascii=False, indent=2)
        
        session.modified = True
        
        print(f"[save_choice] Successfully saved. Wine ID: {wine_id}")
        return jsonify({'success': True, 'session_data': session['wine_data']})
    
    except Exception as e:
        print(f"[save_choice] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Помилка сервера: {str(e)}'
        }), 500

@app.route('/api/get-session', methods=['GET'])
@login_required
def get_session():
    """API endpoint to get current session data"""
    # First check session
    wine_data = session.get('wine_data', {})
    
    # If no session data, try to load from database
    if not wine_data or len(wine_data.keys()) <= 3:  # Only has id, user_id, created_at
        user_id = session.get('user', {}).get('id')
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                wines = json.load(f)
            
            # Find the most recent in-progress wine for this user
            user_wines = [w for w in wines if w.get('user_id') == user_id and w.get('status') == 'in_progress']
            if user_wines:
                # Sort by created_at and get the most recent
                user_wines.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                wine_data = user_wines[0]
                session['wine_data'] = wine_data
                session.modified = True
    
    return jsonify(wine_data)

@app.route('/api/restore-session', methods=['POST'])
@login_required
def restore_session():
    """API endpoint to restore previous session and determine next step"""
    user_id = session.get('user', {}).get('id')
    data = request.json or {}
    scheme_id = data.get('scheme_id')
    
    previous_data = None
    
    # Load the specific scheme from database
    if scheme_id and os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            wines = json.load(f)
        
        # Find the specific wine by id and user_id
        for wine in wines:
            if wine.get('id') == scheme_id and wine.get('user_id') == user_id and wine.get('status') == 'in_progress':
                previous_data = wine
                break
    
    # Fallback: try to get from session
    if not previous_data:
        previous_data = session.get('previous_wine_data', {})
    
    # Fallback: get most recent from database
    if not previous_data and os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            wines = json.load(f)
        
        # Find the most recent in-progress wine for this user
        user_wines = [w for w in wines if w.get('user_id') == user_id and w.get('status') == 'in_progress']
        if user_wines:
            # Sort by created_at and get the most recent
            user_wines.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            previous_data = user_wines[0]
    
    if not previous_data:
        return jsonify({'success': False, 'redirect': url_for('color_page')})
    
    # Restore the wine_data from previous_wine_data
    session['wine_data'] = previous_data.copy()
    session['previous_wine_data'] = previous_data.copy()
    session.modified = True
    
    # Determine which page to redirect to based on the FIRST missing step
    # Flow: color -> style -> style_co2 -> raw_material -> choice -> scheme_type -> summary -> technology_scheme
    
    if 'color' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('color_page')})
    
    if 'style' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_page')})
    
    if 'style_co2' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_co2_page')})
    
    if 'raw_material' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('raw_material_page')})
    
    if 'choice_path' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('choice_page')})
    
    # If user chose 'scheme' path
    if previous_data.get('choice_path') == 'scheme':
        if 'scheme_type' not in previous_data:
            return jsonify({'success': True, 'redirect': url_for('scheme_type_page')})
        
        # All steps done, go to summary
        return jsonify({'success': True, 'redirect': url_for('summary_page')})
    
    # If user chose 'description' path (currently disabled, but handle it)
    if previous_data.get('choice_path') == 'description':
        return jsonify({'success': True, 'redirect': url_for('wine_description_page')})
    
    # Default: go to choice page
    return jsonify({'success': True, 'redirect': url_for('choice_page')})

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

@app.route('/api/blocks', methods=['GET'])
def get_blocks():
    """API endpoint to get all blocks"""
    blocks = load_blocks()
    return jsonify(blocks)

@app.route('/api/schemas', methods=['GET'])
def get_schemas():
    """API endpoint to get all schemas"""
    schemas = load_schemas()
    return jsonify(schemas)

@app.route('/api/schema-for-wine', methods=['GET'])
def get_schema_for_wine():
    """API endpoint to get schema for current wine in session"""
    wine_data = session.get('wine_data', {})
    
    if not wine_data:
        return jsonify({'error': 'No wine data in session'}), 404
    
    schema = find_schema_for_wine(wine_data)
    
    if not schema:
        return jsonify({'error': 'No matching schema found'}), 404
    
    blocks = get_blocks_for_schema(schema)
    
    return jsonify({
        'schema': schema,
        'blocks': blocks,
        'wine_data': wine_data
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
