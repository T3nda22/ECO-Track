from datetime import datetime
import secrets
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """
    User model supporting the 3 stakeholder roles defined in the study:
    1. 'resident'  - Community Members / Residents who pinpoint and report full garbage bins
    2. 'personnel' - Waste Management / Garbage Collection Personnel who view markers on the GIS map
                     and mark reported bins as Cleaned or Collected
    3. 'admin'     - System Administrators / Authorized LGU Personnel who view markers on the GIS map
                     and monitor which concerns remain Outstanding vs. Addressed
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='resident')  # resident, personnel, admin
    phone_number = db.Column(db.String(20), nullable=True)
    account_status = db.Column(db.String(20), nullable=False, default='active')  # active, suspended
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    reports = db.relationship(
        'WasteReport',
        back_populates='resident',
        cascade='all, delete-orphan',
        foreign_keys='WasteReport.resident_id'
    )
    resolved_reports = db.relationship(
        'WasteReport',
        back_populates='resolved_by',
        foreign_keys='WasteReport.resolved_by_user_id'
    )
    status_updates = db.relationship(
        'ReportStatusHistory',
        back_populates='updated_by',
        foreign_keys='ReportStatusHistory.updated_by_user_id'
    )
    notifications = db.relationship(
        'Notification',
        back_populates='recipient',
        cascade='all, delete-orphan',
        foreign_keys='Notification.recipient_user_id'
    )

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
    Waste Report model recording waste-related information as specified in the study scope:
    - Report location (GIS latitude/longitude coordinates and street/landmark description)
    - Photo of the reported garbage bin or waste concern
    - Time submitted (submission_timestamp)
    - Status:
        * 'Pending'   -> Outstanding concern (reported bin is full and in need of cleaning or collection)
        * 'Collected' -> Addressed concern (marked as collected by garbage collection personnel)
        * 'Cleaned'   -> Addressed concern (marked as cleaned by garbage collection personnel)
    """
    __tablename__ = 'waste_reports'

    id = db.Column(db.Integer, primary_key=True)
    tracking_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    waste_category = db.Column(db.String(50), nullable=False)  # Full Garbage Bin, Overflowing Bin, Uncollected Garbage, etc.
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_description = db.Column(db.String(255), nullable=False)
    photo_reference = db.Column(db.String(255), nullable=True)

    # Direct status workflow matching the research paper:
    # 'Pending' (Outstanding) -> 'Collected' or 'Cleaned' (Addressed)
    current_status = db.Column(db.String(30), nullable=False, default='Pending', index=True)

    # Personnel resolution details when marked as Cleaned or Collected
    resolved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    resolved_timestamp = db.Column(db.DateTime, nullable=True)
    collection_notes = db.Column(db.Text, nullable=True)
    collection_proof_photo = db.Column(db.String(255), nullable=True)

    submission_timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_updated_timestamp = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resident = db.relationship('User', back_populates='reports', foreign_keys=[resident_id])
    resolved_by = db.relationship('User', back_populates='resolved_reports', foreign_keys=[resolved_by_user_id])
    status_history = db.relationship(
        'ReportStatusHistory',
        back_populates='report',
        cascade='all, delete-orphan',
        order_by='ReportStatusHistory.timestamp.asc()'
    )
    notifications = db.relationship('Notification', back_populates='report', cascade='all, delete-orphan')

    @staticmethod
    def generate_tracking_code():
        """Generates a unique report tracking code: ECO-2026-XXXX"""
        suffix = secrets.token_hex(2).upper()
        return f"ECO-2026-{suffix}"

    @property
    def is_outstanding(self):
        """Returns True if the waste concern remains outstanding (Pending collection/cleaning)."""
        return self.current_status == 'Pending'

    @property
    def is_addressed(self):
        """Returns True if garbage collection personnel have marked the bin as Cleaned or Collected."""
        return self.current_status in ('Collected', 'Cleaned')

    @property
    def monitoring_state_label(self):
        """Returns 'Outstanding' or 'Addressed' for administrator monitoring."""
        return 'Outstanding' if self.is_outstanding else 'Addressed'

    def get_status_badge(self):
        badges = {
            'Pending': 'badge-status-pending',
            'Collected': 'badge-status-completed',
            'Cleaned': 'badge-status-collected'
        }
        return badges.get(self.current_status, 'badge-status-pending')

    def get_status_color(self):
        colors = {
            'Pending': '#f59e0b',    # Amber/Orange - Outstanding (Needs Collection/Cleaning)
            'Collected': '#10b981',  # Forest Green - Addressed (Collected)
            'Cleaned': '#0d9488'     # Teal Green   - Addressed (Cleaned)
        }
        return colors.get(self.current_status, '#f59e0b')

    def to_geojson_feature(self, public_view=False):
        """Converts report to GeoJSON feature for shared GIS map markers."""
        props = {
            'id': self.id,
            'tracking_code': self.tracking_code,
            'title': self.title,
            'description': self.description,
            'category': self.waste_category,
            'status': self.current_status,
            'monitoring_state': self.monitoring_state_label,
            'status_color': self.get_status_color(),
            'location_description': self.location_description,
            'submitted_at': self.submission_timestamp.strftime('%b %d, %Y %I:%M %p'),
            'photo_url': f"/static/uploads/reports/{self.photo_reference}" if self.photo_reference else None,
            'proof_photo_url': f"/static/uploads/proofs/{self.collection_proof_photo}" if self.collection_proof_photo else None,
            'resolved_at': self.resolved_timestamp.strftime('%b %d, %Y %I:%M %p') if self.resolved_timestamp else None,
            'collection_notes': self.collection_notes
        }
        if not public_view:
            props['resident_name'] = self.resident.full_name if self.resident else 'Resident'
            props['resolved_by_name'] = self.resolved_by.full_name if self.resolved_by else None
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


class ReportStatusHistory(db.Model):
    """
    Audit trail table recording all status updates (Submitted -> Cleaned / Collected),
    who made them, notes, and timestamp.
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


class Notification(db.Model):
    """
    In-app user notifications for new waste reports and status updates when bins are marked Cleaned or Collected.
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
