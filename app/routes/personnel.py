from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.models import db, TaskAssignment, WasteReport, User
from app.forms import PersonnelTaskUpdateForm
from app.utils.security import personnel_required, save_uploaded_photo, record_status_change, notify_user
from app.utils.geo import POBLACION_LANDMARKS

personnel_bp = Blueprint('personnel', __name__, url_prefix='/personnel')


@personnel_bp.route('/dashboard')
@login_required
@personnel_required
def dashboard():
    """Personnel dashboard displaying assigned tasks, active collections, and personal statistics."""
    # Only tasks assigned to current logged-in personnel member
    my_assignments = TaskAssignment.query.filter_by(
        assigned_personnel_id=current_user.id
    ).join(WasteReport).order_by(
        # Order urgent priority first, then date
        db.case(
            (TaskAssignment.priority == 'Urgent', 1),
            (TaskAssignment.priority == 'High', 2),
            else_=3
        ),
        TaskAssignment.assignment_timestamp.desc()
    ).all()

    assigned_count = sum(1 for t in my_assignments if t.task_status == 'Assigned')
    in_progress_count = sum(1 for t in my_assignments if t.task_status == 'In Progress')
    collected_count = sum(1 for t in my_assignments if t.task_status == 'Collected')
    completed_count = sum(1 for t in my_assignments if t.task_status == 'Completed')

    # Pending active tasks that need action (Assigned or In Progress)
    active_tasks = [t for t in my_assignments if t.task_status in ['Assigned', 'In Progress']]

    return render_template(
        'personnel/dashboard.html',
        assignments=my_assignments,
        active_tasks=active_tasks,
        assigned_count=assigned_count,
        in_progress_count=in_progress_count,
        collected_count=collected_count,
        completed_count=completed_count,
        landmarks=POBLACION_LANDMARKS
    )


@personnel_bp.route('/tasks')
@login_required
@personnel_required
def tasks():
    """List of all collection tasks assigned to the personnel with status filters."""
    status_filter = request.args.get('status', 'all')
    query = TaskAssignment.query.filter_by(assigned_personnel_id=current_user.id)

    if status_filter in ['Assigned', 'In Progress', 'Collected', 'Completed']:
        query = query.filter_by(task_status=status_filter)

    my_tasks = query.order_by(TaskAssignment.assignment_timestamp.desc()).all()

    return render_template('personnel/tasks.html', tasks=my_tasks, current_filter=status_filter)


@personnel_bp.route('/task/<int:assignment_id>', methods=['GET', 'POST'])
@login_required
@personnel_required
def task_detail(assignment_id):
    """
    Detailed task view:
    - Report photo, coordinates, street address, and description
    - Interactive GIS map focused on the exact location
    - State transition:
      * 'in_progress': Updates task & report to 'In Progress'
      * 'collected': Saves clearance note, uploads proof photo, updates to 'Collected',
        and notifies Administrator for final verification.
    """
    # Strict isolation: personnel can only view their own assigned tasks
    assignment = TaskAssignment.query.filter_by(
        id=assignment_id,
        assigned_personnel_id=current_user.id
    ).first_or_404()

    report = assignment.report
    form = PersonnelTaskUpdateForm()

    if form.validate_on_submit():
        action = form.task_action.data
        notes = form.collection_notes.data.strip() if form.collection_notes.data else None

        if action == 'in_progress':
            assignment.task_status = 'In Progress'
            assignment.started_at = datetime.utcnow()
            
            note_msg = notes or f"Collection commenced by personnel {current_user.full_name}."
            record_status_change(
                report=report,
                new_status='In Progress',
                updated_by_user_id=current_user.id,
                note=note_msg
            )

            # Notify resident
            notify_user(
                recipient_id=report.resident_id,
                title='Collection In Progress',
                message=f'Collection personnel ({current_user.full_name}) is now attending to your report {report.tracking_code} at {report.location_description}.',
                report_id=report.id
            )

            db.session.commit()
            flash('Task marked as In Progress. Collection is underway!', 'info')
            return redirect(url_for('personnel.task_detail', assignment_id=assignment.id))

        elif action == 'collected':
            # Handle proof of collection photo
            proof_photo_name = None
            if form.proof_photo.data:
                try:
                    proof_photo_name = save_uploaded_photo(form.proof_photo.data, subfolder='proofs')
                    assignment.collection_proof_photo_reference = proof_photo_name
                except ValueError as e:
                    flash(str(e), 'danger')
                    return render_template('personnel/task_detail.html', assignment=assignment, form=form)

            assignment.task_status = 'Collected'
            assignment.collection_timestamp = datetime.utcnow()
            assignment.collection_notes = notes

            clearance_msg = notes or f"Waste cleared and loaded by personnel {current_user.full_name}."
            if proof_photo_name:
                clearance_msg += " (Proof photo attached)"

            record_status_change(
                report=report,
                new_status='Collected',
                updated_by_user_id=current_user.id,
                note=clearance_msg
            )

            # Notify administrator for final completion confirmation
            admins = User.query.filter_by(role='admin', account_status='active').all()
            for admin in admins:
                notify_user(
                    recipient_id=admin.id,
                    title='Task Collected - Awaiting Confirmation',
                    message=f'Personnel {current_user.full_name} has marked report {report.tracking_code} as Collected. Please review proof for completion confirmation.',
                    report_id=report.id
                )

            # Notify resident of collection clearance
            notify_user(
                recipient_id=report.resident_id,
                title='Waste Collected',
                message=f'Personnel has collected the waste for your report {report.tracking_code}. An administrator will confirm final completion shortly.',
                report_id=report.id
            )

            db.session.commit()
            flash('Waste successfully collected! Administrator has been notified to confirm completion.', 'success')
            return redirect(url_for('personnel.task_detail', assignment_id=assignment.id))

    return render_template('personnel/task_detail.html', assignment=assignment, form=form)


@personnel_bp.route('/map')
@login_required
@personnel_required
def route_map():
    """Interactive map showing all tasks currently assigned to the personnel member."""
    my_tasks = TaskAssignment.query.filter_by(
        assigned_personnel_id=current_user.id
    ).join(WasteReport).filter(
        TaskAssignment.task_status.in_(['Assigned', 'In Progress'])
    ).all()

    return render_template('personnel/route_map.html', tasks=my_tasks, landmarks=POBLACION_LANDMARKS)


@personnel_bp.route('/history')
@login_required
@personnel_required
def history():
    """Archive of completed collection assignments for the personnel member."""
    completed_tasks = TaskAssignment.query.filter_by(
        assigned_personnel_id=current_user.id
    ).filter(
        TaskAssignment.task_status.in_(['Collected', 'Completed'])
    ).order_by(TaskAssignment.collection_timestamp.desc()).all()

    return render_template('personnel/history.html', tasks=completed_tasks)
