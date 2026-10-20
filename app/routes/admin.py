from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app.models import (
    db, User, WasteReport, TaskAssignment, ReportStatusHistory,
    CollectionSchedule, Notification
)
from app.forms import (
    ReportReviewForm, TaskAssignmentForm, AdminConfirmCompletionForm,
    ScheduleForm, CreatePersonnelForm
)
from app.utils.security import admin_required, record_status_change, notify_user
from app.utils.geo import POBLACION_LANDMARKS

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    """Centralized Administrator dashboard with performance metrics and operational GIS map."""
    # Summary Counts
    total_reports = WasteReport.query.count()
    pending_count = WasteReport.query.filter_by(current_status='Pending').count()
    verified_count = WasteReport.query.filter_by(current_status='Verified').count()
    assigned_count = WasteReport.query.filter_by(current_status='Assigned').count()
    in_progress_count = WasteReport.query.filter_by(current_status='In Progress').count()
    collected_count = WasteReport.query.filter_by(current_status='Collected').count()
    completed_count = WasteReport.query.filter_by(current_status='Completed').count()
    rejected_count = WasteReport.query.filter_by(current_status='Rejected').count()

    # Active operational reports for centralized map
    map_reports = WasteReport.query.order_by(WasteReport.submission_timestamp.desc()).limit(100).all()

    # Recent pending reports awaiting review
    pending_reports = WasteReport.query.filter_by(current_status='Pending').order_by(
        WasteReport.submission_timestamp.desc()
    ).limit(5).all()

    # Collections awaiting admin final completion confirmation
    collected_awaiting_confirmation = WasteReport.query.filter_by(current_status='Collected').order_by(
        WasteReport.last_updated_timestamp.desc()
    ).limit(5).all()

    # Personnel availability summary
    personnel_users = User.query.filter_by(role='personnel', account_status='active').all()

    return render_template(
        'admin/dashboard.html',
        total_reports=total_reports,
        pending_count=pending_count,
        verified_count=verified_count,
        assigned_count=assigned_count,
        in_progress_count=in_progress_count,
        collected_count=collected_count,
        completed_count=completed_count,
        rejected_count=rejected_count,
        map_reports=map_reports,
        pending_reports=pending_reports,
        collected_awaiting_confirmation=collected_awaiting_confirmation,
        personnel_users=personnel_users,
        landmarks=POBLACION_LANDMARKS
    )


@admin_bp.route('/map')
@login_required
@admin_required
def centralized_map():
    """Full-screen centralized GIS map showing all reports across Poblacion with filtering."""
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    
    query = WasteReport.query
    if status_filter != 'all':
        query = query.filter_by(current_status=status_filter)
    if category_filter != 'all':
        query = query.filter_by(waste_category=category_filter)

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    categories = db.session.query(WasteReport.waste_category).distinct().all()

    return render_template(
        'admin/centralized_map.html',
        reports=reports,
        current_status=status_filter,
        current_category=category_filter,
        categories=[c[0] for c in categories],
        landmarks=POBLACION_LANDMARKS
    )


@admin_bp.route('/reports')
@login_required
@admin_required
def reports():
    """Searchable, filterable, and sortable master report management table."""
    status = request.args.get('status', '')
    category = request.args.get('category', '')
    personnel_id = request.args.get('personnel_id', '')
    search = request.args.get('search', '').strip()

    query = WasteReport.query

    if status:
        query = query.filter(WasteReport.current_status == status)
    if category:
        query = query.filter(WasteReport.waste_category == category)
    if search:
        query = query.filter(
            (WasteReport.tracking_code.ilike(f'%{search}%')) |
            (WasteReport.title.ilike(f'%{search}%')) |
            (WasteReport.location_description.ilike(f'%{search}%'))
        )
    if personnel_id:
        query = query.join(TaskAssignment).filter(TaskAssignment.assigned_personnel_id == int(personnel_id))

    all_reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    personnel_list = User.query.filter_by(role='personnel').all()
    categories = [
        'Overflowing Bin', 'Full Garbage Bin', 'Scattered Waste',
        'Bulky Waste', 'Illegal Dumping', 'Other Waste Concern'
    ]

    return render_template(
        'admin/reports.html',
        reports=all_reports,
        personnel_list=personnel_list,
        categories=categories,
        selected_status=status,
        selected_category=category,
        selected_personnel=personnel_id,
        search_query=search
    )


@admin_bp.route('/report/<int:report_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def report_detail(report_id):
    """
    Detailed review page for a specific report:
    - Review coordinates, photos, resident description
    - Verify or Reject (if Pending)
    - Assign to Personnel with Priority (if Verified)
    - Final completion confirmation (if Collected)
    """
    report = WasteReport.query.get_or_404(report_id)
    review_form = ReportReviewForm()
    assign_form = TaskAssignmentForm()
    confirm_form = AdminConfirmCompletionForm()

    # Populate personnel choices for assignment
    active_personnel = User.query.filter_by(role='personnel', account_status='active').all()
    assign_form.personnel_id.choices = [(p.id, f"{p.full_name} ({p.username})") for p in active_personnel]

    # Handle Verification / Rejection
    if review_form.validate_on_submit() and 'submit_review' in request.form:
        action = review_form.action.data
        if action == 'verify':
            record_status_change(
                report=report,
                new_status='Verified',
                updated_by_user_id=current_user.id,
                note='Report verified by Administrator as valid within Poblacion, Minglanilla.'
            )
            notify_user(
                recipient_id=report.resident_id,
                title='Report Verified',
                message=f'Your waste report {report.tracking_code} has been verified and will be assigned for collection.',
                report_id=report.id
            )
            db.session.commit()
            flash(f'Report {report.tracking_code} verified successfully! You may now assign collection personnel.', 'success')
            return redirect(url_for('admin.report_detail', report_id=report.id))

        elif action == 'reject':
            reason = review_form.rejection_reason.data
            if not reason:
                flash('Please provide a clear justification reason for rejecting this report.', 'danger')
                return redirect(url_for('admin.report_detail', report_id=report.id))

            report.rejection_reason = reason.strip()
            record_status_change(
                report=report,
                new_status='Rejected',
                updated_by_user_id=current_user.id,
                note=f"Rejected: {reason.strip()}"
            )
            notify_user(
                recipient_id=report.resident_id,
                title='Report Rejected',
                message=f'Your waste report {report.tracking_code} could not be serviced. Reason: {reason.strip()}',
                report_id=report.id
            )
            db.session.commit()
            flash(f'Report {report.tracking_code} has been rejected.', 'warning')
            return redirect(url_for('admin.report_detail', report_id=report.id))

    # Handle Task Assignment to Personnel
    if assign_form.validate_on_submit() and 'submit_assign' in request.form:
        personnel_id = assign_form.personnel_id.data
        priority = assign_form.priority.data
        instructions = assign_form.instructions.data

        # Check if already assigned
        existing_assignment = TaskAssignment.query.filter_by(report_id=report.id).first()
        if existing_assignment:
            existing_assignment.assigned_personnel_id = personnel_id
            existing_assignment.priority = priority
            existing_assignment.task_status = 'Assigned'
        else:
            assignment = TaskAssignment(
                report_id=report.id,
                assigned_personnel_id=personnel_id,
                administrator_id=current_user.id,
                priority=priority,
                task_status='Assigned'
            )
            db.session.add(assignment)

        assigned_user = User.query.get(personnel_id)
        note_text = f"Assigned to {assigned_user.full_name} with {priority} priority."
        if instructions:
            note_text += f" Instructions: {instructions}"

        record_status_change(
            report=report,
            new_status='Assigned',
            updated_by_user_id=current_user.id,
            note=note_text
        )

        # Notify personnel
        notify_user(
            recipient_id=personnel_id,
            title='New Collection Task Assigned',
            message=f'You have been assigned waste collection for report {report.tracking_code} at {report.location_description}. Priority: {priority}.',
            report_id=report.id
        )

        # Notify resident
        notify_user(
            recipient_id=report.resident_id,
            title='Collection Task Assigned',
            message=f'Waste collection for your report {report.tracking_code} has been assigned to our personnel ({assigned_user.full_name}).',
            report_id=report.id
        )

        db.session.commit()
        flash(f'Task assigned successfully to {assigned_user.full_name}!', 'success')
        return redirect(url_for('admin.report_detail', report_id=report.id))

    # Handle Admin Final Confirmation of Completed Collection
    if confirm_form.validate_on_submit() and 'submit_complete' in request.form:
        notes = confirm_form.admin_notes.data or 'Admin reviewed collection proof and confirmed resolution.'
        
        record_status_change(
            report=report,
            new_status='Completed',
            updated_by_user_id=current_user.id,
            note=notes
        )
        if report.task_assignment:
            report.task_assignment.task_status = 'Completed'

        # Notify resident that the report is officially completed
        notify_user(
            recipient_id=report.resident_id,
            title='Waste Collection Completed!',
            message=f'Your reported waste issue {report.tracking_code} at {report.location_description} has been successfully cleared and marked Completed.',
            report_id=report.id
        )

        db.session.commit()
        flash(f'Report {report.tracking_code} officially confirmed as COMPLETED!', 'success')
        return redirect(url_for('admin.report_detail', report_id=report.id))

    return render_template(
        'admin/report_detail.html',
        report=report,
        review_form=review_form,
        assign_form=assign_form,
        confirm_form=confirm_form
    )


@admin_bp.route('/users', methods=['GET', 'POST'])
@login_required
@admin_required
def users():
    """User account management: view all accounts, register new personnel, toggle statuses."""
    form = CreatePersonnelForm()

    if form.validate_on_submit():
        new_collector = User(
            full_name=form.full_name.data.strip(),
            email=form.email.data.strip().lower(),
            username=form.username.data.strip(),
            phone_number=form.phone_number.data.strip(),
            role='personnel',
            account_status='active'
        )
        new_collector.set_password(form.password.data)
        db.session.add(new_collector)
        db.session.commit()
        flash(f'Collection Personnel account for {new_collector.full_name} created successfully!', 'success')
        return redirect(url_for('admin.users'))

    all_users = User.query.order_by(User.created_at.desc()).all()
    return render_template('admin/users.html', users=all_users, form=form)


@admin_bp.route('/user/<int:user_id>/toggle-status', methods=['POST'])
@login_required
@admin_required
def toggle_user_status(user_id):
    """Activates or suspends a user account."""
    if user_id == current_user.id:
        flash('You cannot deactivate your own administrative account.', 'warning')
        return redirect(url_for('admin.users'))

    target_user = User.query.get_or_404(user_id)
    if target_user.account_status == 'active':
        target_user.account_status = 'suspended'
        flash(f'Account for {target_user.full_name} has been suspended.', 'warning')
    else:
        target_user.account_status = 'active'
        flash(f'Account for {target_user.full_name} has been activated.', 'success')

    db.session.commit()
    return redirect(url_for('admin.users'))


@admin_bp.route('/schedules', methods=['GET', 'POST'])
@login_required
@admin_required
def schedules():
    """Management of weekly garbage collection schedules for Poblacion zones."""
    form = ScheduleForm()

    if form.validate_on_submit():
        schedule = CollectionSchedule(
            service_area=form.service_area.data.strip(),
            collection_day=form.collection_day.data.strip(),
            collection_time=form.collection_time.data.strip(),
            waste_type=form.waste_type.data.strip(),
            schedule_notes=form.schedule_notes.data.strip() if form.schedule_notes.data else None,
            created_by_user_id=current_user.id
        )
        db.session.add(schedule)
        db.session.commit()
        flash('New collection schedule added successfully!', 'success')
        return redirect(url_for('admin.schedules'))

    all_schedules = CollectionSchedule.query.order_by(CollectionSchedule.service_area.asc()).all()
    return render_template('admin/schedules.html', schedules=all_schedules, form=form)


@admin_bp.route('/schedule/<int:schedule_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_schedule(schedule_id):
    """Deletes a collection schedule."""
    schedule = CollectionSchedule.query.get_or_404(schedule_id)
    db.session.delete(schedule)
    db.session.commit()
    flash('Schedule entry deleted.', 'info')
    return redirect(url_for('admin.schedules'))


@admin_bp.route('/audit-log')
@login_required
@admin_required
def audit_log():
    """Audit trail showing complete status transition records across all waste reports."""
    history_records = ReportStatusHistory.query.order_by(
        ReportStatusHistory.timestamp.desc()
    ).limit(100).all()
    return render_template('admin/audit_log.html', history_records=history_records)
