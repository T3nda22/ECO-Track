/**
 * ECO TRACK - GIS Mapping Module
 * A Proposed Waste Management System for Minglanilla, Cebu
 * Pilot Area: Barangay Poblacion, Minglanilla, Cebu, Philippines
 * Powered by Leaflet.js & OpenStreetMap
 */

const EcoGIS = (function () {
    // Center point: Minglanilla Town Plaza / Municipal Hall area in Poblacion
    const POBLACION_CENTER = [10.2450, 123.7960];
    const DEFAULT_ZOOM = 16;

    // Status colors matching the research workflow:
    // Pending (Outstanding) -> Collected / Cleaned (Addressed)
    const STATUS_COLORS = {
        'Pending': '#f59e0b',     // Amber: Outstanding (Needs Cleaning / Collection)
        'Collected': '#059669',   // Emerald: Addressed (Marked as Collected)
        'Cleaned': '#0d9488'      // Teal: Addressed (Marked as Cleaned)
    };

    const STATUS_LABELS = {
        'Pending': 'Pending (Outstanding)',
        'Collected': 'Collected (Addressed)',
        'Cleaned': 'Cleaned (Addressed)'
    };

    /**
     * Creates a custom HTML/SVG map marker icon based on status
     */
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

    /**
     * Initializes base Leaflet map with OpenStreetMap tiles
     */
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

    /**
     * Fetches and adds the Minglanilla Poblacion pilot boundary polygon
     */
    function addBoundaryLayer(map, callback) {
        fetch('/api/boundary')
            .then(res => res.json())
            .then(geojson => {
                const boundaryLayer = L.geoJSON(geojson, {
                    style: {
                        color: '#059669',
                        weight: 2,
                        dashArray: '6, 6',
                        fillColor: '#10b981',
                        fillOpacity: 0.08
                    },
                    onEachFeature: function (feature, layer) {
                        layer.bindTooltip(
                            "<strong>Minglanilla Poblacion Pilot Area</strong><br>Barangay Poblacion (Wards 1–4), Minglanilla, Cebu",
                            { sticky: true }
                        );
                    }
                }).addTo(map);

                if (callback) callback(boundaryLayer);
            })
            .catch(err => {
                console.warn('Could not load service boundary GeoJSON:', err);
            });
    }

    /**
     * Attaches status legend to map control corner
     */
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

    /**
     * REPORT PICKER MAP (For Resident Report Submission)
     */
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

            fetch(`/api/validate-coords?lat=${lat}&lng=${lng}`)
                .then(res => res.json())
                .then(data => {
                    if (previewEl) {
                        if (data.valid) {
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
                })
                .catch(err => {
                    console.error('Validation check error:', err);
                });
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

        if (latInput.value && lngInput.value) {
            setMarker(parseFloat(latInput.value), parseFloat(lngInput.value));
        }

        return { map, setMarker };
    }

    /**
     * SHARED GIS REPORTS MAP
     */
    function initReportsMap(containerId, options = {}) {
        const map = createBaseMap(containerId, options);
        addBoundaryLayer(map);
        addLegendControl(map);

        let markersLayer = L.layerGroup().addTo(map);

        function loadReports(filterStatus = 'all', filterCategory = 'all') {
            markersLayer.clearLayers();

            let url = '/api/reports-geojson?';
            if (filterStatus && filterStatus !== 'all') url += `status=${encodeURIComponent(filterStatus)}&`;
            if (filterCategory && filterCategory !== 'all') url += `category=${encodeURIComponent(filterCategory)}&`;

            fetch(url)
                .then(res => res.json())
                .then(geojson => {
                    geojson.features.forEach(feature => {
                        const coords = feature.geometry.coordinates;
                        const props = feature.properties;
                        const icon = createStatusIcon(props.status);

                        const marker = L.marker([coords[1], coords[0]], { icon: icon });

                        let photoHtml = '';
                        if (props.photo_url) {
                            photoHtml = `<div class="mt-2 text-center"><img src="${props.photo_url}" class="img-fluid rounded border" style="max-height: 110px; object-fit: cover;" alt="Reported Bin Photo"></div>`;
                        }

                        let staffDetails = '';
                        if (props.resident_name) {
                            staffDetails += `<div class="small text-secondary"><strong>Reported by:</strong> ${props.resident_name}</div>`;
                        }
                        if (props.resolved_by_name) {
                            staffDetails += `<div class="small text-success fw-semibold"><strong>${props.status} by:</strong> ${props.resolved_by_name} (${props.resolved_at || ''})</div>`;
                        }

                        let actionBtn = '';
                        if (options.role === 'personnel') {
                            if (props.status === 'Pending') {
                                actionBtn = `<a href="/personnel/report/${props.id}" class="btn btn-sm btn-brand w-100 mt-2">Mark Cleaned / Collected</a>`;
                            } else {
                                actionBtn = `<a href="/personnel/report/${props.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Report Details</a>`;
                            }
                        } else if (options.role === 'admin') {
                            actionBtn = `<a href="/admin/report/${props.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Monitoring Details</a>`;
                        } else if (options.role === 'resident') {
                            actionBtn = `<a href="/resident/report/${props.id}" class="btn btn-sm btn-outline-secondary w-100 mt-2">View Report Status</a>`;
                        }

                        const statePill = props.status === 'Pending'
                            ? `<span class="badge badge-status-pending">Outstanding (${props.status})</span>`
                            : `<span class="badge badge-status-completed">Addressed (${props.status})</span>`;

                        const popupContent = `
                            <div style="min-width: 225px; font-family: 'Inter', system-ui, sans-serif;">
                                <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
                                    ${statePill}
                                    <small class="text-secondary font-monospace">${props.tracking_code}</small>
                                </div>
                                <div class="mb-1 text-dark fw-bold" style="font-size: 0.9rem;">${props.title}</div>
                                <div class="small text-secondary mb-1">${props.category}</div>
                                <div class="small text-dark mb-1"><i class="bi bi-geo-alt text-danger me-1"></i>${props.location_description}</div>
                                <div class="small text-secondary mb-1">Submitted: ${props.submitted_at}</div>
                                ${staffDetails}
                                ${photoHtml}
                                ${actionBtn}
                            </div>
                        `;

                        marker.bindPopup(popupContent);
                        markersLayer.addLayer(marker);
                    });
                })
                .catch(err => console.error('Error fetching reports GeoJSON:', err));
        }

        loadReports(options.initialStatus || 'all', options.initialCategory || 'all');

        return { map, loadReports };
    }

    /**
     * SINGLE REPORT DETAIL MAP
     */
    function initDetailMap(containerId, lat, lng, trackingCode, status) {
        const map = createBaseMap(containerId, { center: [lat, lng], zoom: 17 });
        addBoundaryLayer(map);

        const icon = createStatusIcon(status);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
        const label = STATUS_LABELS[status] || status;
        marker.bindPopup(`<strong>${trackingCode}</strong><br>Status: <em>${label}</em><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();

        L.circle([lat, lng], {
            color: STATUS_COLORS[status] || '#059669',
            fillColor: STATUS_COLORS[status] || '#059669',
            fillOpacity: 0.14,
            radius: 35
        }).addTo(map);

        return map;
    }

    return {
        POBLACION_CENTER,
        STATUS_COLORS,
        createBaseMap,
        addBoundaryLayer,
        initReportPickerMap,
        initReportsMap,
        initDetailMap
    };
})();
