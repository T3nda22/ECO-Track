from flask import Blueprint, jsonify, request
from flask_login import current_user
from app.models import WasteReport, TaskAssignment, Notification
from app.utils.geo import get_poblacion_geojson, is_point_in_poblacion, validate_coordinates

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/boundary')
def service_boundary():
    """Returns the verified/approximate GeoJSON boundary for Poblacion, Minglanilla, Cebu."""
    return jsonify(get_poblacion_geojson())


@api_bp.route('/validate-coords', methods=['GET', 'POST'])
def validate_coords():
    """
    Validates coordinates against the Poblacion service boundary in real-time.
    Supports both query parameters (?lat=...&lng=...) and JSON body.
    """
    if request.method == 'POST' and request.is_json:
        data = request.get_json() or {}
        lat = data.get('lat')
        lng = data.get('lng')
    else:
        lat = request.args.get('lat')
        lng = request.args.get('lng')

    is_valid, error_msg = validate_coordinates(lat, lng)
    
    return jsonify({
        'valid': is_valid,
        'inside_poblacion': is_valid,
        'message': error_msg if not is_valid else 'Coordinates are within authorized Poblacion, Minglanilla service area.'
    })


@api_bp.route('/reports-geojson')
def reports_geojson():
    """
    Returns GeoJSON points for Leaflet map markers according to current user's role.
    Ensures privacy by concealing resident personal details on public views.
    """
    status_filter = request.args.get('status')
    category_filter = request.args.get('category')

    query = WasteReport.query

    # Role-based visibility scoping
    if current_user.is_authenticated:
        if current_user.is_admin:
            # Admins see all reports
            pass
        elif current_user.is_personnel:
            # Personnel see their assigned tasks
            query = query.join(TaskAssignment).filter(TaskAssignment.assigned_personnel_id == current_user.id)
        elif current_user.is_resident:
            # Residents see public reports, but full details only on their own
            query = query.filter(WasteReport.current_status != 'Rejected')
    else:
        # Unauthenticated public users see only active/completed reports
        query = query.filter(WasteReport.current_status.in_(['Pending', 'Verified', 'Assigned', 'In Progress', 'Collected', 'Completed']))

    if status_filter and status_filter != 'all':
        query = query.filter(WasteReport.current_status == status_filter)
    if category_filter and category_filter != 'all':
        query = query.filter(WasteReport.waste_category == category_filter)

    reports = query.all()
    
    # Render features
    is_admin = current_user.is_authenticated and current_user.is_admin
    features = [r.to_geojson_feature(public_view=not is_admin) for r in reports]

    return jsonify({
        'type': 'FeatureCollection',
        'features': features
    })


@api_bp.route('/notifications/unread-count')
def unread_notifications_count():
    """Returns number of unread notifications for navbar pill."""
    if not current_user.is_authenticated:
        return jsonify({'count': 0})
    count = Notification.query.filter_by(
        recipient_user_id=current_user.id,
        read_status=False
    ).count()
    return jsonify({'count': count})
