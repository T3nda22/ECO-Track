"""
Database initialization and user account seeding for:
A Proposed Waste Management System for Minglanilla, Cebu (ECO TRACK)
Piloted in Barangay Poblacion, Minglanilla, Cebu.
"""

from app import create_app
from app.models import db, User

app = create_app('development')

with app.app_context():
    # Recreate database tables cleanly to match the research paper schema
    db.drop_all()
    db.create_all()

    # Seed System Users for the 3 Roles (Administrator, Garbage Collection Personnel, Resident)
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

    print("\nDatabase initialized and aligned with Deliverables 1 & 2!")
    print("Test credentials:")
    print("  Administrator: admin@ecotrack.ph / AdminPass123!")
    print("  Personnel:     collector1@ecotrack.ph / CollectorPass123!")
    print("  Resident:      juan.delacruz@gmail.com / ResidentPass123!")
