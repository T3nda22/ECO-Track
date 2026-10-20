import os
import uuid
from functools import wraps
from flask import abort, flash, redirect, url_for, current_app
from flask_login import current_user
from werkzeug.utils import secure_filename
from app.models import db, ReportStatusHistory, Notification


def admin_required(f):
    """Restricts view to authenticated administrators only."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in as an Administrator to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        if not current_user.is_admin:
            flash('Access denied. Administrator privileges required.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function


def personnel_required(f):
    """Restricts view to authorized collection personnel only."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in as Collection Personnel to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        if not current_user.is_personnel:
            flash('Access denied. Collection personnel privileges required.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function


def resident_required(f):
    """Restricts view to registered residents only."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in as a Resident to access this page.', 'warning')
            return redirect(url_for('auth.login'))
        if not current_user.is_resident:
            flash('Access denied. Resident account required.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    """Validates permitted file extensions."""
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in current_app.config['ALLOWED_EXTENSIONS']


def save_uploaded_photo(file_storage, subfolder='reports'):
    """
    Safely saves an uploaded photo with a randomized unique filename.
    Returns the saved relative filename or None.
    """
    if not file_storage or not file_storage.filename:
        return None
        
    if not allowed_file(file_storage.filename):
        raise ValueError('Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP.')

    ext = file_storage.filename.rsplit('.', 1)[1].lower()
    safe_name = f"{uuid.uuid4().hex[:12]}_{secure_filename(file_storage.filename.rsplit('.', 1)[0])[:20]}.{ext}"
    
    target_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(target_dir, exist_ok=True)
    
    file_path = os.path.join(target_dir, safe_name)
    file_storage.save(file_path)
    
    return safe_name


def record_status_change(report, new_status, updated_by_user_id, note=None):
    """
    Maintains strict audit history of every status transition.
    """
    prev_status = report.current_status
    report.current_status = new_status
    
    history_entry = ReportStatusHistory(
        report_id=report.id,
        previous_status=prev_status,
        new_status=new_status,
        updated_by_user_id=updated_by_user_id,
        note=note
    )
    db.session.add(history_entry)
    return history_entry


def notify_user(recipient_id, title, message, report_id=None):
    """
    Creates an in-app notification record for a specific user.
    """
    notif = Notification(
        recipient_user_id=recipient_id,
        related_report_id=report_id,
        title=title,
        notification_message=message
    )
    db.session.add(notif)
    return notif
