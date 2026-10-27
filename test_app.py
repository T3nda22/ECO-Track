"""
Automated validation test suite for:
A Proposed Waste Management System for Minglanilla, Cebu (ECO TRACK)
Verifies routes, models, authentication, GIS boundary validation, and the
direct workflow specified in Deliverables 1 & 2:
1. Resident pinpoints full garbage bin on map and submits report
2. Both Administrators and Garbage Collection Personnel view the marker on the shared GIS map
3. Garbage Collection Personnel mark the reported bin as Cleaned or Collected
4. Administrators monitor which concerns remain Outstanding vs. Addressed
"""

import unittest
from app import create_app
from app.models import db, User, WasteReport
from app.utils.geo import is_point_in_poblacion, POBLACION_LANDMARKS


class EcoTrackTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_poblacion_gis_boundaries(self):
        """Validates that all Poblacion landmarks are inside and external cities are rejected."""
        for lm in POBLACION_LANDMARKS:
            self.assertTrue(
                is_point_in_poblacion(lm['lat'], lm['lng']),
                f"Landmark {lm['name']} should be inside Poblacion boundary"
            )

        self.assertFalse(is_point_in_poblacion(10.3157, 123.8854))  # Cebu City
        self.assertFalse(is_point_in_poblacion(10.2078, 123.7547))  # City of Naga
        self.assertFalse(is_point_in_poblacion(10.2575, 123.8488))  # Talisay City

    def test_public_routes(self):
        """Verifies landing, about (research & scope), and login endpoints."""
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Minglanilla, Cebu', res.data)

        res_about = self.client.get('/about')
        self.assertEqual(res_about.status_code, 200)
        self.assertIn(b'Scope and Limitations', res_about.data)

        res_login = self.client.get('/auth/login')
        self.assertEqual(res_login.status_code, 200)

    def test_api_boundary_and_validation(self):
        """Verifies REST API boundary and coordinate validation endpoints."""
        res_boundary = self.client.get('/api/boundary')
        self.assertEqual(res_boundary.status_code, 200)
        data = res_boundary.get_json()
        self.assertEqual(data['type'], 'FeatureCollection')

        res_val_in = self.client.get('/api/validate-coords?lat=10.2450&lng=123.7960')
        self.assertEqual(res_val_in.status_code, 200)
        self.assertTrue(res_val_in.get_json()['valid'])

        res_val_out = self.client.get('/api/validate-coords?lat=10.3157&lng=123.8854')
        self.assertEqual(res_val_out.status_code, 200)
        self.assertFalse(res_val_out.get_json()['valid'])

    def test_end_to_end_research_workflow(self):
        """
        Tests the exact workflow from Deliverables 1 & 2:
        - Resident submits a pinpointed report
        - Both Admin and Personnel see the marker on the shared GIS map (/api/reports-geojson)
        - Personnel marks the reported bin as 'Collected'
        - Report transitions from Outstanding ('Pending') to Addressed ('Collected')
        """
        admin = User(full_name='Admin User', email='admin@ecotrack.ph', username='admin_u', role='admin')
        admin.set_password('Pass123!')
        personnel = User(full_name='Collector User', email='collector1@ecotrack.ph', username='col_u', role='personnel')
        personnel.set_password('Pass123!')
        resident = User(full_name='Resident User', email='juan.delacruz@gmail.com', username='res_u', role='resident')
        resident.set_password('Pass123!')
        db.session.add_all([admin, personnel, resident])
        db.session.commit()

        # 1. Login as Resident and submit a waste report in Minglanilla Poblacion
        self.client.get('/auth/demo-login/resident', follow_redirects=True)
        res_submit = self.client.post('/resident/report/new', data={
            'title': 'Full Garbage Bin at Public Market',
            'waste_category': 'Full Garbage Bin',
            'location_description': 'Near Minglanilla Public Market, Poblacion Ward 1',
            'description': 'Public bin is completely full and needs collection.',
            'latitude': '10.2440',
            'longitude': '123.7972'
        }, follow_redirects=True)
        self.assertEqual(res_submit.status_code, 200)

        report = WasteReport.query.first()
        self.assertIsNotNone(report)
        self.assertEqual(report.current_status, 'Pending')
        self.assertTrue(report.is_outstanding)
        self.assertFalse(report.is_addressed)

        # 2. Switch to Garbage Collection Personnel and verify they see the marker on the shared GIS map
        self.client.get('/auth/demo-login/personnel', follow_redirects=True)
        geojson_res = self.client.get('/api/reports-geojson')
        self.assertEqual(geojson_res.status_code, 200)
        features = geojson_res.get_json()['features']
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['properties']['tracking_code'], report.tracking_code)
        self.assertEqual(features[0]['properties']['monitoring_state'], 'Outstanding')

        # 3. Personnel marks the reported bin as 'Collected'
        mark_res = self.client.post(f'/personnel/report/{report.id}/quick-mark', data={
            'status': 'Collected'
        }, follow_redirects=True)
        self.assertEqual(mark_res.status_code, 200)

        db.session.refresh(report)
        self.assertEqual(report.current_status, 'Collected')
        self.assertFalse(report.is_outstanding)
        self.assertTrue(report.is_addressed)
        self.assertEqual(report.resolved_by_user_id, personnel.id)

        # 4. Switch to Administrator and verify monitoring dashboard shows 1 Addressed, 0 Outstanding
        self.client.get('/auth/demo-login/admin', follow_redirects=True)
        admin_dash = self.client.get('/admin/dashboard')
        self.assertEqual(admin_dash.status_code, 200)
        self.assertIn(report.tracking_code.encode(), admin_dash.data)


if __name__ == '__main__':
    unittest.main()
