import os
from app import create_app
from app.models import db, User

# Create application instance
app = create_app(os.environ.get('FLASK_ENV', 'development'))


def ensure_initialized():
    """Ensures tables and test user credentials exist upon startup."""
    with app.app_context():
        db.create_all()

        # Check if users already seeded
        if User.query.count() == 0:
            print("Seeding initial user accounts for testing...")
            users_data = [
                {
                    'full_name': 'Engr. Roberto Alcantara',
                    'email': 'admin@ecotrack.ph',
                    'username': 'admin',
                    'password': 'AdminPass123!',
                    'role': 'admin',
                    'phone_number': '0917-555-0100'
                },
                {
                    'full_name': 'Danilo Santos',
                    'email': 'collector1@ecotrack.ph',
                    'username': 'danilo_collector',
                    'password': 'CollectorPass123!',
                    'role': 'personnel',
                    'phone_number': '0918-555-0201'
                },
                {
                    'full_name': 'Ramon Fernandez',
                    'email': 'collector2@ecotrack.ph',
                    'username': 'ramon_collector',
                    'password': 'CollectorPass123!',
                    'role': 'personnel',
                    'phone_number': '0918-555-0202'
                },
                {
                    'full_name': 'Juan Dela Cruz',
                    'email': 'juan.delacruz@gmail.com',
                    'username': 'juandc',
                    'password': 'ResidentPass123!',
                    'role': 'resident',
                    'phone_number': '0919-555-0301'
                },
                {
                    'full_name': 'Maria Clara Santos',
                    'email': 'maria.santos@gmail.com',
                    'username': 'mariaclara',
                    'password': 'ResidentPass123!',
                    'role': 'resident',
                    'phone_number': '0919-555-0302'
                }
            ]

            for u in users_data:
                user = User(
                    full_name=u['full_name'],
                    email=u['email'],
                    username=u['username'],
                    role=u['role'],
                    phone_number=u['phone_number'],
                    account_status='active'
                )
                user.set_password(u['password'])
                db.session.add(user)

            db.session.commit()


if __name__ == '__main__':
    ensure_initialized()
    print("=" * 65)
    print("  A Proposed Waste Management System for Minglanilla, Cebu")
    print("  Piloted in Barangay Poblacion, Minglanilla, Cebu")
    print("  Local PC:      http://127.0.0.1:5000")
    print("=" * 65)
    app.run(host='0.0.0.0', port=5000, debug=True)
