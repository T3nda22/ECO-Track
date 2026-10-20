from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from app.models import db, WasteReport, ReportStatusHistory, Notification, CollectionSchedule, User
from app.forms import ReportSubmissionForm
from app.utils.security import resident_required, save_uploaded_photo, record_status_change, notify_user
from app.utils.geo import is_point_in_poblacion, POBLACION_LANDMARKS

resident_bp = Blueprint('resident', __name__, url_prefix='/resident')


@resident_bp.route('/dashboard')
@login_required
@resident_required
def dashboard():
    """Resident overview dashboard showing report summary metrics and active reports."""
    # Resident can ONLY see their own reports
    my_reports = WasteReport.query.filter_by(resident_id=current_user.id).order_by(
        WasteReport.submission_timestamp.desc()
    ).all()

    total_submitted = len(my_reports)
    pending_count = sum(1 for r in my_reports if r.current_status == 'Pending')
    in_progress_count = sum(1 for r in my_reports if r.current_status in ['Verified', 'Assigned', 'In Progress', 'Collected'])
    completed_count = sum(1 for r in my_reports if r.current_status == 'Completed')
    rejected_count = sum(1 for r in my_reports if r.current_status == 'Rejected')

    # Unread notifications
    notifications = Notification.query.filter_by(
        recipient_user_id=current_user.id
    ).order_by(Notification.created_timestamp.desc()).limit(5).all()

    # Collection schedules
    schedules = CollectionSchedule.query.order_by(CollectionSchedule.service_area.asc()).all()

    return render_template(
        'resident/dashboard.html',
        reports=my_reports[:5],  # 5 most recent
        total_submitted=total_submitted,
        pending_count=pending_count,
        in_progress_count=in_progress_count,
        completed_count=completed_count,
        rejected_count=rejected_count,
        notifications=notifications,
        schedules=schedules
    )


@resident_bp.route('/report/new', methods=['GET', 'POST'])
@login_required
@resident_required
def new_report():
    """Form and interactive GIS map to pinpoint and submit a new waste report in Poblacion."""
    form = ReportSubmissionForm()

    if form.validate_on_submit():
        lat = float(form.latitude.data)
        lng = float(form.longitude.data)

        # Server-side validation against Poblacion, Minglanilla service boundary
        if not is_point_in_poblacion(lat, lng):
            flash(
                'Submission failed: The chosen location is outside Barangay Poblacion, Minglanilla, Cebu. '
                'ECO TRACK only accepts waste reports within the designated Poblacion service zone.',
                'danger'
            )
            return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)

        # Handle optional photo upload
        photo_filename = None
        if form.photo.data:
            try:
                photo_filename = save_uploaded_photo(form.photo.data, subfolder='reports')
            except ValueError as e:
                flash(str(e), 'danger')
                return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)

        # Create waste report with unique tracking code
        report = WasteReport(
            tracking_code=WasteReport.generate_tracking_code(),
            resident_id=current_user.id,
            title=form.title.data.strip(),
            description=form.description.data.strip(),
            waste_category=form.waste_category.data,
            latitude=lat,
            longitude=lng,
            location_description=form.location_description.data.strip(),
            photo_reference=photo_filename,
            current_status='Pending'
        )
        db.session.add(report)
        db.session.flush()  # Populates report.id

        # Record initial status in audit history
        record_status_change(
            report=report,
            new_status='Pending',
            updated_by_user_id=current_user.id,
            note='Waste report submitted by resident with GIS coordinates.'
        )

        # Notify active administrators of the new incoming report
        admins = User.query.filter_by(role='admin', account_status='active').all()
        for admin in admins:
            notify_user(
                recipient_id=admin.id,
                title='New Waste Report Submitted',
                message=f'Report {report.tracking_code} ({report.waste_category}) was submitted at {report.location_description}.',
                report_id=report.id
            )

        db.session.commit()

        flash(
            f'Report submitted successfully! Your tracking code is {report.tracking_code}. '
            'An administrator will review and verify your report shortly.',
            'success'
        )
        return redirect(url_for('resident.track_report', report_id=report.id))

    return render_template('resident/new_report.html', form=form, landmarks=POBLACION_LANDMARKS)


@resident_bp.route('/reports')
@login_required
@resident_required
def my_reports():
    """List of all reports submitted by the logged-in resident with status filters."""
    status_filter = request.args.get('status', 'all')
    query = WasteReport.query.filter_by(resident_id=current_user.id)

    if status_filter == 'active':
        query = query.filter(WasteReport.current_status.in_(['Pending', 'Verified', 'Assigned', 'In Progress', 'Collected']))
    elif status_filter == 'completed':
        query = query.filter_by(current_status='Completed')
    elif status_filter == 'rejected':
        query = query.filter_by(current_status='Rejected')

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    return render_template('resident/my_reports.html', reports=reports, current_filter=status_filter)


@resident_bp.route('/report/<int:report_id>')
@login_required
@resident_required
def track_report(report_id):
    """
    Detailed tracking view for a specific report showing the map pin,
    live workflow progress, complete status history audit trail, and collection proof.
    """
    # Strict isolation: residents can only view their own reports
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

    # Mark all as read
    for n in notifs:
        n.read_status = True
    db.session.commit()

    return render_template('resident/notifications.html', notifications=notifs)


@resident_bp.route('/schedules')
@login_required
@resident_required
def schedules():
    """Collection schedules view for residents."""
    schedules = CollectionSchedule.query.order_by(CollectionSchedule.service_area.asc()).all()
    return render_template('resident/schedules.html', schedules=schedules)
