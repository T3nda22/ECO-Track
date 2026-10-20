from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import (
    StringField, PasswordField, BooleanField, SubmitField,
    TextAreaField, SelectField, FloatField, HiddenField
)
from wtforms.validators import (
    DataRequired, Email, Length, EqualTo, ValidationError, Optional, NumberRange
)
from app.models import User
from app.utils.geo import is_point_in_poblacion


class LoginForm(FlaskForm):
    """User authentication form supporting email or username."""
    login_id = StringField('Email or Username', validators=[DataRequired(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Keep me logged in')
    submit = SubmitField('Sign In')


class ResidentRegistrationForm(FlaskForm):
    """Resident sign-up form."""
    full_name = StringField('Full Name', validators=[DataRequired(), Length(min=2, max=120)])
    email = StringField('Email Address', validators=[DataRequired(), Email(), Length(max=120)])
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=50)])
    phone_number = StringField('Mobile Number (Optional)', validators=[Optional(), Length(max=20)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, message='Password must be at least 6 characters')])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Create Resident Account')

    def validate_email(self, field):
        if User.query.filter_by(email=field.data.lower().strip()).first():
            raise ValidationError('This email address is already registered.')

    def validate_username(self, field):
        if User.query.filter_by(username=field.data.strip()).first():
            raise ValidationError('This username is already taken. Please choose another.')


class ReportSubmissionForm(FlaskForm):
    """Waste report submission form with GIS coordinates."""
    title = StringField('Report Title', validators=[
        DataRequired(),
        Length(min=5, max=140, message='Title must be between 5 and 140 characters.')
    ])
    waste_category = SelectField('Waste Problem Category', choices=[
        ('Overflowing Bin', 'Overflowing Public Garbage Bin'),
        ('Full Garbage Bin', 'Full Garbage Bin Awaiting Collection'),
        ('Scattered Waste', 'Scattered Waste / Littered Roadside'),
        ('Bulky Waste', 'Bulky Waste (Branches, Furniture, Debris)'),
        ('Illegal Dumping', 'Illegal Dumping Site / Stacked Garbage'),
        ('Other Waste Concern', 'Other Solid Waste Concern')
    ], validators=[DataRequired()])
    location_description = StringField('Specific Street or Landmark Address in Poblacion', validators=[
        DataRequired(),
        Length(min=5, max=250, message='Please provide a clear street name, landmark, or house near the waste.')
    ])
    description = TextAreaField('Detailed Description of the Waste Condition', validators=[
        DataRequired(),
        Length(min=10, max=1000, message='Please describe the waste volume, type, and situation.')
    ])
    latitude = HiddenField('Latitude', validators=[DataRequired()])
    longitude = HiddenField('Longitude', validators=[DataRequired()])
    photo = FileField('Upload Waste Photo (Optional)', validators=[
        FileAllowed(['jpg', 'jpeg', 'png', 'webp'], 'Only images (.jpg, .jpeg, .png, .webp) are allowed.')
    ])
    submit = SubmitField('Submit Waste Report')

    def validate_latitude(self, field):
        try:
            lat = float(field.data)
        except (ValueError, TypeError):
            raise ValidationError('Please pinpoint a valid location on the interactive map.')

    def validate_longitude(self, field):
        try:
            lng = float(field.data)
            lat = float(self.latitude.data)
        except (ValueError, TypeError):
            raise ValidationError('Please pinpoint a valid location on the interactive map.')

        if not is_point_in_poblacion(lat, lng):
            raise ValidationError(
                'The selected coordinates are outside Barangay Poblacion, Minglanilla. '
                'ECO TRACK solely accepts reports located within the Poblacion service perimeter.'
            )


class ReportReviewForm(FlaskForm):
    """Admin verification or rejection form."""
    action = SelectField('Action', choices=[
        ('verify', 'Verify Report (Proceed to Assignment)'),
        ('reject', 'Reject Report (Invalid / Duplicate / Out of Scope)')
    ], validators=[DataRequired()])
    rejection_reason = TextAreaField('Reason for Rejection (Mandatory if rejected)', validators=[
        Optional(),
        Length(max=500)
    ])
    submit = SubmitField('Update Report Status')


class TaskAssignmentForm(FlaskForm):
    """Admin assignment of verified report to collection personnel."""
    personnel_id = SelectField('Assign to Collection Personnel', coerce=int, validators=[DataRequired()])
    priority = SelectField('Task Priority', choices=[
        ('Normal', 'Normal Priority'),
        ('High', 'High Priority'),
        ('Urgent', 'Urgent / Immediate Action Needed')
    ], default='Normal', validators=[DataRequired()])
    instructions = TextAreaField('Special Instructions / Notes for Personnel', validators=[
        Optional(),
        Length(max=500)
    ])
    submit = SubmitField('Assign Collection Task')


class PersonnelTaskUpdateForm(FlaskForm):
    """Personnel update form to transition task status to In Progress or Collected."""
    task_action = SelectField('Action', choices=[
        ('in_progress', 'Mark as In Progress (Heading to location / starting cleanup)'),
        ('collected', 'Mark as Collected (Waste cleared & loaded)')
    ], validators=[DataRequired()])
    collection_notes = TextAreaField('Collection Remarks / Clearance Details', validators=[
        Optional(),
        Length(max=500)
    ])
    proof_photo = FileField('Proof of Collection Photo (Recommended for Collected status)', validators=[
        FileAllowed(['jpg', 'jpeg', 'png', 'webp'], 'Only images (.jpg, .jpeg, .png, .webp) are allowed.')
    ])
    submit = SubmitField('Update Collection Task')


class AdminConfirmCompletionForm(FlaskForm):
    """Admin confirmation to mark a collected report as fully Completed."""
    admin_notes = TextAreaField('Confirmation Notes (Optional)', validators=[
        Optional(),
        Length(max=500)
    ])
    submit = SubmitField('Confirm Report as Completed')


class ScheduleForm(FlaskForm):
    """Form to manage weekly collection schedules for Poblacion zones."""
    service_area = StringField('Service Zone / Ward in Poblacion', validators=[DataRequired(), Length(max=120)])
    collection_day = StringField('Collection Day(s)', validators=[DataRequired(), Length(max=40)])
    collection_time = StringField('Time Window (e.g. 06:00 AM - 09:00 AM)', validators=[DataRequired(), Length(max=50)])
    waste_type = StringField('Waste Type (e.g., Biodegradable, Recyclable, Residual)', validators=[DataRequired(), Length(max=60)])
    schedule_notes = TextAreaField('Notes or Guidelines', validators=[Optional(), Length(max=500)])
    submit = SubmitField('Save Collection Schedule')


class CreatePersonnelForm(FlaskForm):
    """Admin form to register a new collection personnel account."""
    full_name = StringField('Personnel Full Name', validators=[DataRequired(), Length(min=2, max=120)])
    email = StringField('Email Address', validators=[DataRequired(), Email(), Length(max=120)])
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=50)])
    phone_number = StringField('Mobile Contact Number', validators=[DataRequired(), Length(max=20)])
    password = PasswordField('Initial Password', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Register Collection Personnel')

    def validate_email(self, field):
        if User.query.filter_by(email=field.data.lower().strip()).first():
            raise ValidationError('This email address is already in use.')

    def validate_username(self, field):
        if User.query.filter_by(username=field.data.strip()).first():
            raise ValidationError('This username is already taken.')
