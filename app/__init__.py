import os
from flask import Flask
from flask_login import LoginManager, current_user
from flask_wtf.csrf import CSRFProtect
from app.models import db, User, Notification
from config import config_by_name

login_manager = LoginManager()
csrf = CSRFProtect()


def create_app(config_name=None):
    """Application factory for ECO TRACK Waste Management System."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Ensure upload folders exist
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'reports'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'proofs'), exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register Blueprints
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    from app.routes.resident import resident_bp
    from app.routes.admin import admin_bp
    from app.routes.personnel import personnel_bp
    from app.routes.api import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(resident_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(personnel_bp)
    app.register_blueprint(api_bp)

    # Global Context Processors
    @app.context_processor
    def inject_global_context():
        unread_count = 0
        if current_user.is_authenticated:
            unread_count = Notification.query.filter_by(
                recipient_user_id=current_user.id,
                read_status=False
            ).count()
        return {
            'app_title': 'ECO TRACK',
            'app_subtitle': 'GIS-Based Waste Management System',
            'service_area_label': 'Poblacion, Minglanilla, Cebu',
            'unread_notifications_count': unread_count
        }

    # Custom Jinja Filters
    @app.template_filter('format_datetime')
    def format_datetime(value, format_str='%b %d, %Y %I:%M %p'):
        if value is None:
            return ''
        return value.strftime(format_str)

    @app.template_filter('format_date')
    def format_date(value, format_str='%b %d, %Y'):
        if value is None:
            return ''
        return value.strftime(format_str)

    @app.template_filter('status_badge_class')
    def status_badge_class(status):
        mapping = {
            'Pending': 'badge-status-pending',
            'Verified': 'badge-status-verified',
            'Assigned': 'badge-status-assigned',
            'In Progress': 'badge-status-inprogress',
            'Collected': 'badge-status-collected',
            'Completed': 'badge-status-completed',
            'Rejected': 'badge-status-rejected'
        }
        return mapping.get(status, 'badge-status-pending')

    return app
