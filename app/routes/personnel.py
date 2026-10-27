from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.models import db, WasteReport, User
from app.forms import PersonnelMarkReportForm
from app.utils.security import personnel_required, save_uploaded_photo, record_status_change, notify_user
from app.utils.geo import POBLACION_LANDMARKS

personnel_bp = Blueprint('personnel', __name__, url_prefix='/personnel')


@personnel_bp.route('/dashboard')
@login_required
@personnel_required
def dashboard():
    """
    Garbage Collection Personnel Dashboard:
    - Views all resident-submitted reports as markers on the shared GIS-based map
    - Lists Outstanding (Pending) bins that need cleaning or collection
    - Allows personnel to directly mark reported bins as Cleaned or Collected
    """
    all_reports = WasteReport.query.order_by(WasteReport.submission_timestamp.desc()).all()

    total_reports = len(all_reports)
    outstanding_count = sum(1 for r in all_reports if r.is_outstanding)
    collected_count = sum(1 for r in all_reports if r.current_status == 'Collected')
    cleaned_count = sum(1 for r in all_reports if r.current_status == 'Cleaned')
    addressed_count = collected_count + cleaned_count

    # Outstanding reports needing collection or cleaning (oldest or newest)
    outstanding_reports = [r for r in all_reports if r.is_outstanding]
    recently_addressed = [r for r in all_reports if r.is_addressed][:5]

    return render_template(
        'personnel/dashboard.html',
        total_reports=total_reports,
        outstanding_count=outstanding_count,
        collected_count=collected_count,
        cleaned_count=cleaned_count,
        addressed_count=addressed_count,
        outstanding_reports=outstanding_reports,
        recently_addressed=recently_addressed,
        landmarks=POBLACION_LANDMARKS
    )


@personnel_bp.route('/map')
@login_required
@personnel_required
def route_map():
    """
    Full-screen Shared GIS Map for Garbage Collection Personnel.
    Displays all reported bins as markers on the same map viewed by Administrators,
    allowing personnel to locate full bins and mark them as Cleaned or Collected.
    """
    status_filter = request.args.get('status', 'all')
    query = WasteReport.query

    if status_filter == 'Outstanding':
        query = query.filter_by(current_status='Pending')
    elif status_filter == 'Addressed':
        query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))
    elif status_filter in ('Pending', 'Collected', 'Cleaned'):
        query = query.filter_by(current_status=status_filter)

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    outstanding_reports = [r for r in reports if r.is_outstanding]

    return render_template(
        'personnel/route_map.html',
        reports=reports,
        outstanding_reports=outstanding_reports,
        current_status=status_filter,
        landmarks=POBLACION_LANDMARKS
    )


@personnel_bp.route('/tasks')
@personnel_bp.route('/reports')
@login_required
@personnel_required
def tasks():
    """List of all resident-submitted waste reports so personnel can filter and mark bins as Cleaned or Collected."""
    status_filter = request.args.get('status', 'Outstanding')
    query = WasteReport.query

    if status_filter == 'Outstanding':
        query = query.filter_by(current_status='Pending')
    elif status_filter == 'Addressed':
        query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))
    elif status_filter in ('Pending', 'Collected', 'Cleaned'):
        query = query.filter_by(current_status=status_filter)

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    return render_template('personnel/tasks.html', reports=reports, current_filter=status_filter)


@personnel_bp.route('/report/<int:report_id>', methods=['GET', 'POST'])
@personnel_bp.route('/task/<int:report_id>', methods=['GET', 'POST'])
@login_required
@personnel_required
def task_detail(report_id):
    """
    Detailed view of a reported garbage bin for Garbage Collection Personnel:
    - Shows the exact GIS coordinates & marker on the map, resident photo, and time submitted
    - Allows personnel to mark the reported bin as 'Collected' or 'Cleaned'
    """
    report = WasteReport.query.get_or_404(report_id)
    form = PersonnelMarkReportForm()

    if form.validate_on_submit():
        new_status = form.resolution_status.data  # 'Collected' or 'Cleaned'
        notes = form.collection_notes.data.strip() if form.collection_notes.data else None

        if form.proof_photo.data:
            try:
                proof_photo_name = save_uploaded_photo(form.proof_photo.data, subfolder='proofs')
                report.collection_proof_photo = proof_photo_name
            except ValueError as e:
                flash(str(e), 'danger')
                return render_template('personnel/task_detail.html', report=report, form=form)

        report.resolved_by_user_id = current_user.id
        report.resolved_timestamp = datetime.utcnow()
        report.collection_notes = notes

        action_note = notes or f"Reported garbage bin marked as {new_status} by {current_user.full_name}."
        if report.collection_proof_photo:
            action_note += " (Photo attached)"

        record_status_change(
            report=report,
            new_status=new_status,
            updated_by_user_id=current_user.id,
            note=action_note
        )

        # Notify the resident who submitted the report
        notify_user(
            recipient_id=report.resident_id,
            title=f'Reported Bin Marked as {new_status}',
            message=(
                f'Garbage collection personnel ({current_user.full_name}) has marked your report '
                f'{report.tracking_code} at {report.location_description} as {new_status}.'
            ),
            report_id=report.id
        )

        # Notify administrators so they can monitor addressed vs. outstanding concerns
        admins = User.query.filter_by(role='admin', account_status='active').all()
        for admin in admins:
            notify_user(
                recipient_id=admin.id,
                title=f'Concern Addressed ({new_status}): {report.tracking_code}',
                message=(
                    f'Personnel {current_user.full_name} marked report {report.tracking_code} '
                    f'at {report.location_description} as {new_status}.'
                ),
                report_id=report.id
            )

        db.session.commit()
        flash(
            f'Report {report.tracking_code} has been marked as {new_status}! '
            'The GIS map and administrator monitoring dashboard have been updated.',
            'success'
        )
        return redirect(url_for('personnel.task_detail', report_id=report.id))

    return render_template('personnel/task_detail.html', report=report, form=form)


@personnel_bp.route('/report/<int:report_id>/quick-mark', methods=['POST'])
@login_required
@personnel_required
def quick_mark_report(report_id):
    """
    Quick 1-click action allowing Garbage Collection Personnel to mark a reported bin
    as 'Collected' or 'Cleaned' directly from the dashboard, table, or GIS map.
    """
    report = WasteReport.query.get_or_404(report_id)
    new_status = request.form.get('status', 'Collected')
    if new_status not in ('Collected', 'Cleaned'):
        new_status = 'Collected'

    report.resolved_by_user_id = current_user.id
    report.resolved_timestamp = datetime.utcnow()
    if not report.collection_notes:
        report.collection_notes = f"Marked as {new_status} by {current_user.full_name}."

    record_status_change(
        report=report,
        new_status=new_status,
        updated_by_user_id=current_user.id,
        note=f"Reported garbage bin marked as {new_status} by garbage collection personnel ({current_user.full_name})."
    )

    notify_user(
        recipient_id=report.resident_id,
        title=f'Reported Bin Marked as {new_status}',
        message=(
            f'Garbage collection personnel ({current_user.full_name}) marked your report '
            f'{report.tracking_code} at {report.location_description} as {new_status}.'
        ),
        report_id=report.id
    )

    admins = User.query.filter_by(role='admin', account_status='active').all()
    for admin in admins:
        notify_user(
            recipient_id=admin.id,
            title=f'Concern Addressed ({new_status}): {report.tracking_code}',
            message=(
                f'Personnel {current_user.full_name} marked report {report.tracking_code} '
                f'at {report.location_description} as {new_status}.'
            ),
            report_id=report.id
        )

    db.session.commit()
    flash(f'Report {report.tracking_code} marked as {new_status}!', 'success')

    next_url = request.form.get('next') or request.referrer
    if next_url:
        return redirect(next_url)
    return redirect(url_for('personnel.dashboard'))
