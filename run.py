import os
from app import create_app
from app.models import db, User, CollectionSchedule

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

        # Seed baseline Poblacion schedules if empty
        admin = User.query.filter_by(role='admin').first()
        if admin and CollectionSchedule.query.count() == 0:
            print("Seeding baseline Poblacion collection schedules...")
            schedules = [
                CollectionSchedule(
                    service_area='Poblacion Ward 1 (Coastal Sector & Caballero St.)',
                    collection_day='Monday & Thursday',
                    collection_time='06:00 AM - 09:00 AM',
                    waste_type='Biodegradable & Residual Waste',
                    schedule_notes='Primary route covers Caballero St., public market perimeter, and coastal road.',
                    created_by_user_id=admin.id
                ),
                CollectionSchedule(
                    service_area='Poblacion Ward 2 (Central Market & Tulay Boundary)',
                    collection_day='Tuesday & Friday',
                    collection_time='06:00 AM - 09:00 AM',
                    waste_type='Residual & Recyclable Waste',
                    schedule_notes='Route covers Ward 2-Tulay Road and Minglanilla Central Elementary School surroundings.',
                    created_by_user_id=admin.id
                ),
                CollectionSchedule(
                    service_area='Poblacion Ward 3 (Town Plaza & Municipal Hall)',
                    collection_day='Monday, Wednesday & Saturday',
                    collection_time='05:30 AM - 08:30 AM',
                    waste_type='Commercial & Biodegradable Waste',
                    schedule_notes='Covers Municipal Hall, Plaza, Immaculate Heart of Mary Parish Church, and Villordon St.',
                    created_by_user_id=admin.id
                ),
                CollectionSchedule(
                    service_area='Poblacion Ward 4 (Highway Commercial Corridor)',
                    collection_day='Daily (Monday to Sunday)',
                    collection_time='08:00 PM - 11:00 PM',
                    waste_type='Commercial & Residual Waste',
                    schedule_notes='Night collection along Natalio Bacalso National Highway corridor in Poblacion.',
                    created_by_user_id=admin.id
                )
            ]
            db.session.add_all(schedules)
            db.session.commit()


if __name__ == '__main__':
    ensure_initialized()
    print("=" * 65)
    print("  ECO TRACK: GIS-Based Waste Management System")
    print("  Exclusively Serving Barangay Poblacion, Minglanilla, Cebu")
    print("  Local PC:      http://127.0.0.1:5000")
    print("  Mobile / LAN:  http://192.168.1.39:5000")
    print("=" * 65)
    app.run(host='0.0.0.0', port=5000, debug=True)
