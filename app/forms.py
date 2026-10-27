from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import (
    StringField, PasswordField, BooleanField, SubmitField,
    TextAreaField, SelectField, HiddenField
)
from wtforms.validators import (
    DataRequired, Email, Length, EqualTo, ValidationError, Optional
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
    """
    Waste report submission form allowing residents of Minglanilla (Poblacion pilot area)
    to pinpoint full garbage bins on a GIS map and record location, photo, time submitted, and status.
    """
    title = StringField('Report Title', validators=[
        DataRequired(),
        Length(min=5, max=140, message='Title must be between 5 and 140 characters.')
    ])
    waste_category = SelectField('Waste Concern Type', choices=[
        ('Full Garbage Bin', 'Full Garbage Bin In Need of Collection'),
        ('Overflowing Bin', 'Overflowing Public Garbage Bin'),
        ('Uncollected Garbage', 'Uncollected Garbage / Delayed Pickup'),
        ('Bins Needing Cleaning', 'Garbage Bin In Need of Cleaning / Sanitation'),
        ('Scattered Waste', 'Scattered Waste Around Bin Area'),
        ('Other Waste Concern', 'Other Waste-Related Concern')
    ], validators=[DataRequired()])
    location_description = StringField('Specific Street, Sitio, or Landmark in Poblacion, Minglanilla', validators=[
        DataRequired(),
        Length(min=5, max=250, message='Please provide a clear street name, sitio, or landmark near the reported bin.')
    ])
    description = TextAreaField('Description of the Waste Concern', validators=[
        Optional(),
        Length(max=1000)
    ])
    latitude = HiddenField('Latitude', validators=[DataRequired()])
    longitude = HiddenField('Longitude', validators=[DataRequired()])
    photo = FileField('Upload Photo of Reported Bin (Recommended)', validators=[
        FileAllowed(['jpg', 'jpeg', 'png', 'webp'], 'Only images (.jpg, .jpeg, .png, .webp) are allowed.')
    ])
    submit = SubmitField('Submit Waste Report')

    def validate_latitude(self, field):
        try:
            float(field.data)
        except (ValueError, TypeError):
            raise ValidationError('Please pinpoint a valid bin location on the interactive map.')

    def validate_longitude(self, field):
        try:
            lng = float(field.data)
            lat = float(self.latitude.data)
        except (ValueError, TypeError):
            raise ValidationError('Please pinpoint a valid bin location on the interactive map.')

        if not is_point_in_poblacion(lat, lng):
            raise ValidationError(
                'The selected coordinates are outside the Minglanilla Poblacion pilot area. '
                'Please pinpoint a location within the highlighted boundary on the map.'
            )


class PersonnelMarkReportForm(FlaskForm):
    """
    Form used by Garbage Collection Personnel to mark a reported garbage bin
    as Cleaned or Collected on the GIS system, updating its status from Outstanding to Addressed.
    """
    resolution_status = SelectField('Mark Bin Status As', choices=[
        ('Collected', 'Mark as Collected (Garbage bin emptied / collected)'),
        ('Cleaned', 'Mark as Cleaned (Garbage bin and surrounding area cleaned)')
    ], default='Collected', validators=[DataRequired()])
    collection_notes = TextAreaField('Collection / Cleaning Remarks (Optional)', validators=[
        Optional(),
        Length(max=500)
    ])
    proof_photo = FileField('Photo After Cleaning / Collection (Optional)', validators=[
        FileAllowed(['jpg', 'jpeg', 'png', 'webp'], 'Only images (.jpg, .jpeg, .png, .webp) are allowed.')
    ])
    submit = SubmitField('Confirm Status Update')


class CreatePersonnelForm(FlaskForm):
    """Admin form to register a new garbage collection personnel account."""
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
