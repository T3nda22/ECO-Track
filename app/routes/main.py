from flask import Blueprint, render_template
from flask_login import current_user
from app.models import WasteReport, CollectionSchedule
from app.utils.geo import POBLACION_LANDMARKS, get_poblacion_geojson

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Landing page with live public map and project overview."""
    # Public reports summary (excludes rejected reports from public view)
    reports = WasteReport.query.filter(WasteReport.current_status != 'Rejected').order_by(
        WasteReport.submission_timestamp.desc()
    ).limit(30).all()
    
    # Public stats
    total_reports = WasteReport.query.count()
    completed_reports = WasteReport.query.filter_by(current_status='Completed').count()
    active_reports = WasteReport.query.filter(
        WasteReport.current_status.in_(['Pending', 'Verified', 'Assigned', 'In Progress', 'Collected'])
    ).count()

    schedules = CollectionSchedule.query.order_by(CollectionSchedule.service_area.asc()).all()
    
    return render_template(
        'shared/landing.html',
        reports=reports,
        total_reports=total_reports,
        completed_reports=completed_reports,
        active_reports=active_reports,
        schedules=schedules,
        landmarks=POBLACION_LANDMARKS
    )


@main_bp.route('/schedules')
def schedules():
    """Public garbage collection schedule directory for Poblacion, Minglanilla."""
    all_schedules = CollectionSchedule.query.order_by(CollectionSchedule.service_area.asc()).all()
    return render_template('shared/schedules.html', schedules=all_schedules)


@main_bp.route('/about')
def about():
    """Academic project overview and Poblacion service boundary details."""
    return render_template('shared/about.html', landmarks=POBLACION_LANDMARKS)
