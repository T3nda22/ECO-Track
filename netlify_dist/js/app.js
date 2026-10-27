/**
 * ECO TRACK — Complete Client-Side Web & GIS Application for Netlify
 * A Proposed Waste Management System for Minglanilla, Cebu
 * Pilot Area: Barangay Poblacion (Wards 1–4), Minglanilla, Cebu, Philippines
 */

const POBLACION_POLYGON = [
    [10.2520, 123.7935],
    [10.2545, 123.7982],
    [10.2512, 123.8038],
    [10.2455, 123.8050],
    [10.2392, 123.8015],
    [10.2360, 123.7940],
    [10.2390, 123.7895],
    [10.2465, 123.7890],
    [10.2520, 123.7935]
];

const BBOX = {
    min_lat: 10.2350,
    max_lat: 10.2560,
    min_lng: 123.7870,
    max_lng: 123.8065
};

const POBLACION_LANDMARKS = [
    { name: 'Minglanilla Municipal Hall', lat: 10.2458, lng: 123.7968, zone: 'Poblacion Ward 3' },
    { name: 'Immaculate Heart of Mary Parish Church', lat: 10.2452, lng: 123.7963, zone: 'Poblacion Ward 3' },
    { name: 'Minglanilla Public Market', lat: 10.2440, lng: 123.7972, zone: 'Poblacion Ward 1' },
    { name: 'Minglanilla Central Elementary School', lat: 10.2435, lng: 123.7955, zone: 'Poblacion Ward 2' },
    { name: 'Poblacion Ward 1 Barangay Hall (Caballero St.)', lat: 10.2445, lng: 123.7980, zone: 'Poblacion Ward 1' },
    { name: 'Poblacion Ward 2 Barangay Hall (Ward 2-Tulay Rd)', lat: 10.2430, lng: 123.7940, zone: 'Poblacion Ward 2' },
    { name: 'Poblacion Ward 3 Barangay Hall (Villordon St.)', lat: 10.2461, lng: 123.7963, zone: 'Poblacion Ward 3' },
    { name: 'Poblacion Ward 4 Barangay Hall', lat: 10.2466, lng: 123.7941, zone: 'Poblacion Ward 4' }
];

const WASTE_CATEGORIES = [
    'Full Garbage Bin',
    'Overflowing Bin',
    'Uncollected Garbage',
    'Bins Needing Cleaning',
    'Scattered Waste',
    'Other Waste Concern'
];

function isPointInPoblacion(lat, lng) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat) || isNaN(lng)) return false;

    if (!(BBOX.min_lat <= lat && lat <= BBOX.max_lat && BBOX.min_lng <= lng && lng <= BBOX.max_lng)) {
        return false;
    }

    const polygon = POBLACION_POLYGON;
    const n = polygon.length;
    let inside = false;
    let [p1_lat, p1_lng] = polygon[0];

    for (let i = 1; i <= n; i++) {
        const [p2_lat, p2_lng] = polygon[i % n];
        if (Math.min(p1_lat, p2_lat) < lat && lat <= Math.max(p1_lat, p2_lat)) {
            if (lng <= Math.max(p1_lng, p2_lng)) {
                let x_intersection = p1_lng;
                if (p1_lat !== p2_lat) {
                    x_intersection = (lat - p1_lat) * (p2_lng - p1_lng) / (p2_lat - p1_lat) + p1_lng;
                }
                if (p1_lng === p2_lng || lng <= x_intersection) {
                    inside = !inside;
                }
            }
        }
        p1_lat = p2_lat;
        p1_lng = p2_lng;
    }
    return inside;
}

function getPoblacionGeoJSON() {
    const coordinates = POBLACION_POLYGON.map(([lat, lng]) => [lng, lat]);
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {
                    name: 'Barangay Poblacion, Minglanilla, Cebu',
                    wards: 'Wards 1, 2, 3, and 4',
                    status: 'Designated Service Boundary (Approximate until LGU verification)',
                    municipality: 'Minglanilla',
                    province: 'Cebu',
                    country: 'Philippines'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                }
            }
        ]
    };
}

function formatDateTime(isoStr) {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
}

function statusBadgeClass(status) {
    const mapping = {
        'Pending': 'badge-status-pending',
        'Collected': 'badge-status-completed',
        'Cleaned': 'badge-status-collected'
    };
    return mapping[status] || 'bg-secondary';
}

function monitoringStateLabel(status) {
    return (status === 'Collected' || status === 'Cleaned') ? 'Addressed' : 'Outstanding';
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ==========================================================================
   Persistent Client-Side Database (localStorage)
   ========================================================================== */
const EcoStore = (function () {
    const STORAGE_KEY = 'ecotrack_minglanilla_db_v1';

    const DEFAULT_USERS = [
        {
            id: 1,
            full_name: 'Engr. Roberto Alcantara',
            email: 'admin@ecotrack.ph',
            username: 'admin',
            password: 'AdminPass123!',
            role: 'admin',
            phone_number: '0917-555-0100',
            account_status: 'active',
            created_at: '2026-10-01T08:00:00.000Z'
        },
        {
            id: 2,
            full_name: 'Danilo Santos',
            email: 'collector1@ecotrack.ph',
            username: 'danilo_collector',
            password: 'CollectorPass123!',
            role: 'personnel',
            phone_number: '0918-555-0201',
            account_status: 'active',
            created_at: '2026-10-01T08:05:00.000Z'
        },
        {
            id: 3,
            full_name: 'Ramon Fernandez',
            email: 'collector2@ecotrack.ph',
            username: 'ramon_collector',
            password: 'CollectorPass123!',
            role: 'personnel',
            phone_number: '0918-555-0202',
            account_status: 'active',
            created_at: '2026-10-01T08:10:00.000Z'
        },
        {
            id: 4,
            full_name: 'Juan Dela Cruz',
            email: 'juan.delacruz@gmail.com',
            username: 'juandc',
            password: 'ResidentPass123!',
            role: 'resident',
            phone_number: '0919-555-0301',
            account_status: 'active',
            created_at: '2026-10-01T08:15:00.000Z'
        },
        {
            id: 5,
            full_name: 'Maria Clara Santos',
            email: 'maria.santos@gmail.com',
            username: 'mariaclara',
            password: 'ResidentPass123!',
            role: 'resident',
            phone_number: '0919-555-0302',
            account_status: 'active',
            created_at: '2026-10-01T08:20:00.000Z'
        }
    ];

    function getInitialState() {
        return {
            users: JSON.parse(JSON.stringify(DEFAULT_USERS)),
            reports: [],
            history: [],
            notifications: [],
            currentUserId: null
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const init = getInitialState();
                save(init);
                return init;
            }
            return JSON.parse(raw);
        } catch (e) {
            return getInitialState();
        }
    }

    function save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Could not save state to localStorage:', e);
        }
    }

    function resetAll() {
        const init = getInitialState();
        save(init);
        return init;
    }

    function getCurrentUser() {
        const state = load();
        if (!state.currentUserId) return null;
        return state.users.find(u => u.id === state.currentUserId) || null;
    }

    function setCurrentUser(userId) {
        const state = load();
        state.currentUserId = userId;
        save(state);
    }

    function getUserById(id) {
        const state = load();
        return state.users.find(u => u.id === Number(id)) || null;
    }

    function enrichReport(r, state) {
        const resident = state.users.find(u => u.id === r.resident_id) || { full_name: 'Resident', email: '', phone_number: '' };
        const resolved_by = r.resolved_by_id ? (state.users.find(u => u.id === r.resolved_by_id) || null) : null;
        const is_outstanding = r.current_status === 'Pending';
        const is_addressed = r.current_status === 'Collected' || r.current_status === 'Cleaned';
        const status_history = state.history
            .filter(h => h.report_id === r.id)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(h => ({
                ...h,
                updated_by: state.users.find(u => u.id === h.updated_by_id) || { full_name: 'System User', role: 'user' }
            }));

        return {
            ...r,
            resident,
            resolved_by,
            is_outstanding,
            is_addressed,
            monitoring_state_label: is_addressed ? 'Addressed' : 'Outstanding',
            status_history
        };
    }

    function getReports() {
        const state = load();
        return state.reports
            .slice()
            .sort((a, b) => new Date(b.submission_timestamp) - new Date(a.submission_timestamp))
            .map(r => enrichReport(r, state));
    }

    function getReportById(id) {
        const state = load();
        const r = state.reports.find(item => item.id === Number(id));
        if (!r) return null;
        return enrichReport(r, state);
    }

    function createReport({ resident_id, title, description, waste_category, location_description, latitude, longitude, photo_data_url }) {
        const state = load();
        const nextId = state.reports.length > 0 ? Math.max(...state.reports.map(r => r.id)) + 1 : 1;
        const now = new Date().toISOString();
        const dateStr = now.slice(0, 10).replace(/-/g, '');
        const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
        const tracking_code = `ECO-${dateStr}-${randomHex}`;

        const newReport = {
            id: nextId,
            tracking_code,
            resident_id,
            title,
            description: description || 'Reported full garbage bin requiring collection or cleaning.',
            waste_category,
            location_description,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            photo_data_url: photo_data_url || null,
            current_status: 'Pending',
            resolved_by_id: null,
            collection_proof_photo: null,
            collection_notes: null,
            submission_timestamp: now,
            last_updated_timestamp: now,
            resolved_timestamp: null
        };

        state.reports.push(newReport);

        const nextHistoryId = state.history.length > 0 ? Math.max(...state.history.map(h => h.id)) + 1 : 1;
        state.history.push({
            id: nextHistoryId,
            report_id: nextId,
            updated_by_id: resident_id,
            previous_status: 'None',
            new_status: 'Pending',
            note: 'Resident pinpointed bin location on the GIS map and submitted waste report.',
            timestamp: now
        });

        const nextNotifId = state.notifications.length > 0 ? Math.max(...state.notifications.map(n => n.id)) + 1 : 1;
        state.notifications.push({
            id: nextNotifId,
            user_id: resident_id,
            related_report_id: nextId,
            title: `Report Submitted (${tracking_code})`,
            notification_message: `Your report at ${location_description} has been recorded and is now visible on the shared GIS map for Minglanilla collection personnel.`,
            is_read: false,
            created_timestamp: now
        });

        save(state);
        return enrichReport(newReport, state);
    }

    function updateReportStatus({ report_id, personnel_id, new_status, notes, proof_photo_data_url }) {
        const state = load();
        const r = state.reports.find(item => item.id === Number(report_id));
        if (!r) return null;

        const prevStatus = r.current_status;
        const now = new Date().toISOString();
        const personnel = state.users.find(u => u.id === Number(personnel_id)) || { full_name: 'Personnel' };

        r.current_status = new_status;
        r.resolved_by_id = Number(personnel_id);
        r.resolved_timestamp = now;
        r.last_updated_timestamp = now;
        if (notes) r.collection_notes = notes;
        if (proof_photo_data_url) r.collection_proof_photo = proof_photo_data_url;

        const nextHistoryId = state.history.length > 0 ? Math.max(...state.history.map(h => h.id)) + 1 : 1;
        state.history.push({
            id: nextHistoryId,
            report_id: r.id,
            updated_by_id: Number(personnel_id),
            previous_status: prevStatus,
            new_status: new_status,
            note: notes || `Garbage collection personnel marked the reported bin as ${new_status}.`,
            timestamp: now
        });

        const nextNotifId = state.notifications.length > 0 ? Math.max(...state.notifications.map(n => n.id)) + 1 : 1;
        state.notifications.push({
            id: nextNotifId,
            user_id: r.resident_id,
            related_report_id: r.id,
            title: `Bin Marked as ${new_status} (${r.tracking_code})`,
            notification_message: `Your reported bin at ${r.location_description} has been marked as ${new_status} by garbage collection personnel (${personnel.full_name}).`,
            is_read: false,
            created_timestamp: now
        });

        save(state);
        return enrichReport(r, state);
    }

    function getNotificationsForUser(userId) {
        const state = load();
        return state.notifications
            .filter(n => n.user_id === Number(userId))
            .sort((a, b) => new Date(b.created_timestamp) - new Date(a.created_timestamp));
    }

    function markNotificationsRead(userId) {
        const state = load();
        state.notifications.forEach(n => {
            if (n.user_id === Number(userId)) {
                n.is_read = true;
            }
        });
        save(state);
    }

    function getAllUsers() {
        const state = load();
        return state.users.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    function createUser({ full_name, email, username, phone_number, password, role }) {
        const state = load();
        const existsEmail = state.users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (existsEmail) return { error: 'Email address is already registered.' };
        const existsUser = state.users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (existsUser) return { error: 'Username is already taken.' };

        const nextId = state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) + 1 : 1;
        const newUser = {
            id: nextId,
            full_name,
            email: email.toLowerCase(),
            username,
            password,
            role: role || 'resident',
            phone_number,
            account_status: 'active',
            created_at: new Date().toISOString()
        };
        state.users.push(newUser);
        save(state);
        return { user: newUser };
    }

    function toggleUserStatus(userId) {
        const state = load();
        const u = state.users.find(item => item.id === Number(userId));
        if (!u) return null;
        u.account_status = u.account_status === 'active' ? 'suspended' : 'active';
        save(state);
        return u;
    }

    function getAuditHistory() {
        const state = load();
        return state.history
            .slice()
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(h => ({
                ...h,
                report: state.reports.find(r => r.id === h.report_id) || null,
                updated_by: state.users.find(u => u.id === h.updated_by_id) || { full_name: 'User', role: 'resident' }
            }));
    }

    function seedSampleReports() {
        const state = load();
        if (state.reports.length > 0) return;
        const samples = [
            {
                resident_id: 4,
                title: 'Full Garbage Bin In Need of Collection',
                description: 'Public waste bin at the market entrance is completely full and needs collection.',
                waste_category: 'Full Garbage Bin',
                location_description: 'Near Minglanilla Public Market, Poblacion Ward 1',
                latitude: 10.2440,
                longitude: 123.7972
            },
            {
                resident_id: 5,
                title: 'Overflowing Garbage Bin',
                description: 'Plastic waste and packaging overflowing from roadside bin near the plaza.',
                waste_category: 'Overflowing Bin',
                location_description: 'Near Immaculate Heart of Mary Parish Church, Poblacion Ward 3',
                latitude: 10.2452,
                longitude: 123.7963
            },
            {
                resident_id: 4,
                title: 'Garbage Bin In Need of Cleaning',
                description: 'Bin outside elementary school gate needs cleaning and sanitization.',
                waste_category: 'Bins Needing Cleaning',
                location_description: 'Minglanilla Central Elementary School, Poblacion Ward 2',
                latitude: 10.2435,
                longitude: 123.7955
            }
        ];

        samples.forEach(s => createReport(s));
        // Mark the 3rd sample as Cleaned by Danilo Santos
        const latestState = load();
        if (latestState.reports.length >= 3) {
            updateReportStatus({
                report_id: latestState.reports[2].id,
                personnel_id: 2,
                new_status: 'Cleaned',
                notes: 'Bin emptied, washed, and surrounding sidewalk swept clean.'
            });
        }
    }

    return {
        load,
        save,
        resetAll,
        getCurrentUser,
        setCurrentUser,
        getUserById,
        getReports,
        getReportById,
        createReport,
        updateReportStatus,
        getNotificationsForUser,
        markNotificationsRead,
        getAllUsers,
        createUser,
        toggleUserStatus,
        getAuditHistory,
        seedSampleReports
    };
})();

/* ==========================================================================
   Leaflet GIS Mapping Engine (Client-Side)
   ========================================================================== */
const EcoGIS = (function () {
    const POBLACION_CENTER = [10.2450, 123.7960];
    const DEFAULT_ZOOM = 16;

    const STATUS_COLORS = {
        'Pending': '#f59e0b',
        'Collected': '#059669',
        'Cleaned': '#0d9488'
    };

    const STATUS_LABELS = {
        'Pending': 'Pending (Outstanding)',
        'Collected': 'Collected (Addressed)',
        'Cleaned': 'Cleaned (Addressed)'
    };

    function createStatusIcon(status) {
        const color = STATUS_COLORS[status] || '#f59e0b';
        const symbol = status === 'Pending' ? '!' : '✓';
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div style="
                background-color: ${color};
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 2.5px solid #ffffff;
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.28);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: 700;
                font-family: 'Inter', sans-serif;
            ">${symbol}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [0, -13]
        });
    }

    function createBaseMap(containerId, options = {}) {
        const center = options.center || POBLACION_CENTER;
        const zoom = options.zoom || DEFAULT_ZOOM;

        const map = L.map(containerId, {
            center: center,
            zoom: zoom,
            maxZoom: 19,
            minZoom: 13
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Minglanilla Waste Management GIS'
        }).addTo(map);

        return map;
    }

    function addBoundaryLayer(map) {
        const geojson = getPoblacionGeoJSON();
        L.geoJSON(geojson, {
            style: {
                color: '#059669',
                weight: 2,
                dashArray: '6, 6',
                fillColor: '#10b981',
                fillOpacity: 0.08
            },
            onEachFeature: function (feature, layer) {
                layer.bindTooltip(
                    '<strong>Minglanilla Poblacion Pilot Area</strong><br>Barangay Poblacion (Wards 1–4), Minglanilla, Cebu',
                    { sticky: true }
                );
            }
        }).addTo(map);
    }

    function addLegendControl(map) {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-legend-box');
            div.innerHTML = `
                <div class="fw-bold mb-2 pb-1 border-bottom text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.04em; color: #475569;">
                    GIS Marker Legend
                </div>
                ${Object.entries(STATUS_COLORS).map(([status, color]) => `
                    <div class="map-legend-item">
                        <span class="legend-dot" style="background-color: ${color};"></span>
                        <span style="font-size: 0.75rem; color: #1e293b;">${STATUS_LABELS[status] || status}</span>
                    </div>
                `).join('')}
                <div class="mt-2 pt-1 border-top text-secondary" style="font-size: 0.68rem;">
                    Dashed border: Minglanilla Poblacion
                </div>
            `;
            return div;
        };
        legend.addTo(map);
    }

    function initReportPickerMap(containerId, latInputId, lngInputId, previewContainerId, submitBtnId) {
        const map = createBaseMap(containerId);
        addBoundaryLayer(map);

        let marker = null;
        const latInput = document.getElementById(latInputId);
        const lngInput = document.getElementById(lngInputId);
        const previewEl = document.getElementById(previewContainerId);
        const submitBtn = document.getElementById(submitBtnId);

        function updateCoordinates(lat, lng) {
            lat = parseFloat(lat.toFixed(6));
            lng = parseFloat(lng.toFixed(6));

            latInput.value = lat;
            lngInput.value = lng;

            const valid = isPointInPoblacion(lat, lng);
            if (previewEl) {
                if (valid) {
                    previewEl.className = 'coordinate-preview-box valid mt-3 text-center';
                    previewEl.innerHTML = `
                        <div class="text-success fw-semibold small mb-1 d-flex align-items-center justify-content-center gap-1">
                            <i class="bi bi-check-circle-fill"></i> <span>Location Pinpointed in Poblacion, Minglanilla</span>
                        </div>
                        <div class="small text-secondary font-monospace">${lat}, ${lng}</div>
                    `;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('btn-secondary');
                        submitBtn.classList.add('btn-brand');
                    }
                } else {
                    previewEl.className = 'coordinate-preview-box invalid mt-3 text-center';
                    previewEl.innerHTML = `
                        <div class="text-danger fw-semibold small mb-1 d-flex align-items-center justify-content-center gap-1">
                            <i class="bi bi-x-circle-fill"></i> <span>Outside Minglanilla Poblacion Pilot Area</span>
                        </div>
                        <div class="small text-danger">Please select a location inside the green dashed boundary on the map.</div>
                    `;
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.classList.remove('btn-brand');
                        submitBtn.classList.add('btn-secondary');
                    }
                }
            }
        }

        function setMarker(lat, lng) {
            if (!marker) {
                const pickerIcon = L.divIcon({
                    className: 'custom-picker-pin',
                    html: `
                        <div style="
                            background-color: #059669;
                            width: 30px;
                            height: 30px;
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 2.5px solid #ffffff;
                            box-shadow: 0 3px 8px rgba(15, 23, 42, 0.35);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: grab;
                        ">
                            <span style="transform: rotate(45deg); width: 8px; height: 8px; background: white; border-radius: 50%;"></span>
                        </div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 30],
                    popupAnchor: [0, -30]
                });

                marker = L.marker([lat, lng], {
                    draggable: true,
                    icon: pickerIcon
                }).addTo(map);

                marker.on('dragend', function (e) {
                    const pos = e.target.getLatLng();
                    updateCoordinates(pos.lat, pos.lng);
                });
            } else {
                marker.setLatLng([lat, lng]);
            }

            map.panTo([lat, lng]);
            updateCoordinates(lat, lng);
        }

        map.on('click', function (e) {
            setMarker(e.latlng.lat, e.latlng.lng);
        });

        return { map, setMarker };
    }

    function initReportsMap(containerId, options = {}) {
        const map = createBaseMap(containerId, options);
        addBoundaryLayer(map);
        addLegendControl(map);

        const markersLayer = L.layerGroup().addTo(map);

        function loadReports(filterStatus = 'all', filterCategory = 'all') {
            markersLayer.clearLayers();
            let reports = EcoStore.getReports();

            if (filterStatus && filterStatus !== 'all') {
                if (filterStatus === 'Outstanding') {
                    reports = reports.filter(r => r.current_status === 'Pending');
                } else if (filterStatus === 'Addressed') {
                    reports = reports.filter(r => r.current_status === 'Collected' || r.current_status === 'Cleaned');
                } else {
                    reports = reports.filter(r => r.current_status === filterStatus);
                }
            }

            if (filterCategory && filterCategory !== 'all') {
                reports = reports.filter(r => r.waste_category === filterCategory);
            }

            reports.forEach(r => {
                const icon = createStatusIcon(r.current_status);
                const marker = L.marker([r.latitude, r.longitude], { icon });

                let photoHtml = '';
                if (r.photo_data_url) {
                    photoHtml = `<div class="mt-2 text-center"><img src="${r.photo_data_url}" class="img-fluid rounded border" style="max-height: 110px; object-fit: cover;" alt="Reported Bin Photo"></div>`;
                }

                let staffDetails = '';
                if (options.role === 'admin' || options.role === 'personnel') {
                    staffDetails += `<div class="small text-secondary"><strong>Reported by:</strong> ${escapeHtml(r.resident.full_name)}</div>`;
                    if (r.resolved_by) {
                        staffDetails += `<div class="small text-success fw-semibold"><strong>${escapeHtml(r.current_status)} by:</strong> ${escapeHtml(r.resolved_by.full_name)} (${formatDateTime(r.resolved_timestamp)})</div>`;
                    }
                }

                let actionBtn = '';
                if (options.role === 'personnel') {
                    if (r.current_status === 'Pending') {
                        actionBtn = `<a href="#/personnel/report/${r.id}" class="btn btn-sm btn-brand w-100 mt-2">Mark Cleaned / Collected</a>`;
                    } else {
                        actionBtn = `<a href="#/personnel/report/${r.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Report Details</a>`;
                    }
                } else if (options.role === 'admin') {
                    actionBtn = `<a href="#/admin/report/${r.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Monitoring Details</a>`;
                } else if (options.role === 'resident') {
                    actionBtn = `<a href="#/resident/report/${r.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Report Status</a>`;
                }

                const statePill = r.current_status === 'Pending'
                    ? `<span class="badge badge-status-pending">Outstanding (${r.current_status})</span>`
                    : `<span class="badge badge-status-completed">Addressed (${r.current_status})</span>`;

                const popupContent = `
                    <div style="min-width: 225px; font-family: 'Inter', system-ui, sans-serif;">
                        <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
                            ${statePill}
                            <small class="text-secondary font-monospace">${escapeHtml(r.tracking_code)}</small>
                        </div>
                        <div class="mb-1 text-dark fw-bold" style="font-size: 0.9rem;">${escapeHtml(r.title)}</div>
                        <div class="small text-secondary mb-1">${escapeHtml(r.waste_category)}</div>
                        <div class="small text-dark mb-1"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                        <div class="small text-secondary mb-1">Submitted: ${formatDateTime(r.submission_timestamp)}</div>
                        ${staffDetails}
                        ${photoHtml}
                        ${actionBtn}
                    </div>
                `;

                marker.bindPopup(popupContent);
                markersLayer.addLayer(marker);
            });
        }

        loadReports(options.initialStatus || 'all', options.initialCategory || 'all');
        return { map, loadReports };
    }

    function initDetailMap(containerId, lat, lng, trackingCode, status) {
        const map = createBaseMap(containerId, { center: [lat, lng], zoom: 17 });
        addBoundaryLayer(map);

        const icon = createStatusIcon(status);
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        const label = STATUS_LABELS[status] || status;
        marker.bindPopup(`<strong>${escapeHtml(trackingCode)}</strong><br>Status: <em>${escapeHtml(label)}</em><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();

        L.circle([lat, lng], {
            color: STATUS_COLORS[status] || '#059669',
            fillColor: STATUS_COLORS[status] || '#059669',
            fillOpacity: 0.14,
            radius: 35
        }).addTo(map);

        return map;
    }

    return {
        initReportPickerMap,
        initReportsMap,
        initDetailMap
    };
})();

/* ==========================================================================
   SPA View Router & UI Controller (EcoApp)
   ========================================================================== */
const EcoApp = (function () {
    let flashMessages = [];

    function flash(message, category = 'success') {
        flashMessages.push({ message, category });
    }

    function navigate(hashPath) {
        if (window.location.hash === hashPath) {
            renderCurrentRoute();
        } else {
            window.location.hash = hashPath;
        }
    }

    function demoLogin(role) {
        const users = EcoStore.getAllUsers();
        const target = users.find(u => u.role === role && u.account_status === 'active');
        if (!target) {
            flash(`No active ${role} account found.`, 'danger');
            navigate('#/login');
            return;
        }
        EcoStore.setCurrentUser(target.id);
        const roleLabels = {
            resident: 'Resident (Community Reporter)',
            personnel: 'Garbage Collection Personnel',
            admin: 'System Administrator'
        };
        flash(`Switched to ${roleLabels[role] || role} view as ${target.full_name}.`, 'info');
        if (role === 'admin') navigate('#/admin/dashboard');
        else if (role === 'personnel') navigate('#/personnel/dashboard');
        else navigate('#/resident/dashboard');
    }

    function logout() {
        EcoStore.setCurrentUser(null);
        flash('You have been logged out.', 'info');
        navigate('#/');
    }

    function renderNavbar(routePath) {
        const user = EcoStore.getCurrentUser();
        const navEl = document.getElementById('appNavbar');
        if (!navEl) return;

        let roleLinks = '';
        if (user) {
            roleLinks += `<li class="nav-item d-none d-lg-block mx-1"><span class="text-secondary opacity-50">|</span></li>`;
            if (user.role === 'resident') {
                roleLinks += `
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/resident/dashboard' ? 'active-nav' : ''}" href="#/resident/dashboard">
                            <i class="bi bi-grid-1x2 me-1"></i>Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath.startsWith('/resident/report') ? 'active-nav' : ''}" href="#/resident/reports">
                            <i class="bi bi-card-list me-1"></i>My Reports
                        </a>
                    </li>
                `;
            } else if (user.role === 'admin') {
                roleLinks += `
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/admin/dashboard' ? 'active-nav' : ''}" href="#/admin/dashboard">
                            <i class="bi bi-grid-1x2 me-1"></i>Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/admin/map' ? 'active-nav' : ''}" href="#/admin/map">
                            <i class="bi bi-pin-map me-1"></i>Monitoring Map
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath.startsWith('/admin/report') ? 'active-nav' : ''}" href="#/admin/reports">
                            <i class="bi bi-list-check me-1"></i>Concerns
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/admin/users' ? 'active-nav' : ''}" href="#/admin/users">
                            <i class="bi bi-people me-1"></i>Accounts
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/admin/audit-log' ? 'active-nav' : ''}" href="#/admin/audit-log">
                            <i class="bi bi-clock-history me-1"></i>Status Log
                        </a>
                    </li>
                `;
            } else if (user.role === 'personnel') {
                roleLinks += `
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/personnel/dashboard' ? 'active-nav' : ''}" href="#/personnel/dashboard">
                            <i class="bi bi-grid-1x2 me-1"></i>Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath === '/personnel/map' ? 'active-nav' : ''}" href="#/personnel/map">
                            <i class="bi bi-pin-map me-1"></i>Shared GIS Map
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${routePath.startsWith('/personnel/tasks') || routePath.startsWith('/personnel/report') ? 'active-nav' : ''}" href="#/personnel/tasks">
                            <i class="bi bi-check2-square me-1"></i>Reported Bins
                        </a>
                    </li>
                `;
            }
        }

        let unreadCount = 0;
        if (user && user.role === 'resident') {
            unreadCount = EcoStore.getNotificationsForUser(user.id).filter(n => !n.is_read).length;
        }

        const reportActionBtn = (!user || user.role === 'resident')
            ? `<a href="${user ? '#/resident/report/new' : '#/login'}" class="btn btn-sm btn-brand d-flex align-items-center gap-1 px-3">
                   <i class="bi bi-plus-lg"></i> <span>Report Full Bin</span>
               </a>`
            : '';

        const notifBtn = (user && user.role === 'resident')
            ? `<a href="#/resident/notifications" class="btn btn-sm btn-outline-light border-secondary position-relative" title="Notifications">
                   <i class="bi bi-bell"></i>
                   ${unreadCount > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.65rem;">${unreadCount}</span>` : ''}
               </a>`
            : '';

        const profileRight = user
            ? `<div class="dropdown">
                   <button class="btn btn-sm btn-outline-light border-secondary dropdown-toggle d-flex align-items-center gap-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                       <i class="bi bi-person-circle"></i>
                       <span>${escapeHtml(user.full_name.split(' ')[0])}</span>
                       <span class="badge bg-secondary bg-opacity-50 text-light ms-1" style="font-size: 0.65rem;">${escapeHtml(user.role.charAt(0).toUpperCase() + user.role.slice(1))}</span>
                   </button>
                   <ul class="dropdown-menu dropdown-menu-end shadow-sm border">
                       <li><span class="dropdown-item-text text-muted small">${escapeHtml(user.email)}</span></li>
                       <li><hr class="dropdown-divider"></li>
                       <li><a class="dropdown-item small text-danger" href="#" onclick="EcoApp.logout(); return false;"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
                   </ul>
               </div>`
            : `<a href="#/login" class="btn btn-sm btn-outline-light border-secondary px-3">Sign In</a>`;

        navEl.innerHTML = `
            <div class="container-fluid app-container">
                <a class="navbar-brand navbar-brand-eco me-4" href="#/">
                    <div class="brand-icon">
                        <i class="bi bi-geo-alt-fill"></i>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="text-white fw-bold fs-5">ECO TRACK</span>
                        <span class="service-area-pill d-none d-sm-inline-block">Minglanilla, Cebu</span>
                    </div>
                </a>

                <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-controls="navbarMain" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="navbarMain">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0 align-items-lg-center gap-1">
                        <li class="nav-item">
                            <a class="nav-link ${routePath === '/' ? 'active-nav' : ''}" href="#/">
                                <i class="bi bi-house-door me-1"></i>Overview
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#/" onclick="setTimeout(() => { const el = document.getElementById('poblacionMapSection'); if(el) el.scrollIntoView({behavior:'smooth'}); }, 80);">
                                <i class="bi bi-map me-1"></i>GIS Map
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${routePath === '/about' ? 'active-nav' : ''}" href="#/about">
                                <i class="bi bi-journal-text me-1"></i>Research &amp; Scope
                            </a>
                        </li>
                        ${roleLinks}
                    </ul>

                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-light border-secondary text-light dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-sliders2 me-1"></i>Switch Role
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border">
                                <li><h6 class="dropdown-header text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.05em;">Quick Role Preview</h6></li>
                                <li><a class="dropdown-item small py-2" href="#" onclick="EcoApp.demoLogin('resident'); return false;"><i class="bi bi-person text-success me-2"></i>Resident (Report Full Bin)</a></li>
                                <li><a class="dropdown-item small py-2" href="#" onclick="EcoApp.demoLogin('personnel'); return false;"><i class="bi bi-truck text-warning me-2"></i>Personnel (Mark Cleaned/Collected)</a></li>
                                <li><a class="dropdown-item small py-2" href="#" onclick="EcoApp.demoLogin('admin'); return false;"><i class="bi bi-shield-check text-primary me-2"></i>Administrator (Monitor Concerns)</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item small py-1 text-secondary" href="#" onclick="EcoApp.loadSampleData(); return false;"><i class="bi bi-database-add me-2"></i>Load Sample Poblacion Reports</a></li>
                                <li><a class="dropdown-item small py-1 text-danger" href="#" onclick="EcoApp.clearAllReports(); return false;"><i class="bi bi-arrow-counterclockwise me-2"></i>Reset / Clear Reports</a></li>
                            </ul>
                        </div>
                        ${reportActionBtn}
                        ${notifBtn}
                        ${profileRight}
                    </div>
                </div>
            </div>
        `;

        // Floating Action Button
        const fabContainer = document.getElementById('appFabContainer');
        if (fabContainer) {
            if (!user || user.role === 'resident') {
                fabContainer.innerHTML = `
                    <a href="${user ? '#/resident/report/new' : '#/login'}" class="fab-report" title="Pinpoint Full Garbage Bin on Map">
                        <i class="bi bi-geo-alt-fill"></i>
                        <span>Report Full Bin</span>
                    </a>
                `;
            } else {
                fabContainer.innerHTML = '';
            }
        }
    }

    function renderFlashMessages() {
        const container = document.getElementById('appFlashContainer');
        if (!container) return;
        if (flashMessages.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = flashMessages.map(f => {
            let icon = '<i class="bi bi-info-circle-fill text-primary"></i>';
            if (f.category === 'success') icon = '<i class="bi bi-check-circle-fill text-success"></i>';
            else if (f.category === 'danger') icon = '<i class="bi bi-exclamation-triangle-fill text-danger"></i>';
            else if (f.category === 'warning') icon = '<i class="bi bi-exclamation-circle-fill text-warning"></i>';

            return `
                <div class="alert alert-${f.category} alert-dismissible fade show border shadow-xs d-flex align-items-center gap-2 py-2 px-3 rounded-3" role="alert">
                    ${icon}
                    <div class="flex-grow-1 small fw-medium">${escapeHtml(f.message)}</div>
                    <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }).join('');
        flashMessages = [];
    }

    function loadSampleData() {
        EcoStore.seedSampleReports();
        flash('Sample Minglanilla Poblacion waste reports loaded onto the GIS map.', 'success');
        renderCurrentRoute();
    }

    function clearAllReports() {
        const currentUser = EcoStore.getCurrentUser();
        EcoStore.resetAll();
        if (currentUser) EcoStore.setCurrentUser(currentUser.id);
        flash('All waste reports cleared.', 'info');
        renderCurrentRoute();
    }

    /* ----------------------------------------------------------------------
       View 1: Overview / Landing Page (#/)
       ---------------------------------------------------------------------- */
    function viewLanding(mainEl) {
        const user = EcoStore.getCurrentUser();
        const reports = EcoStore.getReports();
        const total_reports = reports.length;
        const outstanding_reports = reports.filter(r => r.is_outstanding).length;
        const addressed_reports = reports.filter(r => r.is_addressed).length;

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="page-header-banner p-4 p-lg-5">
                        <div class="row align-items-center g-4">
                            <div class="col-lg-7">
                                <div class="eyebrow-badge mb-3">
                                    <i class="bi bi-geo-alt-fill"></i>
                                    <span>Minglanilla, Cebu &bull; Poblacion Pilot Area</span>
                                </div>
                                <h1 class="display-6 fw-bold mb-3" style="line-height: 1.2;">
                                    Community Waste Reporting &amp; GIS Monitoring System
                                </h1>
                                <p class="text-secondary mb-4" style="font-size: 1.025rem; max-width: 620px;">
                                    Residents pinpoint full or overflowing garbage bins on an interactive map, garbage collection personnel view markers and mark bins as cleaned or collected, and administrators monitor outstanding and addressed concerns.
                                </p>
                                <div class="d-flex flex-wrap gap-2">
                                    ${user && user.role === 'resident'
                                        ? `<a href="#/resident/report/new" class="btn btn-brand btn-lg d-inline-flex align-items-center gap-2"><i class="bi bi-geo-alt-fill"></i> <span>Pinpoint Full Bin on Map</span></a>`
                                        : `<a href="#" onclick="EcoApp.demoLogin('resident'); return false;" class="btn btn-brand btn-lg d-inline-flex align-items-center gap-2"><i class="bi bi-geo-alt-fill"></i> <span>Report a Full Bin</span></a>`
                                    }
                                    <a href="#poblacionMapSection" onclick="document.getElementById('poblacionMapSection').scrollIntoView({behavior:'smooth'}); return false;" class="btn btn-outline-secondary btn-lg d-inline-flex align-items-center gap-2">
                                        <i class="bi bi-map"></i> <span>Explore GIS Map</span>
                                    </a>
                                </div>
                            </div>

                            <div class="col-lg-5">
                                <div class="p-4 rounded-4 bg-light border">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <span class="small fw-semibold text-uppercase text-secondary" style="letter-spacing: 0.04em;">Live Operational Overview</span>
                                        <span class="badge bg-white text-secondary border">Minglanilla Poblacion</span>
                                    </div>
                                    <div class="row g-3">
                                        <div class="col-4">
                                            <div class="p-3 bg-white rounded-3 border text-center">
                                                <div class="kpi-value text-warning mb-1">${outstanding_reports}</div>
                                                <div class="small fw-semibold text-secondary">Outstanding</div>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="p-3 bg-white rounded-3 border text-center">
                                                <div class="kpi-value text-success mb-1">${addressed_reports}</div>
                                                <div class="small fw-semibold text-secondary">Addressed</div>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="p-3 bg-white rounded-3 border text-center">
                                                <div class="kpi-value text-dark mb-1">${total_reports}</div>
                                                <div class="small fw-semibold text-secondary">Total Reports</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center small text-secondary">
                                        <span><i class="bi bi-layers me-1"></i>Software-only citizen GIS reporting</span>
                                        <a href="#/about" class="text-decoration-none fw-semibold text-success">View Research Scope &rarr;</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="action-hero-card">
                        <div>
                            <div class="kpi-icon-box emerald mb-3">
                                <i class="bi bi-geo-alt-fill"></i>
                            </div>
                            <h2 class="h5 fw-bold mb-2">1. Residents &amp; Community</h2>
                            <p class="text-secondary small mb-4">
                                Pinpoint on the map the exact location of garbage bins that are full and in need of cleaning or collection, and attach a photo.
                            </p>
                        </div>
                        <div>
                            ${user && user.role === 'resident'
                                ? `<a href="#/resident/report/new" class="btn btn-brand w-100 d-flex align-items-center justify-content-center gap-2"><span>Pinpoint Full Bin</span> <i class="bi bi-arrow-right"></i></a>`
                                : `<a href="#" onclick="EcoApp.demoLogin('resident'); return false;" class="btn btn-brand w-100 d-flex align-items-center justify-content-center gap-2"><span>Open Resident Portal</span> <i class="bi bi-arrow-right"></i></a>`
                            }
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="action-hero-card">
                        <div>
                            <div class="kpi-icon-box amber mb-3">
                                <i class="bi bi-truck"></i>
                            </div>
                            <h2 class="h5 fw-bold mb-2">2. Collection Personnel</h2>
                            <p class="text-secondary small mb-4">
                                View submitted reports as markers on the shared GIS map and update report status to mark bins as <strong>Cleaned</strong> or <strong>Collected</strong>.
                            </p>
                        </div>
                        <div>
                            ${user && user.role === 'personnel'
                                ? `<a href="#/personnel/map" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"><span>Open Personnel GIS Map</span> <i class="bi bi-arrow-right"></i></a>`
                                : `<a href="#" onclick="EcoApp.demoLogin('personnel'); return false;" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"><span>Open Personnel Portal</span> <i class="bi bi-arrow-right"></i></a>`
                            }
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="action-hero-card">
                        <div>
                            <div class="kpi-icon-box blue mb-3">
                                <i class="bi bi-bar-chart-line"></i>
                            </div>
                            <h2 class="h5 fw-bold mb-2">3. System Administrators</h2>
                            <p class="text-secondary small mb-4">
                                View reported bins on the same GIS-based map and monitor which waste concerns have been <strong>Addressed</strong> and which remain <strong>Outstanding</strong>.
                            </p>
                        </div>
                        <div>
                            ${user && user.role === 'admin'
                                ? `<a href="#/admin/dashboard" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"><span>Open Monitoring Dashboard</span> <i class="bi bi-arrow-right"></i></a>`
                                : `<a href="#" onclick="EcoApp.demoLogin('admin'); return false;" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"><span>Open Admin Monitoring</span> <i class="bi bi-arrow-right"></i></a>`
                            }
                        </div>
                    </div>
                </div>

                <div class="col-12" id="poblacionMapSection">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                            <div>
                                <h2 class="h5 fw-bold mb-1">GIS-Based Waste Monitoring Map</h2>
                                <div class="text-secondary small">
                                    Viewing reported garbage bins across <strong>Barangay Poblacion (Wards 1–4), Minglanilla, Cebu</strong>.
                                </div>
                            </div>
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <span class="badge badge-status-pending">● Outstanding (Pending): ${outstanding_reports}</span>
                                <span class="badge badge-status-completed">✓ Addressed (Cleaned / Collected): ${addressed_reports}</span>
                            </div>
                        </div>

                        <div id="landingPublicMap" class="eco-map-container"></div>

                        <div class="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top small text-secondary">
                            <div>
                                <i class="bi bi-geo-alt text-success me-1"></i>
                                <strong>Piloting Scope:</strong> Barangay Poblacion inside the Municipality of Minglanilla, Cebu.
                            </div>
                            <div>OpenStreetMap &amp; Leaflet GIS</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initReportsMap('landingPublicMap', {
            initialStatus: 'all',
            role: user ? user.role : 'public'
        });
    }

    /* ----------------------------------------------------------------------
       View 2: Research & Scope (#/about)
       ---------------------------------------------------------------------- */
    function viewAbout(mainEl) {
        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-lg-8">
                    <div class="eco-card p-4 mb-4">
                        <div class="eyebrow-badge mb-3">
                            <i class="bi bi-journal-bookmark-fill"></i>
                            <span>Deliverable No. 1 &amp; Deliverable No. 2</span>
                        </div>
                        <h1 class="h3 fw-bold mb-2">A Proposed Waste Management System for Minglanilla, Cebu</h1>
                        <p class="text-secondary small mb-3">
                            Community Reporting System with Geographic Information System (GIS) Visualization &bull; Piloted in Minglanilla Poblacion
                        </p>
                        <p class="text-secondary small mb-4">
                            In Minglanilla, Cebu, effective waste management requires timely information about the location and condition of waste bins and areas that require waste collection. This system computerizes and improves the process of reporting, locating, monitoring, and managing waste collection concerns using <strong>Geographic Information System (GIS)</strong> technology.
                        </p>

                        <h2 class="h5 fw-bold mb-3 pb-2 border-bottom">Review of Related Literature &amp; Synthesis</h2>
                        <p class="small text-secondary mb-3">
                            The proposed system draws on three proven strands from local and foreign studies while removing dedicated hardware dependencies (such as RFID readers, GSM modules, and IoT sensors) that a barangay may not be able to procure, install, and sustain:
                        </p>
                        <div class="row g-3 small mb-4">
                            <div class="col-md-6">
                                <div class="p-3 border rounded-3 bg-light h-100">
                                    <div class="fw-bold text-dark mb-1">Adriatico &amp; Javellana (2017) — Local</div>
                                    <div class="text-secondary">Demonstrated that geotagging pickup points and tracking garbage bin status on a web and mobile platform is feasible and acceptable in a Philippine barangay setting.</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-3 border rounded-3 bg-light h-100">
                                    <div class="fw-bold text-dark mb-1">Alvarico, Arricivita, &amp; Cruz (2024) — Local</div>
                                    <div class="text-secondary">Showed how web map visualization and location-based notifications help residents and collection personnel coordinate around waste collection.</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-3 border rounded-3 bg-light h-100">
                                    <div class="fw-bold text-dark mb-1">Arebey et al. (2009) — Foreign</div>
                                    <div class="text-secondary">Integrated GIS to monitor solid waste collection operations from end to end in real time.</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-3 border rounded-3 bg-light h-100">
                                    <div class="fw-bold text-dark mb-1">Draz et al. (2017) — Foreign</div>
                                    <div class="text-secondary">Established that monitoring bin status and GPS coordinates and alerting authorities when bins are full enables timely collection action.</div>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 rounded-3 border" style="background: var(--brand-50); border-color: var(--brand-200) !important;">
                            <div class="fw-bold text-dark small mb-1"><i class="bi bi-check2-circle text-success me-1"></i>Research Gap Addressed</div>
                            <div class="small text-secondary">
                                Existing prototypes rely on dedicated IoT/RFID hardware and do not collect observations directly from residents. This software-only platform turns community observation into location-tagged, map-based waste reports: residents pinpoint full bins on a GIS map, administrators and garbage collection personnel view these reports as markers on the same map, and personnel mark reported bins as <strong>Cleaned</strong> or <strong>Collected</strong> so administrators can monitor which concerns remain <strong>Outstanding</strong>.
                            </div>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h5 fw-bold mb-3 pb-2 border-bottom">Scope and Limitations</h2>
                        <div class="row g-4 small">
                            <div class="col-md-6">
                                <h3 class="h6 fw-bold text-success mb-2"><i class="bi bi-check-circle me-1"></i>Project Scope</h3>
                                <ul class="ps-3 text-secondary mb-0">
                                    <li class="mb-2"><strong class="text-dark">Resident Map Reporting:</strong> Reporting of waste concerns by residents, who pinpoint the location of full garbage bins on a map.</li>
                                    <li class="mb-2"><strong class="text-dark">Recording of Waste Information:</strong> Recording of report location, photo, time submitted, and status.</li>
                                    <li class="mb-2"><strong class="text-dark">Shared GIS Map Visualization:</strong> Viewing of reported bins as markers on a GIS-based map by administrators and garbage collection personnel.</li>
                                    <li class="mb-2"><strong class="text-dark">Personnel Status Updates:</strong> Updating of report status by garbage collection personnel to mark bins as <strong>Cleaned</strong> or <strong>Collected</strong>.</li>
                                    <li class="mb-2"><strong class="text-dark">Administrator Monitoring:</strong> Monitoring of concerns by administrators, covering which reports remain <strong>Outstanding</strong> and which have been <strong>Addressed</strong>.</li>
                                    <li><strong class="text-dark">Geographical Coverage:</strong> Limited to the Municipality of Minglanilla, Cebu (piloted in Minglanilla Poblacion).</li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h3 class="h6 fw-bold text-danger mb-2"><i class="bi bi-dash-circle me-1"></i>Project Limitations</h3>
                                <ul class="ps-3 text-secondary mb-0">
                                    <li class="mb-2">Does not physically collect, transport, segregate, process, recycle, or dispose of garbage.</li>
                                    <li class="mb-2">Does not manage garbage trucks, collection equipment, or other physical waste management resources.</li>
                                    <li class="mb-2">Does not integrate with sensor or IoT hardware for automatic bin fill-level detection; fullness is reported manually by users.</li>
                                    <li class="mb-2">Cannot independently verify the accuracy of user-submitted reports.</li>
                                    <li class="mb-2">Requires an internet connection to use.</li>
                                    <li>Does not cover areas outside the Municipality of Minglanilla, Cebu.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="eco-card p-4 mb-4">
                        <h2 class="h6 fw-bold text-uppercase text-secondary mb-3" style="letter-spacing: 0.04em;">Intended Users &amp; Beneficiaries</h2>
                        <div class="mb-3 pb-3 border-bottom">
                            <div class="fw-bold text-dark small mb-1">1. Residents / Community Members</div>
                            <p class="small text-secondary mb-0">
                                Pinpoint on a map the location of garbage bins that are full and in need of cleaning or collection, and submit reports with photos.
                            </p>
                        </div>
                        <div class="mb-3 pb-3 border-bottom">
                            <div class="fw-bold text-dark small mb-1">2. Waste Management Personnel</div>
                            <p class="small text-secondary mb-0">
                                View submitted reports as markers on the GIS-based map to identify areas requiring attention, and mark reported bins as <strong>Cleaned</strong> or <strong>Collected</strong>.
                            </p>
                        </div>
                        <div>
                            <div class="fw-bold text-dark small mb-1">3. Local Government / Administrators</div>
                            <p class="small text-secondary mb-0">
                                View reported bins on the same GIS-based map and monitor which waste-related concerns have been <strong>Addressed</strong> and which remain <strong>Outstanding</strong>.
                            </p>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold text-uppercase text-secondary mb-3" style="letter-spacing: 0.04em;">
                            Minglanilla Poblacion Reference Landmarks
                        </h2>
                        <div class="vstack gap-2 small">
                            ${POBLACION_LANDMARKS.map(lm => `
                                <div class="p-2 border rounded-3 bg-light">
                                    <div class="fw-semibold text-dark">${escapeHtml(lm.name)}</div>
                                    <div class="text-secondary font-monospace" style="font-size: 0.75rem;">${escapeHtml(lm.zone)} &bull; ${lm.lat}, ${lm.lng}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ----------------------------------------------------------------------
       View 3: Login (#/login) & Register (#/register)
       ---------------------------------------------------------------------- */
    function viewLogin(mainEl) {
        mainEl.innerHTML = `
            <div class="row justify-content-center py-4">
                <div class="col-md-6 col-lg-5 col-xl-4">
                    <div class="eco-card p-4 p-md-5">
                        <div class="text-center mb-4">
                            <div class="brand-icon mx-auto mb-3" style="width: 44px; height: 44px; font-size: 1.25rem;">
                                <i class="bi bi-geo-alt-fill"></i>
                            </div>
                            <h1 class="h4 fw-bold mb-1">Sign In to ECO TRACK</h1>
                            <p class="text-secondary small mb-0">Minglanilla, Cebu (Poblacion Pilot Area)</p>
                        </div>

                        <form id="loginForm" novalidate>
                            <div class="mb-3">
                                <label class="form-label" for="login_id">Email or Username</label>
                                <input type="text" class="form-control" id="login_id" placeholder="Enter email or username" required>
                            </div>
                            <div class="mb-4">
                                <label class="form-label" for="password">Password</label>
                                <input type="password" class="form-control" id="password" placeholder="••••••••" required>
                            </div>
                            <button type="submit" class="btn btn-brand w-100 py-2">Sign In</button>
                        </form>

                        <div class="mt-4 pt-3 border-top">
                            <div class="text-uppercase text-secondary fw-semibold text-center mb-2" style="font-size: 0.68rem; letter-spacing: 0.05em;">
                                Quick Demo Access
                            </div>
                            <div class="d-grid gap-2">
                                <a href="#" onclick="EcoApp.demoLogin('resident'); return false;" class="btn btn-sm btn-outline-secondary text-start d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-person text-success me-2"></i>Resident Account</span>
                                    <i class="bi bi-chevron-right small text-secondary"></i>
                                </a>
                                <a href="#" onclick="EcoApp.demoLogin('personnel'); return false;" class="btn btn-sm btn-outline-secondary text-start d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-truck text-warning me-2"></i>Collection Personnel</span>
                                    <i class="bi bi-chevron-right small text-secondary"></i>
                                </a>
                                <a href="#" onclick="EcoApp.demoLogin('admin'); return false;" class="btn btn-sm btn-outline-secondary text-start d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-shield-check text-primary me-2"></i>System Administrator</span>
                                    <i class="bi bi-chevron-right small text-secondary"></i>
                                </a>
                            </div>
                        </div>

                        <div class="text-center mt-4 pt-3 border-top small text-secondary">
                            New resident in Minglanilla Poblacion?
                            <a href="#/register" class="fw-semibold text-success text-decoration-none">Create an account</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const loginId = document.getElementById('login_id').value.trim().toLowerCase();
            const pass = document.getElementById('password').value;
            const users = EcoStore.getAllUsers();
            const found = users.find(u => (u.email.toLowerCase() === loginId || u.username.toLowerCase() === loginId) && u.password === pass);
            if (!found) {
                flash('Invalid email/username or password.', 'danger');
                renderFlashMessages();
                return;
            }
            if (found.account_status !== 'active') {
                flash('Your account is currently suspended.', 'danger');
                renderFlashMessages();
                return;
            }
            EcoStore.setCurrentUser(found.id);
            flash(`Welcome back, ${found.full_name}!`, 'success');
            if (found.role === 'admin') navigate('#/admin/dashboard');
            else if (found.role === 'personnel') navigate('#/personnel/dashboard');
            else navigate('#/resident/dashboard');
        });
    }

    function viewRegister(mainEl) {
        mainEl.innerHTML = `
            <div class="row justify-content-center py-3">
                <div class="col-md-7 col-lg-6 col-xl-5">
                    <div class="eco-card p-4 p-md-5">
                        <div class="text-center mb-4">
                            <div class="brand-icon mx-auto mb-3" style="width: 44px; height: 44px; font-size: 1.25rem;">
                                <i class="bi bi-person-plus"></i>
                            </div>
                            <h1 class="h4 fw-bold mb-1">Create Resident Account</h1>
                            <p class="text-secondary small mb-0">Barangay Poblacion, Minglanilla, Cebu</p>
                        </div>

                        <form id="registerForm">
                            <div class="mb-3">
                                <label class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="reg_name" placeholder="e.g. Juan Dela Cruz" required>
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="reg_email" placeholder="juan@example.com" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Username</label>
                                    <input type="text" class="form-control" id="reg_username" placeholder="juandc" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Contact Number</label>
                                <input type="text" class="form-control" id="reg_phone" placeholder="0917-123-4567" required>
                            </div>
                            <div class="row g-3 mb-4">
                                <div class="col-md-6">
                                    <label class="form-label">Password</label>
                                    <input type="password" class="form-control" id="reg_pass" placeholder="Min. 6 characters" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Confirm Password</label>
                                    <input type="password" class="form-control" id="reg_confirm" placeholder="Repeat password" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-brand w-100 py-2">Create Account</button>
                        </form>

                        <div class="text-center mt-4 pt-3 border-top small text-secondary">
                            Already have an account?
                            <a href="#/login" class="fw-semibold text-success text-decoration-none">Sign in</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const full_name = document.getElementById('reg_name').value.trim();
            const email = document.getElementById('reg_email').value.trim();
            const username = document.getElementById('reg_username').value.trim();
            const phone_number = document.getElementById('reg_phone').value.trim();
            const password = document.getElementById('reg_pass').value;
            const confirm = document.getElementById('reg_confirm').value;

            if (password !== confirm) {
                flash('Passwords must match.', 'danger');
                renderFlashMessages();
                return;
            }
            const res = EcoStore.createUser({ full_name, email, username, phone_number, password, role: 'resident' });
            if (res.error) {
                flash(res.error, 'danger');
                renderFlashMessages();
                return;
            }
            EcoStore.setCurrentUser(res.user.id);
            flash('Registration successful! Welcome to ECO TRACK.', 'success');
            navigate('#/resident/dashboard');
        });
    }

    /* ----------------------------------------------------------------------
       View 4: Resident Views
       ---------------------------------------------------------------------- */
    function viewResidentDashboard(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'resident') {
            demoLogin('resident');
            return;
        }
        const allMyReports = EcoStore.getReports().filter(r => r.resident_id === user.id);
        const total_submitted = allMyReports.length;
        const outstanding_count = allMyReports.filter(r => r.current_status === 'Pending').length;
        const collected_count = allMyReports.filter(r => r.current_status === 'Collected').length;
        const cleaned_count = allMyReports.filter(r => r.current_status === 'Cleaned').length;
        const recentReports = allMyReports.slice(0, 6);
        const notifications = EcoStore.getNotificationsForUser(user.id).slice(0, 4);

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="page-header-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div class="eyebrow-badge mb-2">
                                <i class="bi bi-person-check"></i>
                                <span>Resident Portal &bull; Minglanilla Poblacion</span>
                            </div>
                            <h1 class="h3 fw-bold mb-1">Welcome, ${escapeHtml(user.full_name)}</h1>
                            <p class="text-secondary small mb-0">
                                Pinpoint full or overflowing garbage bins on the GIS map and track their cleaning or collection status.
                            </p>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="#/resident/report/new" class="btn btn-brand d-inline-flex align-items-center gap-2">
                                <i class="bi bi-geo-alt-fill"></i>
                                <span>Pinpoint Full Bin</span>
                            </a>
                            <a href="#/resident/reports" class="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                                <i class="bi bi-card-list"></i>
                                <span>My Reports</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Total Submitted</div>
                            <div class="kpi-value">${total_submitted}</div>
                            <div class="kpi-subtext">All recorded reports</div>
                        </div>
                        <div class="kpi-icon-box slate"><i class="bi bi-journal-text"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Outstanding</div>
                            <div class="kpi-value text-warning">${outstanding_count}</div>
                            <div class="kpi-subtext">Pending collection/cleaning</div>
                        </div>
                        <div class="kpi-icon-box amber"><i class="bi bi-hourglass-split"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Marked Collected</div>
                            <div class="kpi-value text-success">${collected_count}</div>
                            <div class="kpi-subtext">Bins collected by personnel</div>
                        </div>
                        <div class="kpi-icon-box emerald"><i class="bi bi-truck"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Marked Cleaned</div>
                            <div class="kpi-value" style="color: var(--teal-600);">${cleaned_count}</div>
                            <div class="kpi-subtext">Bins &amp; areas cleaned</div>
                        </div>
                        <div class="kpi-icon-box teal"><i class="bi bi-stars"></i></div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <h2 class="h6 fw-bold mb-0">Recent Submitted Reports</h2>
                            <a href="#/resident/reports" class="btn btn-sm btn-outline-secondary">View All</a>
                        </div>

                        ${recentReports.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Tracking ID</th>
                                            <th>Concern &amp; Location</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentReports.map(r => `
                                            <tr>
                                                <td class="font-monospace fw-semibold text-dark">${escapeHtml(r.tracking_code)}</td>
                                                <td>
                                                    <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                    <div class="small text-secondary"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                                </td>
                                                <td class="small text-secondary">${formatDateTime(r.submission_timestamp)}</td>
                                                <td>
                                                    <span class="badge ${statusBadgeClass(r.current_status)}">
                                                        ${escapeHtml(r.current_status)} (${r.monitoring_state_label})
                                                    </span>
                                                </td>
                                                <td class="text-end">
                                                    <a href="#/resident/report/${r.id}" class="btn btn-sm btn-outline-secondary">Details</a>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="text-center py-5">
                                <div class="kpi-icon-box emerald mx-auto mb-3" style="width: 52px; height: 52px; font-size: 1.4rem;">
                                    <i class="bi bi-geo-alt"></i>
                                </div>
                                <h3 class="h6 fw-bold text-dark mb-1">No reports submitted yet</h3>
                                <p class="small text-secondary mb-3">Pinpoint the location of a full or overflowing garbage bin on the map to submit your first report.</p>
                                <a href="#/resident/report/new" class="btn btn-brand">
                                    <i class="bi bi-plus-lg me-1"></i>Pinpoint Full Bin on Map
                                </a>
                            </div>
                        `}
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <h3 class="h6 fw-bold mb-0">Recent Status Updates</h3>
                            <a href="#/resident/notifications" class="small text-decoration-none text-secondary">View All</a>
                        </div>
                        <div class="vstack gap-2 small">
                            ${notifications.length > 0 ? notifications.map(n => `
                                <div class="p-3 rounded-3 bg-light border">
                                    <div class="fw-semibold text-dark mb-1">${escapeHtml(n.title)}</div>
                                    <div class="text-secondary mb-1">${escapeHtml(n.notification_message)}</div>
                                    <div class="text-secondary" style="font-size: 0.72rem;">${formatDateTime(n.created_timestamp)}</div>
                                </div>
                            `).join('') : `
                                <div class="text-secondary text-center py-5">
                                    <i class="bi bi-bell fs-3 d-block mb-2 opacity-50"></i>
                                    No status updates yet.
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function viewResidentNewReport(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'resident') {
            demoLogin('resident');
            return;
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="page-header-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div class="eyebrow-badge mb-2">
                                <i class="bi bi-geo-alt-fill"></i>
                                <span>Resident Map Reporting &bull; Minglanilla Poblacion</span>
                            </div>
                            <h1 class="h4 fw-bold mb-1">Pinpoint Full Garbage Bin on GIS Map</h1>
                            <p class="text-secondary small mb-0">
                                Records report location, photo, time submitted, and status on the shared GIS map.
                            </p>
                        </div>
                        <div>
                            <a href="#/resident/dashboard" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-arrow-left me-1"></i>Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="eco-card p-4">
                        <form id="reportForm" novalidate>
                            <input type="hidden" id="reportLat" value="">
                            <input type="hidden" id="reportLng" value="">
                            <input type="hidden" id="wasteCategorySelect" value="Full Garbage Bin">

                            <div class="mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label class="form-label mb-0">1. Select Waste Concern</label>
                                    <span class="small text-secondary">Choose category</span>
                                </div>
                                <div class="category-choice-grid">
                                    <div class="category-choice-card selected" data-value="Full Garbage Bin" data-title="Full Garbage Bin In Need of Collection">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-trash3"></i></span>
                                        <span class="category-label">Full Garbage Bin</span>
                                    </div>
                                    <div class="category-choice-card" data-value="Overflowing Bin" data-title="Overflowing Garbage Bin">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-inboxes"></i></span>
                                        <span class="category-label">Overflowing Bin</span>
                                    </div>
                                    <div class="category-choice-card" data-value="Uncollected Garbage" data-title="Uncollected Garbage Awaiting Pickup">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-clock-history"></i></span>
                                        <span class="category-label">Uncollected Bin</span>
                                    </div>
                                    <div class="category-choice-card" data-value="Bins Needing Cleaning" data-title="Garbage Bin In Need of Cleaning">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-stars"></i></span>
                                        <span class="category-label">Needs Cleaning</span>
                                    </div>
                                    <div class="category-choice-card" data-value="Scattered Waste" data-title="Scattered Waste Around Bin Area">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-exclamation-diamond"></i></span>
                                        <span class="category-label">Scattered Waste</span>
                                    </div>
                                    <div class="category-choice-card" data-value="Other Waste Concern" data-title="Community Waste Concern">
                                        <span class="check-pill"><i class="bi bi-check"></i></span>
                                        <span class="category-icon"><i class="bi bi-question-circle"></i></span>
                                        <span class="category-label">Other Concern</span>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label" for="title">Report Title</label>
                                <input type="text" class="form-control" id="title" value="Full Garbage Bin In Need of Collection" required>
                            </div>

                            <div class="mb-3">
                                <label class="form-label" for="location_description">
                                    Street, Sitio, or Landmark in Poblacion, Minglanilla <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" id="location_description" placeholder="e.g. Corner Caballero St., near Minglanilla Public Market" required>
                            </div>

                            <div class="mb-3">
                                <label class="form-label" for="description">Additional Details (Optional)</label>
                                <textarea class="form-control" id="description" rows="2" placeholder="Describe the condition of the garbage bin or surrounding area..."></textarea>
                            </div>

                            <div class="mb-4">
                                <label class="form-label">2. Upload Photo of Reported Bin</label>
                                <div class="upload-dropzone" onclick="document.getElementById('photoInput').click()">
                                    <div id="dropzonePrompt">
                                        <i class="bi bi-camera text-success fs-3 d-block mb-1"></i>
                                        <div class="fw-semibold text-dark small">Click to attach a photo of the garbage bin</div>
                                        <div class="text-secondary" style="font-size: 0.75rem;">JPG, PNG, or WEBP</div>
                                    </div>
                                    <div id="photoPreviewContainer" style="display: none;">
                                        <img id="photoPreviewImg" src="#" alt="Preview" class="img-fluid rounded border shadow-xs" style="max-height: 140px;">
                                        <div class="small text-success fw-semibold mt-2"><i class="bi bi-check-circle-fill me-1"></i>Photo attached</div>
                                    </div>
                                </div>
                                <input type="file" class="d-none" id="photoInput" accept="image/*">
                            </div>

                            <div class="pt-3 border-top">
                                <button type="button" class="btn btn-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2" id="btnOpenConfirmModal" disabled>
                                    <i class="bi bi-send-check"></i>
                                    <span>Submit Waste Report</span>
                                </button>
                                <div class="text-center small text-secondary mt-2">
                                    Pinpoint a location inside the green boundary on the map to enable submission.
                                </div>
                            </div>

                            <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
                                <div class="modal-dialog modal-dialog-centered">
                                    <div class="modal-content border-0 shadow-lg rounded-4">
                                        <div class="modal-header border-bottom px-4 py-3">
                                            <h5 class="modal-title h6 fw-bold mb-0">Confirm Waste Report</h5>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body p-4">
                                            <div class="mb-3">
                                                <span class="badge bg-light text-dark border mb-2" id="modalPreviewCategory"></span>
                                                <h6 class="fw-bold text-dark mb-0" id="modalPreviewTitle"></h6>
                                            </div>
                                            <div class="bg-light p-3 rounded-3 border mb-3 small">
                                                <div class="mb-1"><strong class="text-dark">Location:</strong> <span id="modalPreviewLocation" class="text-secondary"></span></div>
                                                <div><strong class="text-dark">GIS Coordinates:</strong> <span id="modalPreviewCoords" class="font-monospace text-dark"></span></div>
                                            </div>
                                            <div class="small text-secondary">
                                                This report will be recorded with your pinpointed coordinates, photo, submission timestamp, and <strong>Pending (Outstanding)</strong> status on the shared GIS map.
                                            </div>
                                        </div>
                                        <div class="modal-footer border-top bg-light px-4 py-2">
                                            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Adjust Pin</button>
                                            <button type="button" class="btn btn-brand btn-sm px-3" id="btnSubmitFormFinal">Confirm &amp; Submit</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="col-lg-7">
                    <div class="eco-card p-4 h-100 d-flex flex-column">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                            <div>
                                <h2 class="h6 fw-bold mb-0">3. Pinpoint Bin Location on Map</h2>
                                <div class="text-secondary small">Click anywhere inside the Minglanilla Poblacion boundary to place the marker</div>
                            </div>
                            <div>
                                <button type="button" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" id="btnLocateMe">
                                    <i class="bi bi-crosshair"></i> <span>Use My Location</span>
                                </button>
                            </div>
                        </div>

                        <div class="d-flex flex-wrap gap-1 mb-3 align-items-center">
                            <span class="small fw-semibold text-secondary me-1">Landmarks:</span>
                            ${POBLACION_LANDMARKS.map(lm => `
                                <button type="button" class="btn btn-xs btn-outline-secondary btn-landmark-jump" data-lat="${lm.lat}" data-lng="${lm.lng}" data-name="${escapeHtml(lm.name)}">
                                    ${escapeHtml(lm.name)}
                                </button>
                            `).join('')}
                        </div>

                        <div id="pickerMap" class="eco-map-container flex-grow-1" style="min-height: 460px;"></div>

                        <div id="coordinatePreview" class="coordinate-preview-box mt-3 text-center">
                            <div class="text-secondary small">
                                <i class="bi bi-geo-alt text-success me-1"></i>
                                Click inside the highlighted boundary on the map above to pinpoint the full garbage bin.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const picker = EcoGIS.initReportPickerMap('pickerMap', 'reportLat', 'reportLng', 'coordinatePreview', 'btnOpenConfirmModal');
        const categoryCards = document.querySelectorAll('.category-choice-card');
        const hiddenCategorySelect = document.getElementById('wasteCategorySelect');
        const titleInput = document.getElementById('title');
        let attachedPhotoDataUrl = null;

        categoryCards.forEach(card => {
            card.addEventListener('click', function () {
                categoryCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                const val = this.getAttribute('data-value');
                const defaultTitle = this.getAttribute('data-title');
                hiddenCategorySelect.value = val;
                if (titleInput && (!titleInput.value || titleInput.value.includes('Bin') || titleInput.value.includes('Garbage') || titleInput.value.includes('Waste') || titleInput.value.includes('Concern'))) {
                    titleInput.value = defaultTitle;
                }
            });
        });

        document.querySelectorAll('.btn-landmark-jump').forEach(btn => {
            btn.addEventListener('click', function () {
                const lat = parseFloat(this.getAttribute('data-lat'));
                const lng = parseFloat(this.getAttribute('data-lng'));
                const name = this.getAttribute('data-name');
                picker.setMarker(lat, lng);
                const locInput = document.getElementById('location_description');
                if (!locInput.value) {
                    locInput.value = `Near ${name}, Poblacion, Minglanilla`;
                }
            });
        });

        const locateBtn = document.getElementById('btnLocateMe');
        if (locateBtn) {
            locateBtn.addEventListener('click', function () {
                if (!navigator.geolocation) {
                    alert('Geolocation is not supported by your browser.');
                    return;
                }
                locateBtn.disabled = true;
                locateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Locating...';
                navigator.geolocation.getCurrentPosition(
                    function (pos) {
                        picker.setMarker(pos.coords.latitude, pos.coords.longitude);
                        locateBtn.disabled = false;
                        locateBtn.innerHTML = '<i class="bi bi-crosshair"></i> <span>Use My Location</span>';
                    },
                    function () {
                        alert('Could not retrieve your location. Please click directly on the map inside Poblacion.');
                        locateBtn.disabled = false;
                        locateBtn.innerHTML = '<i class="bi bi-crosshair"></i> <span>Use My Location</span>';
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            });
        }

        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        attachedPhotoDataUrl = e.target.result;
                        document.getElementById('photoPreviewImg').src = attachedPhotoDataUrl;
                        document.getElementById('photoPreviewContainer').style.display = 'block';
                        document.getElementById('dropzonePrompt').style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const btnOpenConfirm = document.getElementById('btnOpenConfirmModal');
        const confirmModalEl = document.getElementById('confirmModal');
        const confirmModal = new bootstrap.Modal(confirmModalEl);
        const btnFinalSubmit = document.getElementById('btnSubmitFormFinal');

        btnOpenConfirm.addEventListener('click', function () {
            const title = document.getElementById('title').value.trim();
            const category = hiddenCategorySelect.value;
            const location = document.getElementById('location_description').value.trim();
            const lat = document.getElementById('reportLat').value;
            const lng = document.getElementById('reportLng').value;

            if (!location) {
                alert('Please enter a street name or landmark address in Poblacion, Minglanilla.');
                document.getElementById('location_description').focus();
                return;
            }

            document.getElementById('modalPreviewTitle').innerText = title || 'Full Garbage Bin';
            document.getElementById('modalPreviewCategory').innerText = category;
            document.getElementById('modalPreviewLocation').innerText = location;
            document.getElementById('modalPreviewCoords').innerText = `${lat}, ${lng}`;
            confirmModal.show();
        });

        btnFinalSubmit.addEventListener('click', function () {
            confirmModal.hide();
            const created = EcoStore.createReport({
                resident_id: user.id,
                title: document.getElementById('title').value.trim() || 'Full Garbage Bin',
                description: document.getElementById('description').value.trim(),
                waste_category: hiddenCategorySelect.value,
                location_description: document.getElementById('location_description').value.trim(),
                latitude: document.getElementById('reportLat').value,
                longitude: document.getElementById('reportLng').value,
                photo_data_url: attachedPhotoDataUrl
            });
            flash(`Waste report ${created.tracking_code} submitted and pinned on the GIS map!`, 'success');
            navigate(`#/resident/report/${created.id}`);
        });
    }

    function viewResidentReports(mainEl, params) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'resident') {
            demoLogin('resident');
            return;
        }
        const current_filter = params.get('status') || 'all';
        let reports = EcoStore.getReports().filter(r => r.resident_id === user.id);
        if (current_filter === 'outstanding') {
            reports = reports.filter(r => r.current_status === 'Pending');
        } else if (current_filter === 'addressed') {
            reports = reports.filter(r => r.current_status === 'Collected' || r.current_status === 'Cleaned');
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                            <div>
                                <h1 class="h4 fw-bold mb-1">My Submitted Waste Reports</h1>
                                <p class="text-secondary small mb-0">
                                    Track your pinpointed garbage bin reports, submission timestamps, photos, and status updates.
                                </p>
                            </div>
                            <div>
                                <a href="#/resident/report/new" class="btn btn-brand d-flex align-items-center gap-2">
                                    <i class="bi bi-plus-lg"></i> <span>Pinpoint Full Bin</span>
                                </a>
                            </div>
                        </div>

                        <ul class="nav nav-pills mb-3 gap-2">
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'all' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/resident/reports?status=all">All Reports</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'outstanding' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/resident/reports?status=outstanding">Outstanding (Pending)</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'addressed' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/resident/reports?status=addressed">Addressed (Cleaned / Collected)</a>
                            </li>
                        </ul>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Tracking ID</th>
                                        <th>Reported Concern &amp; Location</th>
                                        <th>Photo</th>
                                        <th>Time Submitted</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reports.length > 0 ? reports.map(r => `
                                        <tr>
                                            <td class="font-monospace fw-semibold text-dark">${escapeHtml(r.tracking_code)}</td>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                <div class="small text-secondary"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                            </td>
                                            <td>
                                                ${r.photo_data_url
                                                    ? `<span class="badge bg-light text-dark border"><i class="bi bi-image text-success me-1"></i>Attached</span>`
                                                    : `<span class="text-secondary small">None</span>`
                                                }
                                            </td>
                                            <td class="small text-secondary">${formatDateTime(r.submission_timestamp)}</td>
                                            <td>
                                                <span class="badge ${statusBadgeClass(r.current_status)}">
                                                    ${escapeHtml(r.current_status)} (${r.monitoring_state_label})
                                                </span>
                                            </td>
                                            <td class="text-end">
                                                <a href="#/resident/report/${r.id}" class="btn btn-sm btn-outline-secondary">View Details</a>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="6" class="text-center py-5">
                                                <div class="kpi-icon-box slate mx-auto mb-2"><i class="bi bi-inbox"></i></div>
                                                <div class="fw-semibold text-dark">No reports found</div>
                                                <p class="small text-secondary mb-3">You have no reports matching this filter.</p>
                                                <a href="#/resident/report/new" class="btn btn-sm btn-brand">Pinpoint Full Bin on Map</a>
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function viewResidentTrackReport(mainEl, reportId) {
        const report = EcoStore.getReportById(reportId);
        if (!report) {
            flash('Report not found.', 'warning');
            navigate('#/resident/reports');
            return;
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <a href="#/resident/reports" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-arrow-left me-1"></i>Back to My Reports
                        </a>
                        <div class="d-flex align-items-center gap-2">
                            <span class="small text-secondary">Report Status:</span>
                            <span class="badge ${statusBadgeClass(report.current_status)} fs-6 px-3 py-2">
                                ${escapeHtml(report.current_status)} (${report.monitoring_state_label})
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-lg-7">
                    <div class="eco-card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                            <div>
                                <div class="small text-secondary font-monospace mb-1">${escapeHtml(report.tracking_code)}</div>
                                <h1 class="h5 fw-bold text-dark mb-1">${escapeHtml(report.title)}</h1>
                                <span class="badge bg-light text-dark border">${escapeHtml(report.waste_category)}</span>
                            </div>
                            <div class="text-end small text-secondary">
                                <div><strong class="text-dark">Time Submitted:</strong><br>${formatDateTime(report.submission_timestamp)}</div>
                            </div>
                        </div>

                        <p class="text-secondary small mb-3">${escapeHtml(report.description)}</p>

                        <div class="bg-light p-3 rounded-3 mb-3 small border">
                            <div class="mb-1">
                                <strong class="text-dark"><i class="bi bi-geo-alt text-danger me-1"></i>Report Location:</strong>
                                <span class="text-secondary">${escapeHtml(report.location_description)}</span>
                            </div>
                            <div>
                                <strong class="text-dark"><i class="bi bi-crosshair text-primary me-1"></i>GIS Coordinates:</strong>
                                <span class="font-monospace text-dark">${report.latitude}, ${report.longitude}</span>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Recorded Report Photo</div>
                                    ${report.photo_data_url
                                        ? `<img src="${report.photo_data_url}" class="img-fluid rounded border" style="max-height: 210px; object-fit: cover;" alt="Reported Waste">`
                                        : `<div class="text-secondary small py-4 bg-light rounded-3">No photo uploaded with report.</div>`
                                    }
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Personnel Resolution Status</div>
                                    ${report.is_addressed ? `
                                        <div class="p-2 rounded-3 mb-2 small fw-semibold badge-status-completed">
                                            Marked as ${escapeHtml(report.current_status)} by ${escapeHtml(report.resolved_by ? report.resolved_by.full_name : 'Collection Personnel')}
                                        </div>
                                        ${report.collection_proof_photo ? `<img src="${report.collection_proof_photo}" class="img-fluid rounded border" style="max-height: 160px; object-fit: cover;" alt="Cleaned/Collected Bin">` : ''}
                                        ${report.collection_notes ? `<div class="small text-secondary mt-2 text-start p-2 bg-light rounded-3 border">"${escapeHtml(report.collection_notes)}"</div>` : ''}
                                    ` : `
                                        <div class="text-secondary small py-4 bg-light rounded-3">
                                            Currently <strong>Outstanding</strong> on the GIS map awaiting garbage collection personnel.
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-2">Pinpointed Bin Location on GIS Map</h2>
                        <div id="detailMap" class="eco-map-container map-sm"></div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="eco-card p-4 mb-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Workflow Status</h2>
                        <div class="vstack gap-2 small">
                            <div class="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="fw-semibold text-dark">1. Pinpointed &amp; Submitted</div>
                                    <div class="text-secondary">${formatDateTime(report.submission_timestamp)}</div>
                                </div>
                                <i class="bi bi-check-circle-fill text-success fs-5"></i>
                            </div>
                            <div class="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="fw-semibold text-dark">2. Visible on Shared GIS Map</div>
                                    <div class="text-secondary">Viewed by Personnel &amp; Administrators</div>
                                </div>
                                <i class="bi bi-check-circle-fill text-success fs-5"></i>
                            </div>
                            <div class="p-3 rounded-3 border ${report.is_addressed ? 'bg-light' : 'bg-white'} d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="fw-semibold text-dark">3. Marked Cleaned or Collected</div>
                                    <div class="text-secondary">
                                        ${report.is_addressed
                                            ? `Marked as <strong>${escapeHtml(report.current_status)}</strong> (${formatDateTime(report.resolved_timestamp)})`
                                            : 'Pending action by garbage collection personnel'
                                        }
                                    </div>
                                </div>
                                ${report.is_addressed
                                    ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>'
                                    : '<i class="bi bi-hourglass-split text-warning fs-5"></i>'
                                }
                            </div>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Recorded Status History</h2>
                        <div class="eco-timeline">
                            ${report.status_history.map(h => `
                                <div class="timeline-step ${h.new_status === 'Collected' || h.new_status === 'Cleaned' ? 'completed' : ''}">
                                    <div class="timeline-step-dot"></div>
                                    <div class="d-flex justify-content-between align-items-baseline">
                                        <span class="badge ${statusBadgeClass(h.new_status)} mb-1">${escapeHtml(h.new_status)}</span>
                                        <span class="text-secondary" style="font-size: 0.72rem;">${formatDateTime(h.timestamp)}</span>
                                    </div>
                                    <div class="small fw-semibold text-dark mt-1">
                                        ${escapeHtml(h.updated_by.full_name)} (${escapeHtml(h.updated_by.role)})
                                    </div>
                                    ${h.note ? `<div class="small text-secondary mt-1 p-2 bg-light rounded-3 border">${escapeHtml(h.note)}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initDetailMap('detailMap', report.latitude, report.longitude, report.tracking_code, report.current_status);
    }

    function viewResidentNotifications(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'resident') {
            demoLogin('resident');
            return;
        }
        EcoStore.markNotificationsRead(user.id);
        renderNavbar('/resident/notifications');
        const notifications = EcoStore.getNotificationsForUser(user.id);

        mainEl.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="eco-card p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                            <div>
                                <h1 class="h4 fw-bold mb-1">Notifications</h1>
                                <p class="text-secondary small mb-0">Status updates when your reported garbage bins are marked as Cleaned or Collected.</p>
                            </div>
                            <span class="badge bg-light text-dark border">${notifications.length} Total</span>
                        </div>

                        <div class="vstack gap-2">
                            ${notifications.length > 0 ? notifications.map(n => `
                                <div class="p-3 rounded-3 bg-light border">
                                    <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                                        <h6 class="mb-0 fw-bold text-dark small">${escapeHtml(n.title)}</h6>
                                        <small class="text-secondary">${formatDateTime(n.created_timestamp)}</small>
                                    </div>
                                    <p class="mb-2 text-secondary small">${escapeHtml(n.notification_message)}</p>
                                    ${n.related_report_id ? `<a href="#/resident/report/${n.related_report_id}" class="btn btn-xs btn-outline-secondary">View Report Details</a>` : ''}
                                </div>
                            `).join('') : `
                                <div class="text-center py-5 text-secondary">
                                    <i class="bi bi-bell-slash fs-2 d-block mb-2 opacity-50"></i>
                                    You have no notifications yet.
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ----------------------------------------------------------------------
       View 5: Collection Personnel Views
       ---------------------------------------------------------------------- */
    function quickMarkReport(reportId, status) {
        let user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'personnel') {
            user = EcoStore.getUserById(2);
        }
        const updated = EcoStore.updateReportStatus({
            report_id: reportId,
            personnel_id: user.id,
            new_status: status,
            notes: `Garbage collection personnel (${user.full_name}) marked the reported bin as ${status}.`
        });
        if (updated) {
            flash(`Report ${updated.tracking_code} marked as ${status}.`, 'success');
        }
        renderCurrentRoute();
    }

    function viewPersonnelDashboard(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'personnel') {
            demoLogin('personnel');
            return;
        }
        const allReports = EcoStore.getReports();
        const outstanding_reports = allReports.filter(r => r.current_status === 'Pending');
        const outstanding_count = outstanding_reports.length;
        const collected_count = allReports.filter(r => r.current_status === 'Collected').length;
        const cleaned_count = allReports.filter(r => r.current_status === 'Cleaned').length;
        const total_reports = allReports.length;

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="page-header-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div class="eyebrow-badge amber mb-2">
                                <i class="bi bi-truck"></i>
                                <span>Garbage Collection Personnel &bull; Minglanilla Poblacion</span>
                            </div>
                            <h1 class="h3 fw-bold mb-1">${escapeHtml(user.full_name)}</h1>
                            <p class="text-secondary small mb-0">
                                View resident-reported bins as markers on the shared GIS map and mark reported bins as <strong>Cleaned</strong> or <strong>Collected</strong>.
                            </p>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="#/personnel/map" class="btn btn-brand d-inline-flex align-items-center gap-2">
                                <i class="bi bi-pin-map-fill"></i>
                                <span>Open Shared GIS Map</span>
                            </a>
                            <a href="#/personnel/tasks" class="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                                <i class="bi bi-list-check"></i>
                                <span>All Reported Bins</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Outstanding Bins</div>
                            <div class="kpi-value text-warning">${outstanding_count}</div>
                            <div class="kpi-subtext">Needs cleaning or collection</div>
                        </div>
                        <div class="kpi-icon-box amber"><i class="bi bi-exclamation-circle"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Marked Collected</div>
                            <div class="kpi-value text-success">${collected_count}</div>
                            <div class="kpi-subtext">Bins emptied / collected</div>
                        </div>
                        <div class="kpi-icon-box emerald"><i class="bi bi-check2-circle"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Marked Cleaned</div>
                            <div class="kpi-value" style="color: var(--teal-600);">${cleaned_count}</div>
                            <div class="kpi-subtext">Bins &amp; areas cleaned</div>
                        </div>
                        <div class="kpi-icon-box teal"><i class="bi bi-stars"></i></div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Total Reports</div>
                            <div class="kpi-value">${total_reports}</div>
                            <div class="kpi-subtext">All Poblacion reports</div>
                        </div>
                        <div class="kpi-icon-box slate"><i class="bi bi-layers"></i></div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <div>
                                <h2 class="h6 fw-bold mb-0">Shared GIS-Based Waste Map</h2>
                                <div class="text-secondary small">Click any marker to inspect photo and mark as Cleaned or Collected.</div>
                            </div>
                            <a href="#/personnel/map" class="btn btn-sm btn-outline-secondary">Full Map</a>
                        </div>
                        <div id="collectorDashboardMap" class="eco-map-container" style="height: 410px;"></div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <div>
                                <h2 class="h6 fw-bold mb-0">Outstanding Reported Bins (${outstanding_count})</h2>
                                <div class="text-secondary small">Mark reported bins as Cleaned or Collected once attended to.</div>
                            </div>
                            <a href="#/personnel/tasks?status=Outstanding" class="btn btn-sm btn-outline-secondary">View All</a>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Reported Bin &amp; Location</th>
                                        <th>Mark Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${outstanding_reports.length > 0 ? outstanding_reports.slice(0, 8).map(r => `
                                        <tr>
                                            <td>
                                                <a href="#/personnel/report/${r.id}" class="fw-semibold font-monospace text-dark text-decoration-none">
                                                    ${escapeHtml(r.tracking_code)}
                                                </a>
                                                <div class="text-secondary" style="font-size: 0.72rem;">${formatDateTime(r.submission_timestamp)}</div>
                                            </td>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                <div class="small text-secondary"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                            </td>
                                            <td>
                                                <div class="d-flex flex-wrap gap-1 justify-content-end">
                                                    <button type="button" class="btn btn-xs btn-brand" onclick="EcoApp.quickMarkReport(${r.id}, 'Collected')">Collected</button>
                                                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EcoApp.quickMarkReport(${r.id}, 'Cleaned')">Cleaned</button>
                                                    <a href="#/personnel/report/${r.id}" class="btn btn-xs btn-outline-secondary">Open</a>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="3" class="text-center py-5">
                                                <div class="kpi-icon-box emerald mx-auto mb-2"><i class="bi bi-check2-all"></i></div>
                                                <div class="fw-semibold text-dark">All reported bins addressed</div>
                                                <div class="small text-secondary">No outstanding bins currently awaiting collection or cleaning.</div>
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initReportsMap('collectorDashboardMap', { initialStatus: 'all', role: 'personnel' });
    }

    function viewPersonnelMap(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'personnel') {
            demoLogin('personnel');
            return;
        }
        const outstanding_reports = EcoStore.getReports().filter(r => r.current_status === 'Pending');

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                            <div>
                                <h1 class="h4 fw-bold mb-1">Shared GIS-Based Waste Map</h1>
                                <p class="text-secondary small mb-0">
                                    View resident-submitted reports as markers on the GIS map and mark reported bins as <strong>Cleaned</strong> or <strong>Collected</strong>.
                                </p>
                            </div>
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <select id="personnelMapFilter" class="form-select form-select-sm" style="min-width: 210px;">
                                    <option value="all">Show All Markers</option>
                                    <option value="Outstanding">Outstanding Only (Pending)</option>
                                    <option value="Addressed">Addressed (Cleaned &amp; Collected)</option>
                                    <option value="Collected">Marked as Collected</option>
                                    <option value="Cleaned">Marked as Cleaned</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-lg-8">
                                <div id="collectorFullRouteMap" class="eco-map-container map-lg"></div>
                            </div>
                            <div class="col-lg-4">
                                <div class="p-3 h-100 rounded-3 bg-light border">
                                    <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                        <h2 class="h6 fw-bold mb-0">Outstanding Bins</h2>
                                        <span class="badge badge-status-pending">${outstanding_reports.length} Pending</span>
                                    </div>
                                    <div class="vstack gap-2 small" style="max-height: 550px; overflow-y: auto;">
                                        ${outstanding_reports.length > 0 ? outstanding_reports.map(r => `
                                            <div class="rounded-3 border bg-white p-3">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <span class="badge badge-status-pending">Outstanding</span>
                                                    <span class="font-monospace text-secondary fw-semibold">${escapeHtml(r.tracking_code)}</span>
                                                </div>
                                                <div class="fw-bold text-dark">${escapeHtml(r.title)}</div>
                                                <div class="text-secondary small mb-1"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                                <div class="text-secondary mb-2" style="font-size: 0.72rem;">Submitted: ${formatDateTime(r.submission_timestamp)}</div>
                                                <div class="d-flex flex-wrap gap-1 pt-2 border-top">
                                                    <button type="button" class="btn btn-xs btn-brand" onclick="EcoApp.quickMarkReport(${r.id}, 'Collected')">Mark Collected</button>
                                                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="EcoApp.quickMarkReport(${r.id}, 'Cleaned')">Mark Cleaned</button>
                                                    <a href="#/personnel/report/${r.id}" class="btn btn-xs btn-outline-secondary ms-auto">Details</a>
                                                </div>
                                            </div>
                                        `).join('') : `
                                            <div class="text-center py-5 text-secondary">
                                                <i class="bi bi-check2-circle fs-3 text-success d-block mb-2"></i>
                                                No outstanding bins awaiting collection or cleaning.
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const filterSelect = document.getElementById('personnelMapFilter');
        const mapCtrl = EcoGIS.initReportsMap('collectorFullRouteMap', { initialStatus: 'all', role: 'personnel' });
        filterSelect.addEventListener('change', function () {
            mapCtrl.loadReports(this.value, 'all');
        });
    }

    function viewPersonnelTasks(mainEl, params) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'personnel') {
            demoLogin('personnel');
            return;
        }
        const current_filter = params.get('status') || 'Outstanding';
        let reports = EcoStore.getReports();
        if (current_filter === 'Outstanding') reports = reports.filter(r => r.current_status === 'Pending');
        else if (current_filter === 'Addressed') reports = reports.filter(r => r.current_status === 'Collected' || r.current_status === 'Cleaned');
        else if (current_filter === 'Collected' || current_filter === 'Cleaned') reports = reports.filter(r => r.current_status === current_filter);

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                            <div>
                                <h1 class="h4 fw-bold mb-1">Reported Garbage Bins</h1>
                                <p class="text-secondary small mb-0">
                                    View reported garbage bins in Minglanilla Poblacion and mark them as <strong>Cleaned</strong> or <strong>Collected</strong>.
                                </p>
                            </div>
                            <div>
                                <a href="#/personnel/map" class="btn btn-sm btn-brand">
                                    <i class="bi bi-pin-map me-1"></i>View on Shared GIS Map
                                </a>
                            </div>
                        </div>

                        <ul class="nav nav-pills mb-3 gap-2">
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'Outstanding' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/personnel/tasks?status=Outstanding">Outstanding (Pending)</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'Addressed' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/personnel/tasks?status=Addressed">Addressed (All)</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'Collected' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/personnel/tasks?status=Collected">Marked Collected</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'Cleaned' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/personnel/tasks?status=Cleaned">Marked Cleaned</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${current_filter === 'all' ? 'active bg-dark text-white' : 'bg-light border'}" href="#/personnel/tasks?status=all">All Reports</a>
                            </li>
                        </ul>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Tracking ID</th>
                                        <th>Reported Concern</th>
                                        <th>Location &amp; Coordinates</th>
                                        <th>Time Submitted</th>
                                        <th>Status</th>
                                        <th class="text-end">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reports.length > 0 ? reports.map(r => `
                                        <tr>
                                            <td class="font-monospace fw-semibold text-dark">${escapeHtml(r.tracking_code)}</td>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                <span class="badge bg-light text-secondary border" style="font-size: 0.7rem;">${escapeHtml(r.waste_category)}</span>
                                            </td>
                                            <td>
                                                <div class="small text-dark"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                                <div class="text-secondary font-monospace" style="font-size: 0.72rem;">${r.latitude}, ${r.longitude}</div>
                                            </td>
                                            <td class="small text-secondary">${formatDateTime(r.submission_timestamp)}</td>
                                            <td>
                                                <span class="badge ${statusBadgeClass(r.current_status)}">
                                                    ${escapeHtml(r.current_status)} (${r.monitoring_state_label})
                                                </span>
                                            </td>
                                            <td class="text-end">
                                                <div class="d-inline-flex flex-wrap gap-1 justify-content-end">
                                                    ${r.is_outstanding ? `
                                                        <button type="button" class="btn btn-sm btn-brand" onclick="EcoApp.quickMarkReport(${r.id}, 'Collected')">Mark Collected</button>
                                                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="EcoApp.quickMarkReport(${r.id}, 'Cleaned')">Mark Cleaned</button>
                                                    ` : ''}
                                                    <a href="#/personnel/report/${r.id}" class="btn btn-sm btn-outline-secondary">Details</a>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="6" class="text-center py-5">
                                                <div class="kpi-icon-box slate mx-auto mb-2"><i class="bi bi-clipboard-check"></i></div>
                                                <div class="fw-semibold text-dark">No reports found</div>
                                                <div class="small text-secondary">No waste reports match the selected filter.</div>
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function viewPersonnelTaskDetail(mainEl, reportId) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'personnel') {
            demoLogin('personnel');
            return;
        }
        const report = EcoStore.getReportById(reportId);
        if (!report) {
            flash('Report not found.', 'warning');
            navigate('#/personnel/tasks');
            return;
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <a href="#/personnel/tasks" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-arrow-left me-1"></i>Back to Reported Bins
                        </a>
                        <div class="d-flex align-items-center gap-2">
                            <span class="small text-secondary">Current Status:</span>
                            <span class="badge ${statusBadgeClass(report.current_status)} px-3 py-2 fs-6">
                                ${escapeHtml(report.current_status)} (${report.monitoring_state_label})
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-lg-7">
                    <div class="eco-card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                            <div>
                                <div class="small text-secondary font-monospace mb-1">${escapeHtml(report.tracking_code)}</div>
                                <h1 class="h5 fw-bold text-dark mb-1">${escapeHtml(report.title)}</h1>
                                <span class="badge bg-light text-dark border">${escapeHtml(report.waste_category)}</span>
                            </div>
                            <div class="text-end small text-secondary">
                                <div><strong class="text-dark">Time Submitted:</strong> ${formatDateTime(report.submission_timestamp)}</div>
                                ${report.resolved_timestamp ? `<div class="text-success"><strong>Marked ${escapeHtml(report.current_status)}:</strong> ${formatDateTime(report.resolved_timestamp)}</div>` : ''}
                            </div>
                        </div>

                        <p class="text-secondary small mb-3">${escapeHtml(report.description)}</p>

                        <div class="bg-light p-3 rounded-3 mb-3 border small">
                            <div class="mb-2">
                                <strong class="text-dark"><i class="bi bi-geo-alt text-danger me-1"></i>Report Location in Poblacion, Minglanilla:</strong><br>
                                <span class="text-secondary">${escapeHtml(report.location_description)}</span>
                            </div>
                            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div>
                                    <strong class="text-dark"><i class="bi bi-crosshair text-primary me-1"></i>GIS Coordinates:</strong>
                                    <span class="font-monospace text-dark">${report.latitude}, ${report.longitude}</span>
                                </div>
                                <div class="text-secondary">
                                    <strong class="text-dark">Reported by:</strong> ${escapeHtml(report.resident.full_name)}
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Reported Bin Photo (Resident)</div>
                                    ${report.photo_data_url
                                        ? `<img src="${report.photo_data_url}" class="img-fluid rounded border" style="max-height: 210px; object-fit: cover;" alt="Reported Waste">`
                                        : `<div class="text-secondary small py-4 bg-light rounded-3">No photo uploaded with report.</div>`
                                    }
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Cleaned / Collected Photo (Optional)</div>
                                    ${report.collection_proof_photo ? `
                                        <img src="${report.collection_proof_photo}" class="img-fluid rounded border" style="max-height: 210px; object-fit: cover;" alt="Cleaned or Collected Bin">
                                        ${report.collection_notes ? `<div class="small text-secondary mt-2 text-start p-2 bg-light rounded-3 border">"${escapeHtml(report.collection_notes)}"</div>` : ''}
                                    ` : `
                                        <div class="text-secondary small py-4 bg-light rounded-3">Optional photo after cleaning or collection.</div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-2">Pinpointed Bin Location on GIS Map</h2>
                        <div id="collectorTaskMap" class="eco-map-container map-sm"></div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="eco-card p-4 mb-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Update Report Status</h2>
                        ${report.is_outstanding ? `
                            <p class="small text-secondary mb-3">
                                Mark this reported garbage bin as <strong>Collected</strong> or <strong>Cleaned</strong> once attended to. This updates the status on the shared GIS map for administrators and residents.
                            </p>
                        ` : `
                            <div class="p-3 rounded-3 mb-3 small badge-status-completed">
                                <i class="bi bi-check-circle-fill me-1"></i>
                                Marked as <strong>${escapeHtml(report.current_status)}</strong> by <strong>${escapeHtml(report.resolved_by ? report.resolved_by.full_name : 'Personnel')}</strong>.
                            </div>
                        `}

                        <form id="personnelMarkForm">
                            <div class="mb-3">
                                <label class="form-label" for="resolutionStatusSelect">Mark Reported Bin Status</label>
                                <select class="form-select" id="resolutionStatusSelect">
                                    <option value="Collected" ${report.current_status === 'Collected' ? 'selected' : ''}>Collected (Bin Emptied / Collected)</option>
                                    <option value="Cleaned" ${report.current_status === 'Cleaned' ? 'selected' : ''}>Cleaned (Bin &amp; Area Cleaned)</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label" for="proofPhotoInput">Upload Photo of Cleaned/Collected Bin (Optional)</label>
                                <input type="file" class="form-control" id="proofPhotoInput" accept="image/*">
                            </div>
                            <div class="mb-4">
                                <label class="form-label" for="collectionNotesText">Remarks / Notes (Optional)</label>
                                <textarea class="form-control" id="collectionNotesText" rows="3" placeholder="e.g. Garbage bin emptied and surrounding area cleaned.">${escapeHtml(report.collection_notes || '')}</textarea>
                            </div>
                            <button type="submit" class="btn btn-brand w-100 py-2">Confirm Status Update</button>
                        </form>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Status Update History</h2>
                        <div class="eco-timeline">
                            ${report.status_history.map(h => `
                                <div class="timeline-step ${h.new_status === 'Collected' || h.new_status === 'Cleaned' ? 'completed' : ''}">
                                    <div class="timeline-step-dot"></div>
                                    <div class="d-flex justify-content-between align-items-baseline">
                                        <span class="badge ${statusBadgeClass(h.new_status)}">${escapeHtml(h.new_status)}</span>
                                        <span class="text-secondary" style="font-size: 0.72rem;">${formatDateTime(h.timestamp)}</span>
                                    </div>
                                    <div class="small fw-semibold text-dark mt-1">${escapeHtml(h.updated_by.full_name)} (${escapeHtml(h.updated_by.role)})</div>
                                    ${h.note ? `<div class="small text-secondary mt-1 p-2 bg-light rounded-3 border">${escapeHtml(h.note)}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initDetailMap('collectorTaskMap', report.latitude, report.longitude, report.tracking_code, report.current_status);

        let proofPhotoDataUrl = null;
        const proofInput = document.getElementById('proofPhotoInput');
        if (proofInput) {
            proofInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        proofPhotoDataUrl = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        document.getElementById('personnelMarkForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const newStatus = document.getElementById('resolutionStatusSelect').value;
            const notes = document.getElementById('collectionNotesText').value.trim();
            EcoStore.updateReportStatus({
                report_id: report.id,
                personnel_id: user.id,
                new_status: newStatus,
                notes: notes,
                proof_photo_data_url: proofPhotoDataUrl
            });
            flash(`Report ${report.tracking_code} marked as ${newStatus}!`, 'success');
            renderCurrentRoute();
        });
    }

    /* ----------------------------------------------------------------------
       View 6: System Administrator Views
       ---------------------------------------------------------------------- */
    function viewAdminDashboard(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }
        const allReports = EcoStore.getReports();
        const total_reports = allReports.length;
        const outstanding_reports = allReports.filter(r => r.current_status === 'Pending');
        const addressed_reports = allReports.filter(r => r.current_status === 'Collected' || r.current_status === 'Cleaned');
        const outstanding_count = outstanding_reports.length;
        const addressed_count = addressed_reports.length;
        const collected_count = allReports.filter(r => r.current_status === 'Collected').length;
        const cleaned_count = allReports.filter(r => r.current_status === 'Cleaned').length;
        const resolution_rate = total_reports > 0 ? ((addressed_count / total_reports) * 100).toFixed(1) : '0.0';
        const personnel_users = EcoStore.getAllUsers().filter(u => u.role === 'personnel' && u.account_status === 'active');

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="page-header-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div class="eyebrow-badge slate mb-2">
                                <i class="bi bi-shield-check"></i>
                                <span>System Administrator Monitoring &bull; Minglanilla Poblacion</span>
                            </div>
                            <h1 class="h3 fw-bold mb-1">Waste Concerns Monitoring Dashboard</h1>
                            <p class="text-secondary small mb-0">
                                View reported garbage bins as markers on the shared GIS map and monitor which concerns remain <strong>Outstanding</strong> and which have been <strong>Addressed</strong>.
                            </p>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="#/admin/map" class="btn btn-brand d-inline-flex align-items-center gap-2">
                                <i class="bi bi-pin-map-fill"></i>
                                <span>Open GIS Monitoring Map</span>
                            </a>
                            <a href="#/admin/reports" class="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                                <i class="bi bi-list-check"></i>
                                <span>Monitor All Concerns</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Total Reports</div>
                            <div class="kpi-value">${total_reports}</div>
                            <div class="kpi-subtext">Submitted concerns</div>
                        </div>
                        <div class="kpi-icon-box slate"><i class="bi bi-layers"></i></div>
                    </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Outstanding</div>
                            <div class="kpi-value text-warning">${outstanding_count}</div>
                            <div class="kpi-subtext">Pending action</div>
                        </div>
                        <div class="kpi-icon-box amber"><i class="bi bi-exclamation-circle"></i></div>
                    </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Addressed</div>
                            <div class="kpi-value text-success">${addressed_count}</div>
                            <div class="kpi-subtext">Cleaned or collected</div>
                        </div>
                        <div class="kpi-icon-box emerald"><i class="bi bi-check2-all"></i></div>
                    </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Collected</div>
                            <div class="kpi-value text-success">${collected_count}</div>
                            <div class="kpi-subtext">Marked Collected</div>
                        </div>
                        <div class="kpi-icon-box emerald"><i class="bi bi-truck"></i></div>
                    </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Cleaned</div>
                            <div class="kpi-value" style="color: var(--teal-600);">${cleaned_count}</div>
                            <div class="kpi-subtext">Marked Cleaned</div>
                        </div>
                        <div class="kpi-icon-box teal"><i class="bi bi-stars"></i></div>
                    </div>
                </div>
                <div class="col-lg-2 col-md-4 col-6">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Addressed Rate</div>
                            <div class="kpi-value">${resolution_rate}%</div>
                            <div class="kpi-subtext">${personnel_users.length} active personnel</div>
                        </div>
                        <div class="kpi-icon-box blue"><i class="bi bi-pie-chart"></i></div>
                    </div>
                </div>

                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                            <div>
                                <h2 class="h5 fw-bold mb-1">GIS-Based Waste Monitoring Map</h2>
                                <p class="text-secondary small mb-0">
                                    Shared GIS map displaying all resident-reported bins across Minglanilla Poblacion: <strong>Outstanding (Pending)</strong> vs. <strong>Addressed (Cleaned / Collected)</strong>.
                                </p>
                            </div>
                            <div>
                                <a href="#/admin/map" class="btn btn-sm btn-outline-secondary">
                                    <i class="bi bi-arrows-fullscreen me-1"></i>Open Full Map with Filters
                                </a>
                            </div>
                        </div>
                        <div id="adminDashboardMap" class="eco-map-container" style="height: 450px;"></div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <div>
                                <h3 class="h6 fw-bold mb-0">Outstanding Waste Concerns (${outstanding_count})</h3>
                                <div class="text-secondary small">Reported bins awaiting collection or cleaning</div>
                            </div>
                            <a href="#/admin/reports?status=Outstanding" class="btn btn-sm btn-outline-secondary">View All</a>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Reported Concern &amp; Location</th>
                                        <th>Submitted</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${outstanding_reports.length > 0 ? outstanding_reports.slice(0, 8).map(r => `
                                        <tr>
                                            <td class="fw-semibold font-monospace text-dark">${escapeHtml(r.tracking_code)}</td>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                <div class="text-secondary small"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                            </td>
                                            <td class="text-secondary small">${formatDateTime(r.submission_timestamp)}</td>
                                            <td class="text-end">
                                                <a href="#/admin/report/${r.id}" class="btn btn-xs btn-outline-secondary">View</a>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="4" class="text-center text-secondary py-5">No outstanding waste concerns remaining.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="eco-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                            <div>
                                <h3 class="h6 fw-bold mb-0">Recently Addressed Concerns (${addressed_count})</h3>
                                <div class="text-secondary small">Bins marked as Cleaned or Collected by personnel</div>
                            </div>
                            <a href="#/admin/reports?status=Addressed" class="btn btn-sm btn-outline-secondary">View All</a>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Location</th>
                                        <th>Status &amp; Personnel</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${addressed_reports.length > 0 ? addressed_reports.slice(0, 8).map(r => `
                                        <tr>
                                            <td class="fw-semibold font-monospace text-dark">${escapeHtml(r.tracking_code)}</td>
                                            <td class="small text-secondary">${escapeHtml(r.location_description)}</td>
                                            <td>
                                                <span class="badge ${statusBadgeClass(r.current_status)}">${escapeHtml(r.current_status)}</span>
                                                <div class="text-secondary" style="font-size: 0.72rem;">by ${escapeHtml(r.resolved_by ? r.resolved_by.full_name : 'Personnel')}</div>
                                            </td>
                                            <td class="text-end">
                                                <a href="#/admin/report/${r.id}" class="btn btn-xs btn-outline-secondary">View</a>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="4" class="text-center text-secondary py-5">No addressed reports recorded yet.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initReportsMap('adminDashboardMap', { initialStatus: 'all', role: 'admin' });
    }

    function viewAdminMap(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }

        mainEl.innerHTML = `
            <div class="row g-3">
                <div class="col-12">
                    <div class="eco-card p-3 px-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <h1 class="h5 fw-bold mb-0">GIS-Based Waste Monitoring Map</h1>
                                <div class="small text-secondary">
                                    Visualize reported garbage bins as markers and monitor <strong>Outstanding</strong> vs. <strong>Addressed</strong> concerns in Minglanilla Poblacion.
                                </div>
                            </div>
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <div>
                                    <select id="mapStatusFilter" class="form-select form-select-sm" style="min-width: 210px;">
                                        <option value="all">All Markers (Outstanding &amp; Addressed)</option>
                                        <option value="Outstanding">Outstanding Only (Pending)</option>
                                        <option value="Addressed">Addressed Only (Cleaned &amp; Collected)</option>
                                        <option value="Collected">Marked as Collected</option>
                                        <option value="Cleaned">Marked as Cleaned</option>
                                    </select>
                                </div>
                                <div>
                                    <select id="mapCategoryFilter" class="form-select form-select-sm" style="min-width: 190px;">
                                        <option value="all">All Waste Categories</option>
                                        ${WASTE_CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                                    </select>
                                </div>
                                <button type="button" id="btnResetFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="eco-card p-2">
                        <div id="fullCentralizedMap" class="eco-map-container map-lg"></div>
                    </div>
                </div>
            </div>
        `;

        const statusSelect = document.getElementById('mapStatusFilter');
        const categorySelect = document.getElementById('mapCategoryFilter');
        const resetBtn = document.getElementById('btnResetFilters');
        const reportsMap = EcoGIS.initReportsMap('fullCentralizedMap', { initialStatus: 'all', initialCategory: 'all', role: 'admin' });

        function applyFilters() {
            reportsMap.loadReports(statusSelect.value, categorySelect.value);
        }
        statusSelect.addEventListener('change', applyFilters);
        categorySelect.addEventListener('change', applyFilters);
        resetBtn.addEventListener('click', function () {
            statusSelect.value = 'all';
            categorySelect.value = 'all';
            applyFilters();
        });
    }

    function viewAdminReports(mainEl, params) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }
        const selected_status = params.get('status') || '';
        const selected_category = params.get('category') || '';
        const selected_personnel = params.get('personnel_id') || '';
        const search_query = params.get('search') || '';
        const personnel_list = EcoStore.getAllUsers().filter(u => u.role === 'personnel');

        let reports = EcoStore.getReports();
        if (selected_status === 'Outstanding') reports = reports.filter(r => r.current_status === 'Pending');
        else if (selected_status === 'Addressed') reports = reports.filter(r => r.current_status === 'Collected' || r.current_status === 'Cleaned');
        else if (selected_status) reports = reports.filter(r => r.current_status === selected_status);

        if (selected_category) reports = reports.filter(r => r.waste_category === selected_category);
        if (selected_personnel) reports = reports.filter(r => String(r.resolved_by_id) === String(selected_personnel));
        if (search_query) {
            const q = search_query.toLowerCase();
            reports = reports.filter(r =>
                r.tracking_code.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.location_description.toLowerCase().includes(q)
            );
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                            <div>
                                <h1 class="h4 fw-bold mb-1">Monitor Waste-Related Concerns</h1>
                                <p class="text-secondary small mb-0">
                                    Track which reported waste concerns in Minglanilla Poblacion remain <strong>Outstanding</strong> and which have been <strong>Addressed</strong>.
                                </p>
                            </div>
                            <div>
                                <span class="badge bg-light text-dark border px-3 py-2">${reports.length} Reports Found</span>
                            </div>
                        </div>

                        <form id="adminFilterForm" class="row g-3 mb-4 bg-light p-3 rounded-3 border">
                            <div class="col-md-3">
                                <label class="form-label">Monitoring Status</label>
                                <select id="flt_status" class="form-select form-select-sm">
                                    <option value="">All Concerns (Outstanding &amp; Addressed)</option>
                                    <option value="Outstanding" ${selected_status === 'Outstanding' ? 'selected' : ''}>Outstanding Only (Pending)</option>
                                    <option value="Addressed" ${selected_status === 'Addressed' ? 'selected' : ''}>Addressed (Cleaned &amp; Collected)</option>
                                    <option value="Collected" ${selected_status === 'Collected' ? 'selected' : ''}>Marked as Collected</option>
                                    <option value="Cleaned" ${selected_status === 'Cleaned' ? 'selected' : ''}>Marked as Cleaned</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Category</label>
                                <select id="flt_category" class="form-select form-select-sm">
                                    <option value="">All Waste Categories</option>
                                    ${WASTE_CATEGORIES.map(c => `<option value="${escapeHtml(c)}" ${selected_category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Addressed By Personnel</label>
                                <select id="flt_personnel" class="form-select form-select-sm">
                                    <option value="">All Personnel</option>
                                    ${personnel_list.map(p => `<option value="${p.id}" ${String(selected_personnel) === String(p.id) ? 'selected' : ''}>${escapeHtml(p.full_name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Search</label>
                                <div class="input-group input-group-sm">
                                    <input type="text" id="flt_search" class="form-control" placeholder="Code, title, or street..." value="${escapeHtml(search_query)}">
                                    <button class="btn btn-outline-secondary" type="submit"><i class="bi bi-search"></i></button>
                                </div>
                            </div>
                        </form>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Tracking ID</th>
                                        <th>Reported Concern</th>
                                        <th>Location &amp; Coordinates</th>
                                        <th>Resident</th>
                                        <th>Time Submitted</th>
                                        <th>Status</th>
                                        <th>Addressed By</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reports.length > 0 ? reports.map(r => `
                                        <tr>
                                            <td class="fw-semibold font-monospace text-dark">${escapeHtml(r.tracking_code)}</td>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(r.title)}</div>
                                                <span class="badge bg-light text-secondary border" style="font-size: 0.7rem;">${escapeHtml(r.waste_category)}</span>
                                            </td>
                                            <td>
                                                <div class="small text-dark"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHtml(r.location_description)}</div>
                                                <div class="text-secondary font-monospace" style="font-size: 0.72rem;">${r.latitude}, ${r.longitude}</div>
                                            </td>
                                            <td class="small">${escapeHtml(r.resident.full_name)}</td>
                                            <td class="small text-secondary">${formatDateTime(r.submission_timestamp)}</td>
                                            <td>
                                                <span class="badge ${statusBadgeClass(r.current_status)}">
                                                    ${escapeHtml(r.current_status)} (${r.monitoring_state_label})
                                                </span>
                                            </td>
                                            <td class="small">
                                                ${r.resolved_by ? `
                                                    <div class="fw-semibold text-dark">${escapeHtml(r.resolved_by.full_name)}</div>
                                                    <div class="text-secondary" style="font-size: 0.7rem;">${formatDateTime(r.resolved_timestamp)}</div>
                                                ` : `<span class="text-warning fw-semibold">Outstanding</span>`}
                                            </td>
                                            <td class="text-end">
                                                <a href="#/admin/report/${r.id}" class="btn btn-sm btn-outline-secondary">Details</a>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
                                                <div class="kpi-icon-box slate mx-auto mb-2"><i class="bi bi-card-list"></i></div>
                                                <div class="fw-semibold text-dark">No matching reports</div>
                                                <div class="small text-secondary">No waste reports match these filter criteria.</div>
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        function triggerFilter() {
            const q = new URLSearchParams();
            const st = document.getElementById('flt_status').value;
            const cat = document.getElementById('flt_category').value;
            const per = document.getElementById('flt_personnel').value;
            const srch = document.getElementById('flt_search').value.trim();
            if (st) q.set('status', st);
            if (cat) q.set('category', cat);
            if (per) q.set('personnel_id', per);
            if (srch) q.set('search', srch);
            navigate(`#/admin/reports?${q.toString()}`);
        }

        document.getElementById('flt_status').addEventListener('change', triggerFilter);
        document.getElementById('flt_category').addEventListener('change', triggerFilter);
        document.getElementById('flt_personnel').addEventListener('change', triggerFilter);
        document.getElementById('adminFilterForm').addEventListener('submit', function (e) {
            e.preventDefault();
            triggerFilter();
        });
    }

    function viewAdminReportDetail(mainEl, reportId) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }
        const report = EcoStore.getReportById(reportId);
        if (!report) {
            flash('Report not found.', 'warning');
            navigate('#/admin/reports');
            return;
        }

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <a href="#/admin/reports" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-arrow-left me-1"></i>Back to Concerns List
                        </a>
                        <div class="d-flex align-items-center gap-2">
                            <span class="text-secondary small">Monitoring Status:</span>
                            <span class="badge ${statusBadgeClass(report.current_status)} fs-6 px-3 py-2">
                                ${escapeHtml(report.current_status)} (${report.monitoring_state_label})
                            </span>
                        </div>
                    </div>
                </div>

                <div class="col-lg-7">
                    <div class="eco-card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                            <div>
                                <div class="text-secondary small font-monospace mb-1">${escapeHtml(report.tracking_code)}</div>
                                <h1 class="h5 fw-bold text-dark mb-1">${escapeHtml(report.title)}</h1>
                                <span class="badge bg-light text-dark border">${escapeHtml(report.waste_category)}</span>
                            </div>
                            <div class="text-end small text-secondary">
                                <div><strong class="text-dark">Time Submitted:</strong> ${formatDateTime(report.submission_timestamp)}</div>
                                <div><strong class="text-dark">Last Updated:</strong> ${formatDateTime(report.last_updated_timestamp)}</div>
                            </div>
                        </div>

                        <p class="text-secondary small mb-3">${escapeHtml(report.description)}</p>

                        <div class="bg-light p-3 rounded-3 mb-3 small border">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <strong class="text-dark"><i class="bi bi-person text-primary me-1"></i>Reporting Resident:</strong><br>
                                    <span class="text-secondary">${escapeHtml(report.resident.full_name)} (${escapeHtml(report.resident.email)})</span><br>
                                    <span class="text-secondary">Tel: ${escapeHtml(report.resident.phone_number || 'Not provided')}</span>
                                </div>
                                <div class="col-md-6">
                                    <strong class="text-dark"><i class="bi bi-geo-alt text-danger me-1"></i>Report Location:</strong><br>
                                    <span class="text-secondary">${escapeHtml(report.location_description)}</span><br>
                                    <span class="font-monospace text-dark">Lat: ${report.latitude}, Lng: ${report.longitude}</span>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Recorded Report Photo (Resident)</div>
                                    ${report.photo_data_url
                                        ? `<img src="${report.photo_data_url}" class="img-fluid rounded border" style="max-height: 210px; object-fit: cover;" alt="Reported Waste">`
                                        : `<div class="text-secondary small py-4 bg-light rounded-3">No photo uploaded by resident.</div>`
                                    }
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="border rounded-3 p-3 text-center bg-white h-100">
                                    <div class="small fw-semibold text-dark mb-2">Cleaned / Collected Photo (Personnel)</div>
                                    ${report.collection_proof_photo ? `
                                        <img src="${report.collection_proof_photo}" class="img-fluid rounded border" style="max-height: 210px; object-fit: cover;" alt="Collection Proof">
                                        ${report.collection_notes ? `<div class="small text-secondary mt-2 text-start p-2 bg-light rounded-3 border">"${escapeHtml(report.collection_notes)}"</div>` : ''}
                                    ` : `
                                        <div class="text-secondary small py-4 bg-light rounded-3">No collection photo attached.</div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-2">Pinpointed Bin Location on GIS Map</h2>
                        <div id="adminReportDetailMap" class="eco-map-container map-sm"></div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="eco-card p-4 mb-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Administrator Monitoring Summary</h2>
                        ${report.is_outstanding ? `
                            <div class="p-3 rounded-3 badge-status-pending">
                                <div class="fw-bold mb-1"><i class="bi bi-exclamation-circle me-1"></i>Concern Remains OUTSTANDING</div>
                                <p class="small mb-0">
                                    This reported garbage bin is currently visible as an <strong>Outstanding (Pending)</strong> marker on the shared GIS map. Once garbage collection personnel clean or collect the bin and update its status, this record will automatically transition to <strong>Addressed</strong>.
                                </p>
                            </div>
                        ` : `
                            <div class="p-3 rounded-3 badge-status-completed">
                                <div class="fw-bold mb-2"><i class="bi bi-check-circle-fill me-1"></i>Concern ADDRESSED (${escapeHtml(report.current_status)})</div>
                                <div class="small">
                                    <div class="mb-1"><strong>Status Updated To:</strong> ${escapeHtml(report.current_status)}</div>
                                    <div class="mb-1"><strong>Collection Personnel:</strong> ${escapeHtml(report.resolved_by ? report.resolved_by.full_name : 'Personnel')}</div>
                                    <div class="mb-1"><strong>Time Addressed:</strong> ${formatDateTime(report.resolved_timestamp)}</div>
                                    ${report.collection_notes ? `<div class="mt-2 p-2 bg-white text-dark rounded-3 border"><strong>Remarks:</strong> ${escapeHtml(report.collection_notes)}</div>` : ''}
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-3 pb-2 border-bottom">Recorded Status History</h2>
                        <div class="eco-timeline">
                            ${report.status_history.map(h => `
                                <div class="timeline-step ${h.new_status === 'Collected' || h.new_status === 'Cleaned' ? 'completed' : ''}">
                                    <div class="timeline-step-dot"></div>
                                    <div class="d-flex justify-content-between align-items-baseline">
                                        <span class="badge ${statusBadgeClass(h.new_status)} mb-1">${escapeHtml(h.new_status)}</span>
                                        <span class="text-secondary" style="font-size: 0.72rem;">${formatDateTime(h.timestamp)}</span>
                                    </div>
                                    <div class="small fw-semibold text-dark mt-1">
                                        ${escapeHtml(h.updated_by.full_name)} (${escapeHtml(h.updated_by.role)})
                                    </div>
                                    ${h.note ? `<div class="small text-secondary mt-1 p-2 bg-light rounded-3 border">${escapeHtml(h.note)}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        EcoGIS.initDetailMap('adminReportDetailMap', report.latitude, report.longitude, report.tracking_code, report.current_status);
    }

    function toggleAccountStatus(userId) {
        const updated = EcoStore.toggleUserStatus(userId);
        if (updated) {
            flash(`Account status for ${updated.full_name} updated to ${updated.account_status}.`, 'info');
        }
        renderCurrentRoute();
    }

    function viewAdminUsers(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }
        const users = EcoStore.getAllUsers();

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="eco-card p-4">
                        <h2 class="h6 fw-bold mb-2 pb-2 border-bottom">Register Collection Personnel</h2>
                        <p class="text-secondary small mb-3">
                            Create an authorized account for garbage collection personnel operating in Minglanilla Poblacion.
                        </p>
                        <form id="createPersonnelForm">
                            <div class="mb-3">
                                <label class="form-label">Personnel Full Name</label>
                                <input type="text" class="form-control" id="p_name" placeholder="e.g. Pedro Penduko" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email Address</label>
                                <input type="email" class="form-control" id="p_email" placeholder="collector@ecotrack.ph" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" id="p_username" placeholder="pedro_collector" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Contact Phone Number</label>
                                <input type="text" class="form-control" id="p_phone" placeholder="0918-000-0000" required>
                            </div>
                            <div class="mb-4">
                                <label class="form-label">Initial Password</label>
                                <input type="password" class="form-control" id="p_password" placeholder="••••••••" required>
                            </div>
                            <button type="submit" class="btn btn-brand w-100">Register Personnel Account</button>
                        </form>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="eco-card p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                            <div>
                                <h1 class="h5 fw-bold mb-1">Registered System Accounts</h1>
                                <div class="text-secondary small">Manage residents, garbage collection personnel, and administrators.</div>
                            </div>
                            <span class="badge bg-light text-dark border px-3 py-2">${users.length} Total Accounts</span>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th class="text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(u => `
                                        <tr>
                                            <td>
                                                <div class="fw-semibold text-dark">${escapeHtml(u.full_name)}</div>
                                                <div class="small text-secondary">@${escapeHtml(u.username)} &bull; ${escapeHtml(u.email)}</div>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">${escapeHtml(u.role.charAt(0).toUpperCase() + u.role.slice(1))}</span>
                                            </td>
                                            <td class="small text-secondary">${escapeHtml(u.phone_number || 'N/A')}</td>
                                            <td>
                                                ${u.account_status === 'active'
                                                    ? '<span class="badge badge-status-completed">Active</span>'
                                                    : '<span class="badge badge-status-rejected">Suspended</span>'
                                                }
                                            </td>
                                            <td class="small text-secondary">${formatDate(u.created_at)}</td>
                                            <td class="text-end">
                                                ${u.id !== user.id ? `
                                                    <button type="button" class="btn btn-xs ${u.account_status === 'active' ? 'btn-outline-secondary' : 'btn-brand'}" onclick="EcoApp.toggleAccountStatus(${u.id})">
                                                        ${u.account_status === 'active' ? 'Suspend' : 'Activate'}
                                                    </button>
                                                ` : '<span class="text-secondary small">Current</span>'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('createPersonnelForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const res = EcoStore.createUser({
                full_name: document.getElementById('p_name').value.trim(),
                email: document.getElementById('p_email').value.trim(),
                username: document.getElementById('p_username').value.trim(),
                phone_number: document.getElementById('p_phone').value.trim(),
                password: document.getElementById('p_password').value,
                role: 'personnel'
            });
            if (res.error) {
                flash(res.error, 'danger');
                renderFlashMessages();
                return;
            }
            flash(`Garbage collection personnel account created for ${res.user.full_name}.`, 'success');
            renderCurrentRoute();
        });
    }

    function viewAdminAuditLog(mainEl) {
        const user = EcoStore.getCurrentUser();
        if (!user || user.role !== 'admin') {
            demoLogin('admin');
            return;
        }
        const history_records = EcoStore.getAuditHistory();

        mainEl.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="eco-card p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                            <div>
                                <h1 class="h4 fw-bold mb-1">Operational Status Log</h1>
                                <p class="text-secondary small mb-0">Complete history of report submissions and Cleaned/Collected status updates.</p>
                            </div>
                            <span class="badge bg-light text-dark border px-3 py-2">${history_records.length} Records</span>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Tracking ID</th>
                                        <th>Previous</th>
                                        <th>New Status</th>
                                        <th>Updated By</th>
                                        <th>Remarks</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history_records.length > 0 ? history_records.map(h => `
                                        <tr>
                                            <td class="small text-secondary font-monospace">${formatDateTime(h.timestamp)}</td>
                                            <td><span class="fw-semibold font-monospace text-dark">${escapeHtml(h.report ? h.report.tracking_code : 'N/A')}</span></td>
                                            <td><span class="badge bg-light text-secondary border">${escapeHtml(h.previous_status)}</span></td>
                                            <td><span class="badge ${statusBadgeClass(h.new_status)}">${escapeHtml(h.new_status)}</span></td>
                                            <td class="small">
                                                <span class="fw-semibold text-dark">${escapeHtml(h.updated_by.full_name)}</span>
                                                <span class="text-secondary">(${escapeHtml(h.updated_by.role)})</span>
                                            </td>
                                            <td class="small text-secondary">${escapeHtml(h.note || 'Status updated')}</td>
                                            <td class="text-end">
                                                ${h.report ? `<a href="#/admin/report/${h.report.id}" class="btn btn-xs btn-outline-secondary">View</a>` : ''}
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="7" class="text-center text-secondary py-5">No status update records found.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ----------------------------------------------------------------------
       Main Route Dispatcher
       ---------------------------------------------------------------------- */
    function renderCurrentRoute() {
        const rawHash = window.location.hash || '#/';
        const cleanHash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
        const [pathPart, queryPart] = cleanHash.split('?');
        const routePath = pathPart || '/';
        const params = new URLSearchParams(queryPart || '');

        renderNavbar(routePath);
        renderFlashMessages();

        const mainEl = document.getElementById('appMainContent');
        if (!mainEl) return;

        window.scrollTo({ top: 0, behavior: 'instant' });

        if (routePath === '/' || routePath === '') {
            viewLanding(mainEl);
        } else if (routePath === '/about') {
            viewAbout(mainEl);
        } else if (routePath === '/login') {
            viewLogin(mainEl);
        } else if (routePath === '/register') {
            viewRegister(mainEl);
        } else if (routePath === '/resident/dashboard') {
            viewResidentDashboard(mainEl);
        } else if (routePath === '/resident/report/new') {
            viewResidentNewReport(mainEl);
        } else if (routePath === '/resident/reports') {
            viewResidentReports(mainEl, params);
        } else if (routePath.startsWith('/resident/report/')) {
            const id = routePath.split('/').pop();
            viewResidentTrackReport(mainEl, id);
        } else if (routePath === '/resident/notifications') {
            viewResidentNotifications(mainEl);
        } else if (routePath === '/personnel/dashboard') {
            viewPersonnelDashboard(mainEl);
        } else if (routePath === '/personnel/map') {
            viewPersonnelMap(mainEl);
        } else if (routePath === '/personnel/tasks') {
            viewPersonnelTasks(mainEl, params);
        } else if (routePath.startsWith('/personnel/report/')) {
            const id = routePath.split('/').pop();
            viewPersonnelTaskDetail(mainEl, id);
        } else if (routePath === '/admin/dashboard') {
            viewAdminDashboard(mainEl);
        } else if (routePath === '/admin/map') {
            viewAdminMap(mainEl);
        } else if (routePath === '/admin/reports') {
            viewAdminReports(mainEl, params);
        } else if (routePath.startsWith('/admin/report/')) {
            const id = routePath.split('/').pop();
            viewAdminReportDetail(mainEl, id);
        } else if (routePath === '/admin/users') {
            viewAdminUsers(mainEl);
        } else if (routePath === '/admin/audit-log') {
            viewAdminAuditLog(mainEl);
        } else {
            viewLanding(mainEl);
        }
    }

    function init() {
        window.addEventListener('hashchange', renderCurrentRoute);
        renderCurrentRoute();
    }

    return {
        init,
        navigate,
        demoLogin,
        logout,
        quickMarkReport,
        toggleAccountStatus,
        loadSampleData,
        clearAllReports
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    EcoApp.init();
});
