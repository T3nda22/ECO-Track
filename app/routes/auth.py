from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models import db, User
from app.forms import LoginForm, ResidentRegistrationForm

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Authenticates users into their respective role dashboards."""
    if current_user.is_authenticated:
        return redirect_by_role(current_user)

    form = LoginForm()
    if form.validate_on_submit():
        login_val = form.login_id.data.strip().lower()
        user = User.query.filter(
            (db.func.lower(User.email) == login_val) | (db.func.lower(User.username) == login_val)
        ).first()

        if user and user.check_password(form.password.data):
            if user.account_status != 'active':
                flash('Your account has been deactivated or suspended. Please contact an administrator.', 'danger')
                return render_template('auth/login.html', form=form)

            login_user(user, remember=form.remember_me.data)
            flash(f'Welcome back, {user.full_name}!', 'success')
            
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect_by_role(user)
        else:
            flash('Invalid email/username or password. Please try again.', 'danger')

    return render_template('auth/login.html', form=form)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Allows residents of Poblacion, Minglanilla to register an account."""
    if current_user.is_authenticated:
        return redirect_by_role(current_user)

    form = ResidentRegistrationForm()
    if form.validate_on_submit():
        user = User(
            full_name=form.full_name.data.strip(),
            email=form.email.data.strip().lower(),
            username=form.username.data.strip(),
            phone_number=form.phone_number.data.strip() if form.phone_number.data else None,
            role='resident',
            account_status='active'
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()

        login_user(user)
        flash('Registration successful! Welcome to ECO TRACK.', 'success')
        return redirect(url_for('resident.dashboard'))

    return render_template('auth/register.html', form=form)


@auth_bp.route('/logout')
@login_required
def logout():
    """Logs the user out of the session."""
    logout_user()
    flash('You have been logged out safely.', 'info')
    return redirect(url_for('main.index'))


@auth_bp.route('/demo-login/<role>')
def demo_login(role):
    """
    Convenient 1-click login switch designed specifically for capstone demonstration.
    Allows easy evaluation of the 3 user roles without manually typing passwords.
    """
    role_map = {
        'admin': 'admin@ecotrack.ph',
        'personnel': 'collector1@ecotrack.ph',
        'resident': 'juan.delacruz@gmail.com'
    }
    
    target_email = role_map.get(role)
    if not target_email:
        flash('Invalid demo role requested.', 'warning')
        return redirect(url_for('auth.login'))

    user = User.query.filter_by(email=target_email).first()
    if not user:
        flash(f'Sample {role} user not found. Please ensure database is seeded.', 'warning')
        return redirect(url_for('auth.login'))

    login_user(user)
    flash(f'Logged in as demo {role.capitalize()}: {user.full_name}', 'info')
    return redirect_by_role(user)


def redirect_by_role(user):
    """Redirects authenticated user to their role-specific dashboard."""
    if user.is_admin:
        return redirect(url_for('admin.dashboard'))
    elif user.is_personnel:
        return redirect(url_for('personnel.dashboard'))
    else:
        return redirect(url_for('resident.dashboard'))
