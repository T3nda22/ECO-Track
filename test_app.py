"""
Automated validation test suite for ECO TRACK: Poblacion, Minglanilla, Cebu.
Verifies routes, models, authentication, and GIS point-in-polygon boundary rules.
"""

import unittest
from app import create_app
from app.models import db, User, WasteReport, TaskAssignment, CollectionSchedule
from app.utils.geo import is_point_in_poblacion, POBLACION_LANDMARKS


class EcoTrackTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_poblacion_gis_boundaries(self):
        """Validates that all Poblacion landmarks are strictly inside and outside cities are rejected."""
        for lm in POBLACION_LANDMARKS:
            self.assertTrue(
                is_point_in_poblacion(lm['lat'], lm['lng']),
                f"Landmark {lm['name']} should be inside Poblacion boundary"
            )

        # External points should be rejected
        self.assertFalse(is_point_in_poblacion(10.3157, 123.8854))  # Cebu City
        self.assertFalse(is_point_in_poblacion(10.2078, 123.7547))  # City of Naga
        self.assertFalse(is_point_in_poblacion(10.2575, 123.8488))  # Talisay City

    def test_public_routes(self):
        """Verifies landing, schedules, about, and login endpoints."""
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'ECO TRACK', res.data)
        self.assertIn(b'Poblacion, Minglanilla', res.data)

        res_sched = self.client.get('/schedules')
        self.assertEqual(res_sched.status_code, 200)

        res_about = self.client.get('/about')
        self.assertEqual(res_about.status_code, 200)

        res_login = self.client.get('/auth/login')
        self.assertEqual(res_login.status_code, 200)

    def test_api_boundary_and_validation(self):
        """Verifies REST API boundary and coordinate validation endpoints."""
        # Boundary GeoJSON
        res_boundary = self.client.get('/api/boundary')
        self.assertEqual(res_boundary.status_code, 200)
        data = res_boundary.get_json()
        self.assertEqual(data['type'], 'FeatureCollection')

        # Inside Poblacion point (Town Plaza)
        res_val_in = self.client.get('/api/validate-coords?lat=10.2450&lng=123.7960')
        self.assertEqual(res_val_in.status_code, 200)
        self.assertTrue(res_val_in.get_json()['valid'])

        # Outside Poblacion point (Cebu City)
        res_val_out = self.client.get('/api/validate-coords?lat=10.3157&lng=123.8854')
        self.assertEqual(res_val_out.status_code, 200)
        self.assertFalse(res_val_out.get_json()['valid'])

    def test_clean_start_zero_reports(self):
        """Verifies database starts clean with 0 dummy reports as instructed by user."""
        self.assertEqual(WasteReport.query.count(), 0)
        self.assertEqual(TaskAssignment.query.count(), 0)

    def test_user_roles(self):
        """Verifies user creation and role properties."""
        admin = User(full_name='Admin User', email='admin@test.com', username='admin_test', role='admin')
        admin.set_password('Secret123!')
        personnel = User(full_name='Collector User', email='col@test.com', username='col_test', role='personnel')
        personnel.set_password('Secret123!')
        resident = User(full_name='Resident User', email='res@test.com', username='res_test', role='resident')
        resident.set_password('Secret123!')

        db.session.add_all([admin, personnel, resident])
        db.session.commit()

        self.assertTrue(admin.is_admin)
        self.assertFalse(admin.is_resident)
        self.assertTrue(personnel.is_personnel)
        self.assertTrue(resident.is_resident)
        self.assertTrue(admin.check_password('Secret123!'))


if __name__ == '__main__':
    unittest.main()
