"""
Authentication module for Vynorob application.
Handles user registration, login, email verification, and password reset.
"""

from flask import Blueprint, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime
import uuid
import re
import json
import os

from sendgrid_env import load_sendgrid_env, sendgrid_api_key, sender_email

# Create blueprint
auth_bp = Blueprint('auth', __name__, template_folder='templates/auth')

USERS_FILE = os.path.join('data', 'users.json')

# Initialize serializer (will be set by init_auth)
serializer = None

def init_auth(app):
    """Initialize auth module with app config"""
    global serializer
    serializer = URLSafeTimedSerializer(app.secret_key)
    app.register_blueprint(auth_bp)

# ============================================================================
# User Database Functions
# ============================================================================

def load_users():
    """Load users from JSON database"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_users(users):
    """Save users to JSON database"""
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

# ============================================================================
# Password Validation
# ============================================================================

def validate_password(password):
    """
    Validate password meets requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one number
    """
    if len(password) < 8:
        return False, "Пароль повинен містити мінімум 8 символів"
    
    if not re.search(r'[A-Z]', password):
        return False, "Пароль повинен містити принаймні одну велику літеру"
    
    if not re.search(r'[a-z]', password):
        return False, "Пароль повинен містити принаймні одну малу літеру"
    
    if not re.search(r'\d', password):
        return False, "Пароль повинен містити принаймні одну цифру"
    
    return True, ""

# ============================================================================
# Email Verification Functions
# ============================================================================

def generate_verification_token(email):
    """Generate a secure verification token for email"""
    return serializer.dumps(email, salt='email-verification')

def verify_token(token, expiration=3600):
    """Verify the token and return the email. Token expires after 1 hour by default."""
    try:
        email = serializer.loads(token, salt='email-verification', max_age=expiration)
        return email
    except:
        return None

def _sendgrid_error_detail(exc):
    parts = [str(exc)]
    for attr in ('body', 'message'):
        chunk = getattr(exc, attr, None)
        if chunk is not None:
            if isinstance(chunk, bytes):
                chunk = chunk.decode('utf-8', errors='replace')
            parts.append(str(chunk))
    return ' | '.join(parts)


def send_verification_email(user_email, user_name):
    """Send verification email to user using SendGrid"""
    load_sendgrid_env()
    token = generate_verification_token(user_email)
    verification_url = url_for('auth.verify_email', token=token, _external=True)
    
    key = sendgrid_api_key()
    if not key:
        # Email not configured - print to console for testing
        print('\n' + '='*80)
        print('⚠️  SENDGRID NOT CONFIGURED - TESTING MODE')
        print('='*80)
        print(f'User: {user_name} ({user_email})')
        print(f'Verification URL:\n{verification_url}')
        print('='*80 + '\n')
        return True  # Return success for testing
    
    # Prepare HTML email (using emoji logo for email compatibility)
    html_content = f'''
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #faf5f0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #722f3e; font-size: 32px; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">🍷 Vynorob</h1>
                <p style="color: #6b4c5a; font-size: 14px; margin-top: 10px;">Система створення технологічних схем</p>
            </div>
            
            <h2 style="color: #3b1022; margin-bottom: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Вітаємо, {user_name}!</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Дякуємо за реєстрацію в Vynorob. Щоб завершити реєстрацію, будь ласка, підтвердіть вашу email адресу.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #722f3e 0%, #8b3a52 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    Підтвердити Email
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Або скопіюйте це посилання у браузер:
            </p>
            <p style="color: #8b3a52; font-size: 12px; word-break: break-all; background: #faf5f0; padding: 10px; border-radius: 5px; font-family: monospace;">
                {verification_url}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                Посилання дійсне протягом 1 години. Якщо ви не реєструвалися на Vynorob, просто проігноруйте цей лист.
            </p>
        </div>
    </body>
    </html>
    '''
    
    try:
        frm = sender_email()
        message = Mail(
            from_email=Email(frm),
            to_emails=To(user_email),
            subject='Підтвердження реєстрації - Vynorob',
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(key)
        response = sg.send(message)
        
        print(f'✓ Email sent to {user_email} - Status: {response.status_code}', flush=True)
        return True
    except Exception as e:
        print(f'✗ SendGrid verification email: {_sendgrid_error_detail(e)}', flush=True)
        return False

# ============================================================================
# Password Reset Functions
# ============================================================================

def generate_password_reset_token(email):
    """Generate a secure password reset token"""
    return serializer.dumps(email, salt='password-reset')

def verify_password_reset_token(token, expiration=3600):
    """Verify the password reset token and return the email. Token expires after 1 hour by default."""
    try:
        email = serializer.loads(token, salt='password-reset', max_age=expiration)
        return email
    except:
        return None

def send_password_reset_email(user_email, user_name):
    """Send password reset email to user using SendGrid"""
    load_sendgrid_env()
    token = generate_password_reset_token(user_email)
    reset_url = url_for('auth.reset_password', token=token, _external=True)
    
    key = sendgrid_api_key()
    if not key:
        # Email not configured - print to console for testing
        print('\n' + '='*80)
        print('⚠️  SENDGRID NOT CONFIGURED - TESTING MODE')
        print('='*80)
        print(f'User: {user_name} ({user_email})')
        print(f'Password Reset URL:\n{reset_url}')
        print('='*80 + '\n')
        return True  # Return success for testing
    
    # Prepare HTML email (using emoji logo for email compatibility)
    html_content = f'''
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #faf5f0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #722f3e; font-size: 32px; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">🍷 Vynorob</h1>
                <p style="color: #6b4c5a; font-size: 14px; margin-top: 10px;">Система створення технологічних схем</p>
            </div>
            
            <h2 style="color: #3b1022; margin-bottom: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Вітаємо, {user_name}!</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Ми отримали запит на відновлення пароля для вашого облікового запису. Якщо це були ви, натисніть кнопку нижче, щоб встановити новий пароль.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #722f3e 0%, #8b3a52 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    Встановити новий пароль
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Або скопіюйте це посилання у браузер:
            </p>
            <p style="color: #8b3a52; font-size: 12px; word-break: break-all; background: #faf5f0; padding: 10px; border-radius: 5px; font-family: monospace;">
                {reset_url}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                Посилання дійсне протягом 1 години. Якщо ви не запитували відновлення пароля, просто проігноруйте цей лист.
            </p>
        </div>
    </body>
    </html>
    '''
    
    try:
        frm = sender_email()
        message = Mail(
            from_email=Email(frm),
            to_emails=To(user_email),
            subject='Відновлення пароля - Vynorob',
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(key)
        response = sg.send(message)
        
        print(f'✓ Password reset email sent to {user_email} - Status: {response.status_code}', flush=True)
        return True
    except Exception as e:
        print(f'✗ SendGrid password reset: {_sendgrid_error_detail(e)}', flush=True)
        return False

# ============================================================================
# Routes
# ============================================================================

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page with email and password"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        
        # Basic email validation
        if not email or '@' not in email:
            return render_template('auth/login.html', error='Будь ласка, введіть коректну email адресу')
        
        if not password:
            return render_template('auth/login.html', error='Будь ласка, введіть пароль')
        
        # Check if user exists
        users = load_users()
        user = None
        for u in users:
            if u['email'] == email:
                user = u
                break
        
        if not user:
            return render_template('auth/login.html', error='Неправильний email або пароль')
        
        # Check password
        if not check_password_hash(user.get('password_hash', ''), password):
            return render_template('auth/login.html', error='Неправильний email або пароль')
        
        # Check email verification
        if not user.get('email_verified', False):
            return render_template('auth/login.html', error='Email не підтверджено. Будь ласка, перевірте свою пошту і підтвердіть реєстрацію.')
        
        # Update last login
        user['last_login'] = datetime.now().isoformat()
        save_users(users)
        
        # Store user in session
        session['user'] = {
            'id': user['id'],
            'email': user['email'],
            'name': user['name']
        }
        
        # Set session as permanent and track last activity
        session.permanent = True
        session['last_activity'] = datetime.now().isoformat()
        
        # Redirect to next page or welcome page
        next_page = request.args.get('next')
        return redirect(next_page if next_page else url_for('welcome_page'))
    
    return render_template('auth/login.html')

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    """Sign up page to create new account"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        name = request.form.get('name', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not email or '@' not in email:
            return render_template('auth/signup.html', error='Будь ласка, введіть коректну email адресу')
        
        if not name:
            return render_template('auth/signup.html', error='Будь ласка, введіть ваше ім\'я')
        
        if not password:
            return render_template('auth/signup.html', error='Будь ласка, введіть пароль')
        
        # Validate password requirements
        is_valid, error_message = validate_password(password)
        if not is_valid:
            return render_template('auth/signup.html', error=error_message)
        
        # Check password confirmation
        if password != confirm_password:
            return render_template('auth/signup.html', error='Паролі не співпадають')
        
        # Check if user already exists
        users = load_users()
        for u in users:
            if u['email'] == email:
                return render_template('auth/signup.html', error='Користувач з таким email вже існує. Будь ласка, увійдіть.')
        
        # Create new user
        new_user = {
            'id': str(uuid.uuid4()),
            'email': email,
            'name': name,
            'password_hash': generate_password_hash(password, method='pbkdf2:sha256'),
            'email_verified': False,
            'created_at': datetime.now().isoformat(),
            'last_login': datetime.now().isoformat()
        }
        users.append(new_user)
        save_users(users)
        
        # Generate verification token
        token = generate_verification_token(email)
        verification_url = url_for('auth.verify_email', token=token, _external=True)
        
        # Send verification email
        email_sent = send_verification_email(email, name)
        
        load_sendgrid_env()
        email_configured = bool(sendgrid_api_key())
        show_link = not email_configured or not email_sent

        if email_sent:
            return render_template('auth/verification_sent.html', 
                                 email=email, 
                                 name=name, 
                                 email_configured=email_configured,
                                 email_error=False,
                                 verification_url=verification_url if show_link else None)
        else:
            return render_template('auth/verification_sent.html', 
                                 email=email, 
                                 name=name, 
                                 email_error=True,
                                 email_configured=email_configured,
                                 verification_url=verification_url if show_link else None)
    
    return render_template('auth/signup.html')

@auth_bp.route('/logout')
def logout():
    """Logout and clear session"""
    session.pop('user', None)
    return redirect(url_for('auth.login'))

@auth_bp.route('/verify-email/<token>')
def verify_email(token):
    """Verify user email with token"""
    email = verify_token(token)
    
    if not email:
        return render_template('auth/verification_result.html', success=False, 
                             title='Помилка Підтвердження',
                             message='Посилання недійсне або застаріле. Будь ласка, зареєструйтесь знову.')
    
    # Find user and mark as verified
    users = load_users()
    user_found = False
    
    for user in users:
        if user['email'] == email:
            user['email_verified'] = True
            user_found = True
            break
    
    if user_found:
        save_users(users)
        return render_template('auth/verification_result.html', success=True, 
                             title='Email Підтверджено!',
                             message='Email успішно підтверджено! Тепер ви можете увійти.',
                             description='Ваш email успішно підтверджено. Тепер ви можете увійти в систему і почати створювати технологічні схеми для виноробства.')
    else:
        return render_template('auth/verification_result.html', success=False,
                             title='Помилка',
                             message='Користувача не знайдено.')

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Forgot password page - request password reset"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        
        # Basic email validation
        if not email or '@' not in email:
            return render_template('auth/forgot_password.html', error='Будь ласка, введіть коректну email адресу')
        
        # Check if user exists
        users = load_users()
        user = None
        for u in users:
            if u['email'] == email:
                user = u
                break
        
        # Always show success message to prevent email enumeration
        # But only send email if user exists
        if user:
            send_password_reset_email(user['email'], user['name'])
        
        return render_template('auth/forgot_password.html', 
                             success='Якщо обліковий запис з таким email існує, на нього буде відправлено посилання для відновлення пароля.')
    
    return render_template('auth/forgot_password.html')

@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Reset password page with token"""
    email = verify_password_reset_token(token)
    
    if not email:
        return render_template('auth/reset_password.html', error='Посилання недійсне або застаріле. Будь ласка, запросіть відновлення пароля знову.')
    
    if request.method == 'POST':
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validate password requirements
        is_valid, error_message = validate_password(password)
        if not is_valid:
            return render_template('auth/reset_password.html', error=error_message)
        
        # Check password confirmation
        if password != confirm_password:
            return render_template('auth/reset_password.html', error='Паролі не співпадають')
        
        # Find user and update password
        users = load_users()
        user_found = False
        
        for user in users:
            if user['email'] == email:
                user['password_hash'] = generate_password_hash(password, method='pbkdf2:sha256')
                # Mark email as verified since they accessed the reset link from their email
                user['email_verified'] = True
                user_found = True
                break
        
        if user_found:
            save_users(users)
            return render_template('auth/verification_result.html', success=True, 
                                 title='Пароль Змінено!',
                                 message='Пароль успішно змінено! Тепер ви можете увійти з новим паролем.')
        else:
            return render_template('auth/reset_password.html', error='Користувача не знайдено.')
    
    return render_template('auth/reset_password.html')

@auth_bp.route('/settings', methods=['GET'])
def user_settings():
    """User settings page - must be logged in"""
    if 'user' not in session:
        return redirect(url_for('auth.login'))
    
    return render_template('auth/user_settings.html')

@auth_bp.route('/settings/change-password', methods=['POST'])
def change_password():
    """Change user password - must be logged in"""
    if 'user' not in session:
        return redirect(url_for('auth.login'))
    
    current_password = request.form.get('current_password', '')
    new_password = request.form.get('password', '')
    confirm_password = request.form.get('confirm_password', '')
    
    # Validation
    if not current_password:
        return render_template('auth/user_settings.html', error='Будь ласка, введіть поточний пароль')
    
    if not new_password:
        return render_template('auth/user_settings.html', error='Будь ласка, введіть новий пароль')
    
    # Validate new password requirements
    is_valid, error_message = validate_password(new_password)
    if not is_valid:
        return render_template('auth/user_settings.html', error=error_message)
    
    # Check password confirmation
    if new_password != confirm_password:
        return render_template('auth/user_settings.html', error='Паролі не співпадають')
    
    # Get user from database
    users = load_users()
    user_email = session['user']['email']
    user = None
    user_index = -1
    
    for i, u in enumerate(users):
        if u['email'] == user_email:
            user = u
            user_index = i
            break
    
    if not user:
        return render_template('auth/user_settings.html', error='Користувача не знайдено')
    
    # Check current password
    if not check_password_hash(user.get('password_hash', ''), current_password):
        return render_template('auth/user_settings.html', error='Неправильний поточний пароль')
    
    # Update password
    users[user_index]['password_hash'] = generate_password_hash(new_password, method='pbkdf2:sha256')
    save_users(users)
    
    return render_template('auth/user_settings.html', success='Пароль успішно змінено!')
