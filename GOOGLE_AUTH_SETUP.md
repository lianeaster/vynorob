# Google OAuth Setup Guide

## Overview

The application now supports Google OAuth authentication for user login.

## Features

- ✅ Sign in with Google account
- ✅ User profile with avatar
- ✅ Persistent sessions
- ✅ User database (JSON)
- ✅ Login/Logout functionality
- ✅ Optional authentication (works without OAuth configured)

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"

### 2. Enable Required APIs

1. Go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google+ API** (or **People API**)

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select application type: **Web application**
4. Configure:
   - **Name**: Vynorob App
   - **Authorized JavaScript origins**: 
     - `http://localhost:5000`
     - `http://127.0.0.1:5000`
   - **Authorized redirect URIs**:
     - `http://localhost:5000/authorize`
     - `http://127.0.0.1:5000/authorize`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

#### Option A: Using .env file (Development)

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
nano .env
```

Add your credentials:
```
SECRET_KEY=your-random-secret-key-change-this-in-production
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Option B: Export in terminal (Quick test)

```bash
export SECRET_KEY="your-random-secret-key"
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
```

#### Option C: Production (Server)

Add to your server environment configuration (e.g., systemd, docker-compose, etc.)

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

New dependencies added:
- `authlib==1.3.0` - OAuth library
- `requests==2.31.0` - HTTP library

### 6. Run the Application

```bash
python3 app.py
```

The application will start on `http://localhost:5000`

## Testing Authentication

### 1. Without OAuth Configured

If environment variables are not set:
- App works normally
- Login page shows setup instructions
- No authentication required

### 2. With OAuth Configured

If environment variables are set:
- "Увійти" (Login) button appears in top-right
- Click to sign in with Google
- User info and avatar shown after login
- "Вийти" (Logout) button to sign out

## User Database

Users are stored in `data/users.json`:

```json
[
  {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://...",
    "created_at": "2026-02-13T...",
    "last_login": "2026-02-13T..."
  }
]
```

## Routes

### Authentication Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/login` | GET | Login page or redirect to Google OAuth |
| `/authorize` | GET | OAuth callback endpoint |
| `/logout` | GET | Logout and clear session |

### Protected Routes (Optional)

To protect a route, add the `@login_required` decorator:

```python
@app.route('/protected')
@login_required
def protected_route():
    user = session['user']
    return f"Hello {user['name']}!"
```

## Session Data

After successful login, `session['user']` contains:

```python
{
    'id': 'uuid',
    'email': 'user@example.com',
    'name': 'User Name',
    'picture': 'https://...'
}
```

## Templates

### Checking if User is Logged In

```jinja2
{% if session.get('user') %}
    <p>Welcome, {{ session['user']['name'] }}!</p>
{% else %}
    <a href="{{ url_for('login') }}">Login</a>
{% endif %}
```

### User Avatar

```jinja2
{% if session['user'].get('picture') %}
    <img src="{{ session['user']['picture'] }}" alt="{{ session['user']['name'] }}">
{% endif %}
```

## Security Notes

### Production Deployment

1. **Change SECRET_KEY**:
   ```python
   import secrets
   secrets.token_hex(32)  # Generate a new key
   ```

2. **Use HTTPS**:
   - Update OAuth redirect URI to use `https://`
   - Configure SSL certificate

3. **Update Authorized Origins**:
   - Add your production domain
   - Remove localhost URLs

4. **Environment Variables**:
   - Never commit `.env` file
   - Use secure environment variable management
   - Rotate secrets regularly

### .gitignore

Make sure `.env` is in `.gitignore`:
```
.env
*.pyc
__pycache__/
data/*.json
```

## Troubleshooting

### Error: "OAuth not configured"

**Cause**: Environment variables not set

**Solution**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Error: "redirect_uri_mismatch"

**Cause**: Redirect URI doesn't match Google Cloud Console configuration

**Solution**: 
1. Check the error message for the actual redirect URI
2. Add it to "Authorized redirect URIs" in Google Cloud Console
3. Make sure it includes `/authorize` path

### Error: "Access blocked: This app's request is invalid"

**Cause**: OAuth consent screen not configured

**Solution**:
1. Go to "APIs & Services" → "OAuth consent screen"
2. Configure the consent screen
3. Add test users if in "Testing" mode

### Users not persisting

**Cause**: `data/users.json` not writable

**Solution**: Check file permissions:
```bash
chmod 644 data/users.json
```

## Optional: Protecting All Routes

To require login for the entire app:

```python
@app.before_request
def require_login():
    # Allow certain routes without login
    allowed = ['login', 'authorize', 'static']
    if request.endpoint not in allowed and 'user' not in session:
        return redirect(url_for('login'))
```

## Testing Without Google Account

For development/testing without Google OAuth:

1. Manually add user to session:
```python
@app.route('/dev-login')
def dev_login():
    if app.debug:  # Only in debug mode
        session['user'] = {
            'id': 'dev-user',
            'email': 'dev@example.com',
            'name': 'Dev User',
            'picture': ''
        }
        return redirect(url_for('index'))
    return 'Not available', 404
```

## Files Modified

1. `app.py` - Added OAuth configuration and routes
2. `requirements.txt` - Added authlib and requests
3. `templates/base.html` - Added user menu
4. `templates/login.html` - Created login page
5. `.env.example` - Environment variables template
6. `data/users.json` - User database (auto-created)

## Summary

✅ **Google OAuth fully implemented**  
✅ **User authentication working**  
✅ **Profile with avatar**  
✅ **Works with or without OAuth**  
✅ **Secure session management**  
✅ **Easy to protect routes**  

Ready to use! 🎉
