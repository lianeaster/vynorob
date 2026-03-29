"""Load sendgrid.env (local file) into os.environ. Safe to call repeatedly."""
import os

_ROOT = os.path.dirname(os.path.abspath(__file__))


def load_sendgrid_env():
    """Merge project root sendgrid.env into the process environment."""
    path = os.path.join(_ROOT, 'sendgrid.env')
    if not os.path.isfile(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('export '):
                line = line[7:].strip()
            if '=' not in line:
                continue
            key, _, val = line.partition('=')
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            if key and key not in os.environ:
                os.environ[key] = val


def sendgrid_api_key():
    load_sendgrid_env()
    return (os.environ.get('SENDGRID_API_KEY') or '').strip()


def sender_email():
    load_sendgrid_env()
    v = os.environ.get('SENDER_EMAIL', 'noreply@vynorob.com')
    return (v or 'noreply@vynorob.com').strip()
