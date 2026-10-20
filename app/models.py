from datetime import datetime
import secrets
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """
    User model supporting the 3 distinct roles:
    1. 'resident' - Residents submitting and tracking waste reports
    2. 'admin' - Administrators managing reports, schedules, personnel, and task completion
    3. 'personnel' - Garbage collection personnel accepting, handling, and collecting waste tasks
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='resident')  # resident, admin, personnel
    phone_number = db.Column(db.String(20), nullable=True)
    account_status = db.Column(db.String(20), nullable=False, default='active')  # active, suspended, pending
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    reports = db.relationship('WasteReport', back_populates='resident', cascade='all, delete-orphan', foreign_keys='WasteReport.resident_id')
    assigned_tasks = db.relationship('TaskAssignment', back_populates='personnel', foreign_keys='TaskAssignment.assigned_personnel_id')
    administered_tasks = db.relationship('TaskAssignment', back_populates='admin', foreign_keys='TaskAssignment.administrator_id')
    status_updates = db.relationship('ReportStatusHistory', back_populates='updated_by', foreign_keys='ReportStatusHistory.updated_by_user_id')
    notifications = db.relationship('Notification', back_populates='recipient', cascade='all, delete-orphan', foreign_keys='Notification.recipient_user_id')
    schedules_created = db.relationship('CollectionSchedule', back_populates='created_by', foreign_keys='CollectionSchedule.created_by_user_id')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_personnel(self):
        return self.role == 'personnel'

    @property
    def is_resident(self):
        return self.role == 'resident'

    def get_role_badge(self):
        badges = {
            'admin': 'bg-danger',
            'personnel': 'bg-warning text-dark',
            'resident': 'bg-success'
        }
        return badges.get(self.role, 'bg-secondary')

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class WasteReport(db.Model):
    """
    Waste Report model containing spatial coordinates, status, resident reference,
    and photo references. Must be strictly located in Poblacion, Minglanilla.
    """
    __tablename__ = 'waste_reports'

    id = db.Column(db.Integer, primary_key=True)
    tracking_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    waste_category = db.Column(db.String(50), nullable=False)  # Overflowing Bin, Full Garbage Bin, Scattered Waste, etc.
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_description = db.Column(db.String(255), nullable=False)
    photo_reference = db.Column(db.String(255), nullable=True)
    
    # Status Workflow: Pending -> Verified -> Assigned -> In Progress -> Collected -> Completed (or Rejected)
    current_status = db.Column(db.String(30), nullable=False, default='Pending', index=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    submission_timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_updated_timestamp = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resident = db.relationship('User', back_populates='reports', foreign_keys=[resident_id])
    task_assignment = db.relationship('TaskAssignment', back_populates='report', uselist=False, cascade='all, delete-orphan')
    status_history = db.relationship('ReportStatusHistory', back_populates='report', cascade='all, delete-orphan', order_by='ReportStatusHistory.timestamp.asc()')
    notifications = db.relationship('Notification', back_populates='report', cascade='all, delete-orphan')

    @staticmethod
    def generate_tracking_code():
        """Generates a professional academic tracking code: ECO-2026-XXXX"""
        suffix = secrets.token_hex(2).upper()
        return f"ECO-2026-{suffix}"

    def get_status_badge(self):
        badges = {
            'Pending': 'badge-status-pending',
            'Verified': 'badge-status-verified',
            'Assigned': 'badge-status-assigned',
            'In Progress': 'badge-status-inprogress',
            'Collected': 'badge-status-collected',
            'Completed': 'badge-status-completed',
            'Rejected': 'badge-status-rejected'
        }
        return badges.get(self.current_status, 'badge-status-pending')

    def get_status_color(self):
        colors = {
            'Pending': '#f59e0b',     # Amber
            'Verified': '#3b82f6',    # Blue
            'Assigned': '#6366f1',    # Indigo
            'In Progress': '#06b6d4', # Cyan
            'Collected': '#14b8a6',   # Teal
            'Completed': '#10b981',   # Forest Green
            'Rejected': '#ef4444'     # Rose Red
        }
        return colors.get(self.current_status, '#64748b')

    def to_geojson_feature(self, public_view=False):
        """Converts report to GeoJSON feature for Leaflet consumption."""
        props = {
            'id': self.id,
            'tracking_code': self.tracking_code,
            'title': self.title,
            'category': self.waste_category,
            'status': self.current_status,
            'status_color': self.get_status_color(),
            'location_description': self.location_description,
            'submitted_at': self.submission_timestamp.strftime('%b %d, %Y %I:%M %p'),
            'photo_url': f"/static/uploads/reports/{self.photo_reference}" if self.photo_reference else None
        }
        if not public_view:
            props['resident_name'] = self.resident.full_name if self.resident else 'Unknown'
            if self.task_assignment and self.task_assignment.personnel:
                props['assigned_personnel'] = self.task_assignment.personnel.full_name
                props['priority'] = self.task_assignment.priority
        return {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [self.longitude, self.latitude]
            },
            'properties': props
        }

    def __repr__(self):
        return f"<WasteReport {self.tracking_code} - {self.current_status}>"


class TaskAssignment(db.Model):
    """
    Task Assignment model linking a verified WasteReport to a Garbage Collection Personnel.
    """
    __tablename__ = 'task_assignments'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('waste_reports.id'), unique=True, nullable=False, index=True)
    assigned_personnel_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    administrator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    priority = db.Column(db.String(20), default='Normal')  # Normal, High, Urgent
    assignment_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    task_status = db.Column(db.String(30), default='Assigned')  # Assigned, In Progress, Collected, Completed
    collection_notes = db.Column(db.Text, nullable=True)
    collection_proof_photo_reference = db.Column(db.String(255), nullable=True)
    collection_timestamp = db.Column(db.DateTime, nullable=True)

    # Relationships
    report = db.relationship('WasteReport', back_populates='task_assignment', foreign_keys=[report_id])
    personnel = db.relationship('User', back_populates='assigned_tasks', foreign_keys=[assigned_personnel_id])
    admin = db.relationship('User', back_populates='administered_tasks', foreign_keys=[administrator_id])

    def get_priority_badge(self):
        badges = {
            'Normal': 'bg-info text-dark',
            'High': 'bg-warning text-dark',
            'Urgent': 'bg-danger'
        }
        return badges.get(self.priority, 'bg-secondary')

    def __repr__(self):
        return f"<TaskAssignment Report:{self.report_id} Personnel:{self.assigned_personnel_id} Status:{self.task_status}>"


class ReportStatusHistory(db.Model):
    """
    Audit trail table recording all status changes, who made them, notes, and exact timestamp.
    """
    __tablename__ = 'report_status_history'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('waste_reports.id'), nullable=False, index=True)
    previous_status = db.Column(db.String(30), nullable=False)
    new_status = db.Column(db.String(30), nullable=False)
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.Text, nullable=True)

    # Relationships
    report = db.relationship('WasteReport', back_populates='status_history', foreign_keys=[report_id])
    updated_by = db.relationship('User', back_populates='status_updates', foreign_keys=[updated_by_user_id])

    def __repr__(self):
        return f"<StatusHistory Report:{self.report_id} {self.previous_status} -> {self.new_status}>"


class CollectionSchedule(db.Model):
    """
    Garbage collection schedules for the Poblacion, Minglanilla service area and its local zones/wards.
    """
    __tablename__ = 'collection_schedules'

    id = db.Column(db.Integer, primary_key=True)
    service_area = db.Column(db.String(120), nullable=False)  # e.g., Poblacion Ward 1 (Coastal & Caballero)
    collection_day = db.Column(db.String(40), nullable=False)  # e.g., Every Monday & Thursday
    collection_time = db.Column(db.String(50), nullable=False)  # e.g., 6:00 AM - 9:00 AM
    waste_type = db.Column(db.String(60), default='Biodegradable & Residual')
    schedule_notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = db.relationship('User', back_populates='schedules_created', foreign_keys=[created_by_user_id])

    def __repr__(self):
        return f"<CollectionSchedule {self.service_area} - {self.collection_day}>"


class Notification(db.Model):
    """
    In-app user notifications for reports verification, assignment, collection, and completion.
    """
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    related_report_id = db.Column(db.Integer, db.ForeignKey('waste_reports.id'), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    notification_message = db.Column(db.Text, nullable=False)
    read_status = db.Column(db.Boolean, default=False)
    created_timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    recipient = db.relationship('User', back_populates='notifications', foreign_keys=[recipient_user_id])
    report = db.relationship('WasteReport', back_populates='notifications', foreign_keys=[related_report_id])

    def __repr__(self):
        return f"<Notification User:{self.recipient_user_id} Title:{self.title}>"
