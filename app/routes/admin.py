from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.models import db, User, WasteReport, ReportStatusHistory
from app.forms import CreatePersonnelForm
from app.utils.security import admin_required
from app.utils.geo import POBLACION_LANDMARKS

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    """
    Administrator Monitoring Dashboard:
    - Views all resident-submitted reports as markers on the GIS-based map
    - Monitors which waste concerns remain Outstanding ('Pending') and which have been Addressed ('Collected' / 'Cleaned')
    """
    total_reports = WasteReport.query.count()
    outstanding_count = WasteReport.query.filter_by(current_status='Pending').count()
    collected_count = WasteReport.query.filter_by(current_status='Collected').count()
    cleaned_count = WasteReport.query.filter_by(current_status='Cleaned').count()
    addressed_count = collected_count + cleaned_count

    resolution_rate = round((addressed_count / total_reports) * 100, 1) if total_reports > 0 else 0.0

    # Outstanding concerns requiring collection/cleaning
    outstanding_reports = WasteReport.query.filter_by(current_status='Pending').order_by(
        WasteReport.submission_timestamp.desc()
    ).limit(8).all()

    # Recently addressed concerns (marked Cleaned or Collected by personnel)
    addressed_reports = WasteReport.query.filter(
        WasteReport.current_status.in_(['Collected', 'Cleaned'])
    ).order_by(WasteReport.last_updated_timestamp.desc()).limit(8).all()

    personnel_users = User.query.filter_by(role='personnel', account_status='active').all()

    return render_template(
        'admin/dashboard.html',
        total_reports=total_reports,
        outstanding_count=outstanding_count,
        collected_count=collected_count,
        cleaned_count=cleaned_count,
        addressed_count=addressed_count,
        resolution_rate=resolution_rate,
        outstanding_reports=outstanding_reports,
        addressed_reports=addressed_reports,
        personnel_users=personnel_users,
        landmarks=POBLACION_LANDMARKS
    )


@admin_bp.route('/map')
@login_required
@admin_required
def centralized_map():
    """Full-screen GIS-based map for administrators to view and filter Outstanding vs. Addressed reports."""
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')

    query = WasteReport.query
    if status_filter == 'Outstanding':
        query = query.filter_by(current_status='Pending')
    elif status_filter == 'Addressed':
        query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))
    elif status_filter != 'all':
        query = query.filter_by(current_status=status_filter)

    if category_filter != 'all':
        query = query.filter_by(waste_category=category_filter)

    reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    categories = [
        'Full Garbage Bin', 'Overflowing Bin', 'Uncollected Garbage',
        'Bins Needing Cleaning', 'Scattered Waste', 'Other Waste Concern'
    ]

    return render_template(
        'admin/centralized_map.html',
        reports=reports,
        current_status=status_filter,
        current_category=category_filter,
        categories=categories,
        landmarks=POBLACION_LANDMARKS
    )


@admin_bp.route('/reports')
@login_required
@admin_required
def reports():
    """Master monitoring table allowing administrators to track Outstanding and Addressed concerns."""
    status = request.args.get('status', '')
    category = request.args.get('category', '')
    personnel_id = request.args.get('personnel_id', '')
    search = request.args.get('search', '').strip()

    query = WasteReport.query

    if status == 'Outstanding':
        query = query.filter(WasteReport.current_status == 'Pending')
    elif status == 'Addressed':
        query = query.filter(WasteReport.current_status.in_(['Collected', 'Cleaned']))
    elif status:
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
        query = query.filter(WasteReport.resolved_by_user_id == int(personnel_id))

    all_reports = query.order_by(WasteReport.submission_timestamp.desc()).all()
    personnel_list = User.query.filter_by(role='personnel').all()
    categories = [
        'Full Garbage Bin', 'Overflowing Bin', 'Uncollected Garbage',
        'Bins Needing Cleaning', 'Scattered Waste', 'Other Waste Concern'
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


@admin_bp.route('/report/<int:report_id>')
@login_required
@admin_required
def report_detail(report_id):
    """
    Detailed monitoring view of a reported waste concern for System Administrators:
    - Displays pinpointed GIS location, resident's uploaded photo, time submitted, and current status
    - Shows whether the concern remains Outstanding or has been Addressed (Cleaned/Collected) by personnel
    """
    report = WasteReport.query.get_or_404(report_id)
    return render_template('admin/report_detail.html', report=report)


@admin_bp.route('/users', methods=['GET', 'POST'])
@login_required
@admin_required
def users():
    """User account management: view accounts, register new garbage collection personnel, toggle statuses."""
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
        flash(f'Garbage Collection Personnel account for {new_collector.full_name} created successfully!', 'success')
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


@admin_bp.route('/audit-log')
@login_required
@admin_required
def audit_log():
    """Status update log showing all report submissions and Cleaned/Collected status updates."""
    history_records = ReportStatusHistory.query.order_by(
        ReportStatusHistory.timestamp.desc()
    ).limit(100).all()
    return render_template('admin/audit_log.html', history_records=history_records)
