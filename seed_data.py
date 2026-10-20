"""
Database initialization and user account seeding for ECO TRACK.
NOTE: As requested, no example reports or dummy images are created.
The system starts with clean report tables ready for testing.
"""

from app import create_app
from app.models import db, User, CollectionSchedule

app = create_app('development')

with app.app_context():
    # Create all database tables
    db.create_all()

    # 1. Seed System Users for Testing (Administrator, Collection Personnel, Resident)
    users_data = [
        {
            'full_name': 'Engr. Roberto Alcantara',
            'email': 'admin@ecotrack.ph',
            'username': 'admin',
            'password': 'AdminPass123!',
            'role': 'admin',
            'phone_number': '0917-555-0100',
            'account_status': 'active'
        },
        {
            'full_name': 'Danilo Santos',
            'email': 'collector1@ecotrack.ph',
            'username': 'danilo_collector',
            'password': 'CollectorPass123!',
            'role': 'personnel',
            'phone_number': '0918-555-0201',
            'account_status': 'active'
        },
        {
            'full_name': 'Ramon Fernandez',
            'email': 'collector2@ecotrack.ph',
            'username': 'ramon_collector',
            'password': 'CollectorPass123!',
            'role': 'personnel',
            'phone_number': '0918-555-0202',
            'account_status': 'active'
        },
        {
            'full_name': 'Juan Dela Cruz',
            'email': 'juan.delacruz@gmail.com',
            'username': 'juandc',
            'password': 'ResidentPass123!',
            'role': 'resident',
            'phone_number': '0919-555-0301',
            'account_status': 'active'
        },
        {
            'full_name': 'Maria Clara Santos',
            'email': 'maria.santos@gmail.com',
            'username': 'mariaclara',
            'password': 'ResidentPass123!',
            'role': 'resident',
            'phone_number': '0919-555-0302',
            'account_status': 'active'
        }
    ]

    for u in users_data:
        existing = User.query.filter_by(email=u['email']).first()
        if not existing:
            user = User(
                full_name=u['full_name'],
                email=u['email'],
                username=u['username'],
                role=u['role'],
                phone_number=u['phone_number'],
                account_status=u['account_status']
            )
            user.set_password(u['password'])
            db.session.add(user)
            print(f"Created user: {u['email']} [{u['role']}]")

    db.session.commit()

    # 2. Seed Baseline Weekly Collection Schedules for Poblacion Wards 1 to 4
    admin_user = User.query.filter_by(role='admin').first()
    if admin_user and CollectionSchedule.query.count() == 0:
        schedules_data = [
            {
                'service_area': 'Poblacion Ward 1 (Coastal Sector & Caballero St.)',
                'collection_day': 'Monday & Thursday',
                'collection_time': '06:00 AM - 09:00 AM',
                'waste_type': 'Biodegradable & Residual Waste',
                'schedule_notes': 'Primary route covers Caballero St., public market perimeter, and coastal road.'
            },
            {
                'service_area': 'Poblacion Ward 2 (Central Market & Tulay Boundary)',
                'collection_day': 'Tuesday & Friday',
                'collection_time': '06:00 AM - 09:00 AM',
                'waste_type': 'Residual & Recyclable Waste',
                'schedule_notes': 'Route covers Ward 2-Tulay Road and Minglanilla Central Elementary School surroundings.'
            },
            {
                'service_area': 'Poblacion Ward 3 (Town Plaza & Municipal Hall)',
                'collection_day': 'Monday, Wednesday & Saturday',
                'collection_time': '05:30 AM - 08:30 AM',
                'waste_type': 'Commercial & Biodegradable Waste',
                'schedule_notes': 'Covers Municipal Hall, Plaza, Immaculate Heart of Mary Parish Church, and Villordon St.'
            },
            {
                'service_area': 'Poblacion Ward 4 (Highway Commercial Corridor)',
                'collection_day': 'Daily (Monday to Sunday)',
                'collection_time': '08:00 PM - 11:00 PM',
                'waste_type': 'Commercial & Residual Waste',
                'schedule_notes': 'Night collection along Natalio Bacalso National Highway corridor in Poblacion.'
            }
        ]

        for s in schedules_data:
            sched = CollectionSchedule(
                service_area=s['service_area'],
                collection_day=s['collection_day'],
                collection_time=s['collection_time'],
                waste_type=s['waste_type'],
                schedule_notes=s['schedule_notes'],
                created_by_user_id=admin_user.id
            )
            db.session.add(sched)
            print(f"Created schedule: {s['service_area']}")

        db.session.commit()

    print("\nInitialization complete! Database is clean with 0 waste reports, ready for testing.")
    print("Test credentials:")
    print("  Administrator: admin@ecotrack.ph / AdminPass123!")
    print("  Personnel:     collector1@ecotrack.ph / CollectorPass123!")
    print("  Resident:      juan.delacruz@gmail.com / ResidentPass123!")
