from flask import Blueprint, jsonify, request
from flask_login import current_user
from app.models import WasteReport, Notification
from app.utils.geo import get_poblacion_geojson, validate_coordinates

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/boundary')
def service_boundary():
    """Returns the GeoJSON boundary for the Minglanilla Poblacion pilot area."""
    return jsonify(get_poblacion_geojson())


@api_bp.route('/validate-coords', methods=['GET', 'POST'])
def validate_coords():
    """
    Validates coordinates against the Minglanilla Poblacion service boundary in real-time.
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
        'message': error_msg if not is_valid else 'Coordinates are within the Minglanilla Poblacion pilot area.'
    })


@api_bp.route('/reports-geojson')
def reports_geojson():
    """
    Returns GeoJSON points for Leaflet GIS map markers.
    As specified in the research scope and synthesis:
    System administrators and garbage collection personnel view the submitted reports
    as markers on the same GIS-based map.
    """
    status_filter = request.args.get('status')
    category_filter = request.args.get('category')

    query = WasteReport.query

    if status_filter and status_filter != 'all':
        if status_filter in ('Outstanding', 'outstanding', 'Pending'):
            query = query.filter(WasteReport.current_status == 'Pending')
        elif status_filter in ('Addressed', 'addressed'):
            query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))
        else:
            query = query.filter(WasteReport.current_status == status_filter)

    if category_filter and category_filter != 'all':
        query = query.filter(WasteReport.waste_category == category_filter)

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()

    # Administrators and Garbage Collection Personnel view full operational marker details
    is_staff = current_user.is_authenticated and (current_user.is_admin or current_user.is_personnel)
    features = [r.to_geojson_feature(public_view=not is_staff) for r in reports]

    return jsonify({
        'type': 'FeatureCollection',
        'features': features
    })


@api_bp.route('/notifications/unread-count')
def unread_notifications_count():
    """Returns number of unread notifications for navbar badge."""
    if not current_user.is_authenticated:
        return jsonify({'count': 0})
    count = Notification.query.filter_by(
        recipient_user_id=current_user.id,
        read_status=False
    ).count()
    return jsonify({'count': count})
