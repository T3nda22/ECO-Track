from flask import Blueprint, render_template
from app.models import WasteReport
from app.utils.geo import POBLACION_LANDMARKS

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Landing page with live GIS map and summary of Outstanding vs. Addressed waste concerns."""
    reports = WasteReport.query.order_by(WasteReport.submission_timestamp.desc()).limit(30).all()

    total_reports = WasteReport.query.count()
    outstanding_reports = WasteReport.query.filter_by(current_status='Pending').count()
    addressed_reports = WasteReport.query.filter(
        WasteReport.current_status.in_(['Collected', 'Cleaned'])
    ).count()

    return render_template(
        'shared/landing.html',
        reports=reports,
        total_reports=total_reports,
        outstanding_reports=outstanding_reports,
        addressed_reports=addressed_reports,
        landmarks=POBLACION_LANDMARKS
    )


@main_bp.route('/about')
def about():
    """Project background, RRL synthesis, and scope & limitations based on Deliverables 1 and 2."""
    return render_template('shared/about.html', landmarks=POBLACION_LANDMARKS)
