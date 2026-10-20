/**
 * ECO TRACK - GIS Mapping Module
 * Target Service Area: Poblacion, Minglanilla, Cebu, Philippines
 * Powered by Leaflet.js & OpenStreetMap
 */

const EcoGIS = (function () {
    // Center point: Minglanilla Town Plaza / Municipal Hall area in Poblacion
    const POBLACION_CENTER = [10.2450, 123.7960];
    const DEFAULT_ZOOM = 16;

    // Status colors
    const STATUS_COLORS = {
        'Pending': '#f59e0b',
        'Verified': '#3b82f6',
        'Assigned': '#6366f1',
        'In Progress': '#06b6d4',
        'Collected': '#14b8a6',
        'Completed': '#10b981',
        'Rejected': '#ef4444'
    };

    /**
     * Creates a custom HTML/SVG map marker icon based on status
     */
    function createStatusIcon(status) {
        const color = STATUS_COLORS[status] || '#64748b';
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div style="
                background-color: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 11px;
                font-weight: bold;
            ">●</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
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

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ECO TRACK Poblacion, Minglanilla'
        }).addTo(map);

        return map;
    }

    /**
     * Fetches and adds the Poblacion, Minglanilla service boundary polygon
     */
    function addBoundaryLayer(map, callback) {
        fetch('/api/boundary')
            .then(res => res.json())
            .then(geojson => {
                const boundaryLayer = L.geoJSON(geojson, {
                    style: {
                        color: '#10b981',
                        weight: 2.5,
                        dashArray: '6, 6',
                        fillColor: '#10b981',
                        fillOpacity: 0.12
                    },
                    onEachFeature: function (feature, layer) {
                        layer.bindTooltip(
                            "<strong>Service Boundary</strong><br>Barangay Poblacion (Wards 1–4), Minglanilla, Cebu<br><em>(Designated Service Zone - Approximate Boundary until verified)</em>",
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
                <div class="fw-bold mb-2 pb-1 border-bottom" style="font-size: 0.75rem;">
                    <i class="bi bi-info-circle me-1"></i> REPORT STATUS LEGEND
                </div>
                ${Object.entries(STATUS_COLORS).map(([status, color]) => `
                    <div class="map-legend-item">
                        <span class="legend-dot" style="background-color: ${color};"></span>
                        <span style="font-size: 0.75rem;">${status}</span>
                    </div>
                `).join('')}
                <div class="mt-2 pt-1 border-top text-muted" style="font-size: 0.65rem;">
                    <i class="bi bi-geo-alt-fill text-success"></i> Green dashed line: Poblacion Service Zone
                </div>
            `;
            return div;
        };
        legend.addTo(map);
    }

    /**
     * REPORT PICKER MAP (For Resident Report Submission)
     * Allows clicking, tapping, and dragging marker with live server-side boundary validation.
     */
    function initReportPickerMap(containerId, latInputId, lngInputId, previewContainerId, submitBtnId) {
        const map = createBaseMap(containerId);
        addBoundaryLayer(map);

        let marker = null;
        const latInput = document.getElementById(latInputId);
        const lngInput = document.getElementById(lngInputId);
        const previewEl = document.getElementById(previewContainerId);
        const submitBtn = document.getElementById(submitBtnId);

        // Update coordinates and query server validator
        function updateCoordinates(lat, lng) {
            lat = parseFloat(lat.toFixed(6));
            lng = parseFloat(lng.toFixed(6));

            latInput.value = lat;
            lngInput.value = lng;

            // Validate against Poblacion service area via server API
            fetch(`/api/validate-coords?lat=${lat}&lng=${lng}`)
                .then(res => res.json())
                .then(data => {
                    if (previewEl) {
                        if (data.valid) {
                            previewEl.className = 'coordinate-preview-box valid mt-3 text-center';
                            previewEl.innerHTML = `
                                <div class="text-success fw-bold fs-6 mb-1 d-flex align-items-center justify-content-center gap-2">
                                    <i class="bi bi-check-circle-fill fs-5"></i> <span>Location Inside Poblacion — Ready to Submit!</span>
                                </div>
                                <div class="small text-muted font-monospace">GPS: ${lat}, ${lng}</div>
                            `;
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.classList.remove('btn-secondary');
                                submitBtn.classList.add('btn-success');
                            }
                        } else {
                            previewEl.className = 'coordinate-preview-box invalid mt-3 text-center';
                            previewEl.innerHTML = `
                                <div class="text-danger fw-bold fs-6 mb-1 d-flex align-items-center justify-content-center gap-2">
                                    <i class="bi bi-x-circle-fill fs-5"></i> <span>Outside Poblacion Service Area</span>
                                </div>
                                <div class="small text-danger">Please tap inside the green dashed boundary on the map.</div>
                            `;
                            if (submitBtn) {
                                submitBtn.disabled = true;
                                submitBtn.classList.remove('btn-success');
                                submitBtn.classList.add('btn-secondary');
                            }
                        }
                    }
                })
                .catch(err => {
                    console.error('Validation check error:', err);
                });
        }

        // Set or move marker
        function setMarker(lat, lng) {
            if (!marker) {
                const pickerIcon = L.divIcon({
                    className: 'custom-picker-pin',
                    html: `
                        <div style="
                            background-color: #ef4444;
                            width: 32px;
                            height: 32px;
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid #ffffff;
                            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: grab;
                        ">
                            <span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">🗑️</span>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
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

        // Click to place or move marker
        map.on('click', function (e) {
            setMarker(e.latlng.lat, e.latlng.lng);
        });

        // Initialize at center if values already present
        if (latInput.value && lngInput.value) {
            setMarker(parseFloat(latInput.value), parseFloat(lngInput.value));
        }

        return { map, setMarker };
    }

    /**
     * REPORTS MAP (For Admin centralized map, Resident dashboard, or Public view)
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
                            photoHtml = `<div class="mt-2 text-center"><img src="${props.photo_url}" class="img-fluid rounded border" style="max-height: 120px; object-fit: cover;"></div>`;
                        }

                        let adminDetails = '';
                        if (props.resident_name) {
                            adminDetails += `<div class="small text-muted"><strong>Reported by:</strong> ${props.resident_name}</div>`;
                        }
                        if (props.assigned_personnel) {
                            adminDetails += `<div class="small text-muted"><strong>Assigned to:</strong> ${props.assigned_personnel} (${props.priority || 'Normal'})</div>`;
                        }

                        let actionBtn = '';
                        if (options.role === 'admin') {
                            actionBtn = `<a href="/admin/report/${props.id}" class="btn btn-sm btn-primary w-100 mt-2">Review & Manage Report</a>`;
                        } else if (options.role === 'resident') {
                            actionBtn = `<a href="/resident/report/${props.id}" class="btn btn-sm btn-outline-success w-100 mt-2">Track Report Progress</a>`;
                        }

                        const popupContent = `
                            <div style="min-width: 200px; font-family: system-ui;">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="badge ${getStatusBadgeClass(props.status)}">${props.status}</span>
                                    <small class="text-muted">${props.tracking_code}</small>
                                </div>
                                <h6 class="mb-1 text-dark fw-bold">${props.title}</h6>
                                <div class="small text-muted mb-1"><i class="bi bi-tag-fill me-1"></i>${props.category}</div>
                                <div class="small mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${props.location_description}</div>
                                <div class="small text-muted mb-1"><i class="bi bi-clock me-1"></i>${props.submitted_at}</div>
                                ${adminDetails}
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
     * SINGLE REPORT DETAIL MAP (Shows exact location pin with focus)
     */
    function initDetailMap(containerId, lat, lng, trackingCode, status) {
        const map = createBaseMap(containerId, { center: [lat, lng], zoom: 17 });
        addBoundaryLayer(map);

        const icon = createStatusIcon(status);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
        marker.bindPopup(`<strong>${trackingCode}</strong><br>Status: <em>${status}</em><br>Lat: ${lat}<br>Lng: ${lng}`).openPopup();

        // Pulsing circle around the pin
        L.circle([lat, lng], {
            color: STATUS_COLORS[status] || '#10b981',
            fillColor: STATUS_COLORS[status] || '#10b981',
            fillOpacity: 0.15,
            radius: 35
        }).addTo(map);

        return map;
    }

    function getStatusBadgeClass(status) {
        const classes = {
            'Pending': 'badge-status-pending',
            'Verified': 'badge-status-verified',
            'Assigned': 'badge-status-assigned',
            'In Progress': 'badge-status-inprogress',
            'Collected': 'badge-status-collected',
            'Completed': 'badge-status-completed',
            'Rejected': 'badge-status-rejected'
        };
        return classes[status] || 'bg-secondary';
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
