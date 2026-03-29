from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import json
import os
import uuid
from datetime import datetime, timedelta

from sendgrid_env import load_sendgrid_env

load_sendgrid_env()

# Import auth after env file is merged (e.g. tests that import auth only)
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


def _ensure_empty_json_array(path):
    """Create path as [] if missing (deploy / fresh clone has no local DB files)."""
    if os.path.exists(path):
        return
    with open(path, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)


def ensure_runtime_data_files():
    """users.json and wines.json are gitignored; create empty stores on first run."""
    _ensure_empty_json_array(USERS_FILE)
    _ensure_empty_json_array(DB_FILE)


ensure_runtime_data_files()

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


def normalize_wine_attributes(wine_data):
    """
    Build a normalized attribute set from all wizard steps.
    These attributes are used for schema selection and optional module activation.
    """
    attrs = {}

    # Color-related attributes
    color_params = wine_data.get('color_params') or {}
    color_label = (
        wine_data.get('color')
        or color_params.get('color')
        or color_params.get('expected_style')
    )
    if color_label:
        attrs['color'] = color_label
    if color_params.get('style_color_out'):
        attrs['style_color_out'] = color_params.get('style_color_out')

    # Style (sweetness / alcohol) attributes
    style_params = wine_data.get('style_params') or {}
    style_label = wine_data.get('style') or style_params.get('style')
    if style_label:
        attrs['style'] = style_label
    if style_params.get('sweetnessCategory'):
        attrs['sweetness_category'] = style_params.get('sweetnessCategory')
    if style_params.get('alcoholCategory'):
        attrs['alcohol_category'] = style_params.get('alcoholCategory')

    # CO2 style attributes
    style_co2 = wine_data.get('style_co2')
    if isinstance(style_co2, dict):
        attrs['style_co2'] = (
            style_co2.get('CO2_label')
            or wine_data.get('style_co2')
        )
        if style_co2.get('CO2_level'):
            attrs['CO2_level'] = style_co2.get('CO2_level')
        if style_co2.get('method_CO2'):
            attrs['CO2_method'] = style_co2.get('method_CO2')
        if style_co2.get('packaging'):
            attrs['packaging_type'] = style_co2.get('packaging')
    elif style_co2:
        attrs['style_co2'] = style_co2

    # TA / acidity profile attributes
    raw_material = wine_data.get('raw_material') or {}
    ta_now = raw_material.get('TA_now')
    if ta_now is None:
        ta_now = raw_material.get('acidity')
    ta_target = raw_material.get('TA_target')
    ta_profile = None
    if ta_now is not None and ta_target is not None:
        delta = ta_target - ta_now
        if delta > 0.3:
            ta_profile = 'low'   # need to increase acidity
        elif delta < -0.3:
            ta_profile = 'high'  # need to decrease acidity
        else:
            ta_profile = 'normal'
    elif ta_now is not None:
        if ta_now > 7:
            ta_profile = 'high'
        elif ta_now < 4:
            ta_profile = 'low'
        else:
            ta_profile = 'normal'
    if ta_profile:
        attrs['TA_profile'] = ta_profile
    if raw_material.get('correction_mode'):
        attrs['correction_mode'] = raw_material.get('correction_mode')

    # Sensory profile tags (high-level)
    sensory = wine_data.get('style_sensory') or {}
    sensory_tags = []
    if sensory.get('oak', 0) >= 70:
        sensory_tags.append('high_oak')
    if sensory.get('tropical', 0) >= 70:
        sensory_tags.append('thiol_driven')
    if sensory.get('oxidation', 0) >= 70:
        sensory_tags.append('oxidative')
    if sensory_tags:
        attrs['sensory_profile_tags'] = sensory_tags

    # Technical profile tags (stability / risk)
    tech = wine_data.get('style_tech') or {}
    tech_tags = []
    if tech.get('proteinStab', 50) >= 80:
        tech_tags.append('needs_protein_stab')
    if tech.get('tartrateStab', 50) >= 80:
        tech_tags.append('needs_cold_stab')
    if tech.get('filtrationLevel', 50) >= 80:
        tech_tags.append('high_filtration')
    if tech.get('microRisk', 40) >= 70:
        tech_tags.append('high_micro_risk')
    if tech.get('vaRisk', 40) >= 70:
        tech_tags.append('high_va_risk')
    if tech_tags:
        attrs['tech_profile_tags'] = tech_tags

    # Explicit scheme type step (if present)
    if wine_data.get('scheme_type'):
        attrs['scheme_type'] = wine_data.get('scheme_type')

    return attrs


def schema_matches_attributes(schema, wine_data, attrs):
    """
    Determine if a schema matches given wine data and normalized attributes.

    It supports both legacy exact key matching (color, style, style_co2, scheme_type)
    and extended attributes (sweetness_category, CO2_level, etc.).
    """
    params = schema.get('parameters', {})
    if not params:
        return False

    for key, expected in params.items():
        if key in attrs:
            data_val = attrs.get(key)
        else:
            data_val = wine_data.get(key)
            if key == 'style_co2' and isinstance(data_val, dict):
                data_val = (
                    data_val.get('CO2_label')
                    or data_val.get('CO2_level')
                )
        if data_val != expected:
            return False

    return True

def find_schema_for_wine(wine_data):
    """Find the appropriate schema based on wine parameters"""
    schemas = load_schemas()
    attrs = normalize_wine_attributes(wine_data)
    
    for schema in schemas:
        if schema_matches_attributes(schema, wine_data, attrs):
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


def build_schema_graph(schema, blocks, wine_data):
    """
    Build an abstract graph representation of the technology scheme.

    Graph format:
      - nodes: { id, type, label, meta }
      - edges: { from, to, label, kind, side }
    """
    if not schema or not blocks:
        return {'nodes': [], 'edges': []}

    # Map id -> block and main sequence (exclude side branches)
    block_by_id = {b['id']: b for b in blocks if 'id' in b}
    main_blocks = [b for b in blocks if not b.get('is_side_branch')]

    nodes = []
    edges = []

    # Helper to resolve dynamic label from params_schema (if present)
    def resolve_block_label(block):
        params_schema = block.get('params_schema') or {}
        template = params_schema.get('name_template')
        if not template:
            return block.get('name', block.get('id'))

        context = {
            'style_tech': wine_data.get('style_tech') or {},
            'raw_material': wine_data.get('raw_material') or {},
            'style_params': wine_data.get('style_params') or {},
        }
        bindings = params_schema.get('bindings') or {}
        values = {}
        for key, path in bindings.items():
            parts = path.split('.')
            current = context.get(parts[0], {})
            for p in parts[1:]:
                if isinstance(current, dict):
                    current = current.get(p)
                else:
                    current = None
                    break
            if isinstance(current, (int, float)):
                values[key] = current
            elif current is not None:
                values[key] = current

        try:
            return template.format(**values)
        except Exception:
            return block.get('name', block.get('id'))

    # Create nodes for each process block
    for block in blocks:
        node_id = block.get('id')
        if not node_id:
            continue
        nodes.append({
            'id': node_id,
            'type': 'process',
            'label': resolve_block_label(block),
            'meta': {
                'is_side_branch': bool(block.get('is_side_branch')),
                'order': block.get('order')
            }
        })

    # Connect main flow sequentially
    for i in range(len(main_blocks) - 1):
        src = main_blocks[i]
        dst = main_blocks[i + 1]
        edges.append({
            'from': src['id'],
            'to': dst['id'],
            'label': src.get('arrow_out_label'),
            'kind': 'product',
            'side': 'main'
        })

    # Side branches (e.g., пресування з блоків м'язги)
    for block in blocks:
        if not block.get('is_side_branch'):
            continue
        side_id = block['id']
        from_id = block.get('connects_from')
        to_id = block.get('connects_to')
        if from_id and from_id in block_by_id:
            edges.append({
                'from': from_id,
                'to': side_id,
                'label': None,
                'kind': 'product',
                'side': 'side'
            })
        if to_id and to_id in block_by_id:
            edges.append({
                'from': side_id,
                'to': to_id,
                'label': None,
                'kind': 'product',
                'side': 'side'
            })

    return {'nodes': nodes, 'edges': edges}


def graph_to_mermaid(graph):
    """Convert graph representation to a simple mermaid flowchart."""
    nodes = graph.get('nodes') or []
    edges = graph.get('edges') or []

    lines = ["flowchart TD"]

    for node in nodes:
        node_id = node['id']
        label = node.get('label') or node_id
        safe_label = label.replace('"', "'")
        lines.append(f'  {node_id}["{safe_label}"]')

    for edge in edges:
        src = edge.get('from')
        dst = edge.get('to')
        if not src or not dst:
            continue
        label = edge.get('label')
        if label:
            safe_label = label.replace('"', "'")
            lines.append(f'  {src} -->|"{safe_label}"| {dst}')
        else:
            lines.append(f'  {src} --> {dst}')

    return "\n".join(lines)

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
    # Clear ALL wine data when starting new scheme
    session.pop('wine_data', None)
    session.pop('previous_wine_data', None)
    session.modified = True
    return render_template('steps/color.html')

@app.route('/style')
def style_page():
    """Style selection page - Стиль"""
    return render_template('steps/style.html')

@app.route('/style-co2')
def style_co2_page():
    """Style by CO2 page - Стиль за CO2"""
    return render_template('steps/style_co2.html')

@app.route('/raw-material')
def raw_material_page():
    """Raw material conditions page - Кондиції сировини (TA)"""
    return render_template('steps/raw_material.html')

@app.route('/style-sensory')
def style_sensory_page():
    """Sensory style page - Бажаний смаковий стиль"""
    return render_template('steps/style_sensory.html')

@app.route('/style-tech')
def style_tech_page():
    """Technical parameters page - Технічні параметри та стабільність"""
    return render_template('steps/style_tech.html')

@app.route('/scheme-type')
def scheme_type_page():
    """Scheme type page - Схема"""
    return render_template('steps/scheme_type.html')

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
        
        # Step "color" saves an object; store both color_params (for form) and color (string for schema/display)
        if step == 'color' and isinstance(choice, dict):
            session['wine_data']['color_params'] = choice
            session['wine_data']['color'] = choice.get('color') or choice.get('expected_style') or 'Біле'
            if 'previous_wine_data' not in session:
                session['previous_wine_data'] = {}
            session['previous_wine_data']['color_params'] = choice
            session['previous_wine_data']['color'] = session['wine_data']['color']
        # Step "style" can also save an object with additional parameters
        elif step == 'style' and isinstance(choice, dict):
            session['wine_data']['style_params'] = choice
            session['wine_data']['style'] = choice.get('style') or 'Сухе'
            if 'previous_wine_data' not in session:
                session['previous_wine_data'] = {}
            session['previous_wine_data']['style_params'] = choice
            session['previous_wine_data']['style'] = session['wine_data']['style']
        else:
            session['wine_data'][step] = choice
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
    # Return only what's in the current session
    # Do NOT auto-load from database - that should only happen when explicitly continuing
    wine_data = session.get('wine_data', {})
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
    # Flow: color -> style -> style_co2 -> raw_material (TA) -> style_sensory -> style_tech -> summary -> technology_scheme
    
    if 'color' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('color_page')})
    
    if 'style' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_page')})
    
    if 'style_co2' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_co2_page')})
    
    if 'raw_material' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('raw_material_page')})
    
    if 'style_sensory' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_sensory_page')})
    
    if 'style_tech' not in previous_data:
        return jsonify({'success': True, 'redirect': url_for('style_tech_page')})
    
    # All steps done, go to summary
    return jsonify({'success': True, 'redirect': url_for('summary_page')})

@app.route('/api/save-wine', methods=['POST'])
def save_wine():
    """API endpoint to save complete wine data"""
    data = request.json
    create_next = data.get('create_next', False)
    
    wine_data = session.get('wine_data', {})
    wine_id = wine_data.get('id')
    user_id = session.get('user', {}).get('id')
    
    # Keep status as 'in_progress' so user can continue editing
    if 'status' not in wine_data:
        wine_data['status'] = 'in_progress'
    
    # Load existing wines
    wines = load_wines()
    
    # Find if this wine already exists (by id and user_id)
    existing_wine_index = None
    for i, wine in enumerate(wines):
        if wine.get('id') == wine_id and wine.get('user_id') == user_id:
            existing_wine_index = i
            break
    
    # Update existing or add new
    if existing_wine_index is not None:
        wines[existing_wine_index] = wine_data.copy()
    else:
        wines.append(wine_data.copy())
    
    # Save to database
    save_wines(wines)
    
    # Store in previous_wine_data so it appears in dropdown
    session['previous_wine_data'] = wine_data.copy()
    
    # Only clear wine_data if not creating next (to start fresh)
    if not create_next:
        session.pop('wine_data', None)
    
    session.modified = True
    
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
    graph = build_schema_graph(schema, blocks, wine_data)
    mermaid = graph_to_mermaid(graph)
    
    return jsonify({
        'schema': schema,
        'blocks': blocks,
        'wine_data': wine_data,
        'graph': graph,
        'mermaid': mermaid
    })

@app.route('/api/technology-steps', methods=['GET'])
@login_required
def get_technology_steps_api():
    """API endpoint: traverse the winemaking decision tree for current wine."""
    from scheme_engine import get_technology_steps

    wine_data = session.get('wine_data', {})
    if not wine_data:
        return jsonify({'error': 'No wine data in session'}), 404

    color_params = wine_data.get('color_params') or {}
    if isinstance(color_params, dict):
        if 'color' not in color_params:
            color_params['color'] = wine_data.get('color', 'Біле')
    else:
        color_params = {'color': wine_data.get('color', 'Біле')}

    raw_co2 = wine_data.get('style_co2') or {}
    if isinstance(raw_co2, dict):
        co2_level = raw_co2.get('CO2_level', raw_co2.get('co2Type', 'still'))
        method = raw_co2.get('method_CO2', raw_co2.get('sparklingMethod', ''))
        method_map = {
            'bottle': 'champenoise', 'tank': 'charmat',
            'petnat': 'petnat', 'natural': 'petnat',
            'carbonation': 'charmat',
        }
        engine_co2 = {
            'co2Type': co2_level,
            'sparklingMethod': method_map.get(method, method),
        }
    else:
        engine_co2 = {'co2Type': 'still'}

    engine_input = {
        'color': color_params,
        'style_params': wine_data.get('style_params', {}),
        'style_co2': engine_co2,
        'style_sensory': wine_data.get('style_sensory', {}),
        'style_tech': wine_data.get('style_tech', {}),
        'raw_material': wine_data.get('raw_material', {}),
    }

    steps = get_technology_steps(engine_input)

    return jsonify({'steps': steps, 'wine_data': wine_data})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
