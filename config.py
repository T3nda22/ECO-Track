import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the application
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')


class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ecotrack-poblacion-minglanilla-secret-2026')
    
    # Database Configuration:
    # Default to SQLite for seamless local development, with full MySQL compatibility via PyMySQL.
    # To use MySQL: set DATABASE_URL=mysql+pymysql://username:password@localhost:3306/ecotrack_db in .env
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{BASE_DIR / 'ecotrack.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File Uploads Configuration
    UPLOAD_FOLDER = BASE_DIR / 'app' / 'static' / 'uploads'
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    
    # Service Area Information - Exclusively Poblacion, Minglanilla, Cebu, Philippines
    SERVICE_AREA_NAME = "Barangay Poblacion, Minglanilla, Cebu"
    MUNICIPALITY = "Minglanilla"
    PROVINCE = "Cebu"
    COUNTRY = "Philippines"
    
    # Map Default Center (Minglanilla Poblacion Town Plaza / Municipal Hall area)
    DEFAULT_MAP_LAT = 10.2450
    DEFAULT_MAP_LNG = 123.7960
    DEFAULT_MAP_ZOOM = 16


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
