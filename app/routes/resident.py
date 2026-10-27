from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.models import db, WasteReport, Notification, User
from app.forms import ReportSubmissionForm
from app.utils.security import resident_required, save_uploaded_photo, record_status_change, notify_user
from app.utils.geo import is_point_in_poblacion, POBLACION_LANDMARKS

resident_bp = Blueprint('resident', __name__, url_prefix='/resident')


@resident_bp.route('/dashboard')
@login_required
@resident_required
def dashboard():
    """Resident dashboard showing submitted reports and whether concerns are Outstanding or Addressed."""
    my_reports = WasteReport.query.filter_by(resident_id=current_user.id).order_by(
        WasteReport.submission_timestamp.desc()
    ).all()

    total_submitted = len(my_reports)
    outstanding_count = sum(1 for r in my_reports if r.is_outstanding)
    collected_count = sum(1 for r in my_reports if r.current_status == 'Collected')
    cleaned_count = sum(1 for r in my_reports if r.current_status == 'Cleaned')
    addressed_count = collected_count + cleaned_count

    notifications = Notification.query.filter_by(
        recipient_user_id=current_user.id
    ).order_by(Notification.created_timestamp.desc()).limit(5).all()

    return render_template(
        'resident/dashboard.html',
        reports=my_reports[:5],
        total_submitted=total_submitted,
        outstanding_count=outstanding_count,
        collected_count=collected_count,
        cleaned_count=cleaned_count,
        addressed_count=addressed_count,
        notifications=notifications
    )


@resident_bp.route('/report/new', methods=['GET', 'POST'])
@login_required
@resident_required
def new_report():
    """
    Allows residents to pinpoint on a GIS map the location of garbage bins that are full
    and in need of cleaning or collection, recording location, photo, time submitted, and status.
    """
    form = ReportSubmissionForm()

    if form.validate_on_submit():
        lat = float(form.latitude.data)
        lng = float(form.longitude.data)

        if not is_point_in_poblacion(lat, lng):
            flash(
                'Submission failed: The pinpointed location is outside the Minglanilla Poblacion pilot area. '
                'Please select a location inside the highlighted boundary on the map.',
                'danger'
            )
            return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)

        photo_filename = None
        if form.photo.data:
            try:
                photo_filename = save_uploaded_photo(form.photo.data, subfolder='reports')
            except ValueError as e:
                flash(str(e), 'danger')
                return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)

        description_text = form.description.data.strip() if form.description.data else (
            f"{form.waste_category.data} reported at {form.location_description.data.strip()}."
        )

        report = WasteReport(
            tracking_code=WasteReport.generate_tracking_code(),
            resident_id=current_user.id,
            title=form.title.data.strip(),
            description=description_text,
            waste_category=form.waste_category.data,
            latitude=lat,
            longitude=lng,
            location_description=form.location_description.data.strip(),
            photo_reference=photo_filename,
            current_status='Pending'
        )
        db.session.add(report)
        db.session.flush()

        # Record initial submission in status history
        record_status_change(
            report=report,
            new_status='Pending',
            updated_by_user_id=current_user.id,
            note='Resident pinpointed full garbage bin on the GIS map and submitted report.'
        )

        # Notify both Administrators and Garbage Collection Personnel so they can view the new marker on the GIS map
        staff_users = User.query.filter(
            User.role.in_(['admin', 'personnel']),
            User.account_status == 'active'
        ).all()
        for staff in staff_users:
            notify_user(
                recipient_id=staff.id,
                title='New Waste Concern Reported on GIS Map',
                message=f'Report {report.tracking_code} ({report.waste_category}) was pinpointed at {report.location_description}.',
                report_id=report.id
            )

        db.session.commit()

        flash(
            f'Waste report {report.tracking_code} submitted! Your pinpointed location is now visible on the GIS map '
            'for garbage collection personnel and administrators.',
            'success'
        )
        return redirect(url_for('resident.track_report', report_id=report.id))

    return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)


@resident_bp.route('/reports')
@login_required
@resident_required
def my_reports():
    """List of all reports submitted by the logged-in resident with Outstanding vs. Addressed filters."""
    status_filter = request.args.get('status', 'all')
    query = WasteReport.query.filter_by(resident_id=current_user.id)

    if status_filter == 'outstanding':
        query = query.filter_by(current_status='Pending')
    elif status_filter == 'addressed':
        query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    return render_template('resident/my_reports.html', reports=reports, current_filter=status_filter)


@resident_bp.route('/report/<int:report_id>')
@login_required
@resident_required
def track_report(report_id):
    """Detailed view of a resident's report showing location marker, photo, time submitted, and status."""
    report = WasteReport.query.filter_by(id=report_id, resident_id=current_user.id).first_or_404()
    return render_template('resident/track_report.html', report=report)


@resident_bp.route('/notifications')
@login_required
@resident_required
def notifications():
    """In-app notifications feed for resident status updates."""
    notifs = Notification.query.filter_by(recipient_user_id=current_user.id).order_by(
        Notification.created_timestamp.desc()
    ).all()

    for n in notifs:
        n.read_status = True
    db.session.commit()

    return render_template('resident/notifications.html', notifications=notifs)
