// ===============================
// FILE: app.js
// ===============================
const APP_CONFIG = {
  userLat: 44.77,
  userLon: 17.19,
  initialTrackedCount: 8,
  worldAtlasUrl: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
};

const SATELLITES = [
  { id: "iss", name: "ISS", type: "Space Station", color: "#f43f5e", inc: 51.6, period: 92, alt: 408, phase0: 0.2 },
  { id: "noaa19", name: "NOAA-19", type: "Weather", color: "#3b82f6", inc: 98.8, period: 102, alt: 870, phase0: 1.1 },
  { id: "goes16", name: "GOES-16", type: "Geostationary", color: "#22d3a5", inc: 0.0, period: 1436, alt: 35786, phase0: -1.36 },
  { id: "terra", name: "Terra", type: "Earth Observation", color: "#f59e0b", inc: 98.2, period: 99, alt: 705, phase0: 2.3 },
  { id: "hubble", name: "Hubble", type: "Telescope", color: "#a78bfa", inc: 28.5, period: 95, alt: 547, phase0: 0.7 },
  { id: "sentinel", name: "Sentinel-2A", type: "Earth Observation", color: "#fb7185", inc: 98.6, period: 100, alt: 786, phase0: 3.8 },
  { id: "gps25", name: "GPS-IIF-25", type: "Navigation", color: "#fbbf24", inc: 55.0, period: 718, alt: 20200, phase0: 5.1 },
  { id: "aura", name: "Aura", type: "Atmospheric", color: "#34d399", inc: 98.2, period: 99.6, alt: 705, phase0: 4.4 },
];

const state = {
  startTime: Date.now() / 1000,
  selectedId: null,
  viewMode: "auto",
  rotationY: 0,
  rotationX: 0,
  autoRotationAngle: 0,
  dragging: false,
  dragStart: null,
  dragRotation: null,
  dragHintDismissed: false,
  topoData: null,
  projection: null,
  geoPath: null,
  canvasWidth: 0,
  canvasHeight: 0,
  globeRadius: 0,
  lastCanvasWidth: 0,
  lastCanvasHeight: 0,
};

const dom = {
  starfieldCanvas: document.getElementById("starfield"),
  globeCanvas: document.getElementById("globe-canvas"),
  satList: document.getElementById("sat-list"),
  detailPanel: document.getElementById("detail-panel"),
  utcClock: document.getElementById("utc-clock"),
  trackedCount: document.getElementById("tracked-count"),
  visibleCount: document.getElementById("visible-count"),
  epochOut: document.getElementById("epoch-out"),
  rotationOut: document.getElementById("rotation-out"),
  dragHint: document.getElementById("drag-hint"),
  resetTimeBtn: document.getElementById("reset-time-btn"),
  viewButtons: {
    auto: document.getElementById("btn-auto"),
    north: document.getElementById("btn-north"),
    track: document.getElementById("btn-track"),
  },
};

const starfield = {
  ctx: dom.starfieldCanvas.getContext("2d"),
  stars: [],
};

const globe = {
  ctx: dom.globeCanvas.getContext("2d"),
};

function getElapsedSeconds() {
  return Date.now() / 1000 - state.startTime;
}

function getSelectedSatellite() {
  return SATELLITES.find((satellite) => satellite.id === state.selectedId) || null;
}

function setNoSelectionState() {
  dom.detailPanel.innerHTML = `
    <div class="no-selection">
      <div class="no-sel-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path>
        </svg>
      </div>
      SELECT A SATELLITE
    </div>
  `;
}

function resetSimulationTime() {
  state.startTime = Date.now() / 1000;
}

function setViewMode(viewMode) {
  state.viewMode = viewMode;

  if (viewMode === "north") {
    state.rotationY = 0;
    state.rotationX = 90;
  }

  if (viewMode === "auto") {
    state.rotationX = 10;
  }

  updateViewButtons();
}

function updateViewButtons() {
  Object.entries(dom.viewButtons).forEach(([key, button]) => {
    button.classList.toggle("active", key === state.viewMode);
  });
}

function resizeStarfield() {
  dom.starfieldCanvas.width = window.innerWidth;
  dom.starfieldCanvas.height = window.innerHeight;

  starfield.stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random(),
  }));
}

function drawStarfield() {
  const { ctx } = starfield;

  ctx.clearRect(0, 0, dom.starfieldCanvas.width, dom.starfieldCanvas.height);

  starfield.stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${star.a})`;
    ctx.fill();
  });
}

function calculateSatellitePosition(satellite, elapsedSeconds) {
  const angularVelocity = (2 * Math.PI) / (satellite.period * 60);
  const angle = satellite.phase0 + angularVelocity * elapsedSeconds;
  const inclinationRadians = (satellite.inc * Math.PI) / 180;

  const latitude = (Math.asin(Math.sin(inclinationRadians) * Math.sin(angle)) * 180) / Math.PI;
  const rawLongitude = (Math.atan2(Math.cos(inclinationRadians) * Math.sin(angle), Math.cos(angle)) * 180) / Math.PI;
  const longitude = (((rawLongitude + (elapsedSeconds / 240) * 360) % 360) + 540) % 360 - 180;

  return {
    lat: latitude,
    lon: longitude,
    alt: satellite.alt,
  };
}

function calculateElevationAngle(satelliteLat, satelliteLon, altitudeKm) {
  const earthRadiusKm = 6371;
  const deltaLat = ((satelliteLat - APP_CONFIG.userLat) * Math.PI) / 180;
  const deltaLon = ((satelliteLon - APP_CONFIG.userLon) * Math.PI) / 180;

  const haversineValue =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos((APP_CONFIG.userLat * Math.PI) / 180) *
      Math.cos((satelliteLat * Math.PI) / 180) *
      Math.sin(deltaLon / 2) ** 2;

  const surfaceDistanceKm = 2 * earthRadiusKm * Math.asin(Math.sqrt(haversineValue));

  return (Math.atan2(altitudeKm, surfaceDistanceKm) * 180) / Math.PI;
}

function calculateOrbitalSpeedKmPerSecond(satellite) {
  return (2 * Math.PI * (6371 + satellite.alt)) / (satellite.period / 60);
}

function isCoordinateVisible(coord) {
  const projected = state.projection(coord);

  if (!projected) {
    return false;
  }

  const [centerX, centerY] = state.projection.translate();
  const radius = state.projection.scale();

  return Math.sqrt((projected[0] - centerX) ** 2 + (projected[1] - centerY) ** 2) <= radius;
}

function resizeGlobe() {
  const area = dom.globeCanvas.parentElement.getBoundingClientRect();

  state.canvasWidth = area.width;
  state.canvasHeight = area.height;
  dom.globeCanvas.width = state.canvasWidth;
  dom.globeCanvas.height = state.canvasHeight;

  state.globeRadius = Math.min(state.canvasWidth, state.canvasHeight) / 2 - 36;

  state.projection = d3
    .geoOrthographic()
    .scale(state.globeRadius)
    .translate([state.canvasWidth / 2, state.canvasHeight / 2])
    .clipAngle(90)
    .rotate([state.rotationY, -state.rotationX, 0]);

  state.geoPath = d3.geoPath(state.projection, globe.ctx);
}

function resizeGlobeIfNeeded() {
  const area = dom.globeCanvas.parentElement.getBoundingClientRect();

  if (area.width !== state.lastCanvasWidth || area.height !== state.lastCanvasHeight) {
    state.lastCanvasWidth = area.width;
    state.lastCanvasHeight = area.height;
    resizeGlobe();
  }
}

function updateCameraForCurrentMode(elapsedSeconds) {
  if (state.viewMode === "auto") {
    state.autoRotationAngle += 0.05;
    state.rotationY = state.autoRotationAngle;
    state.rotationX = 10;
  } else if (state.viewMode === "track" && state.selectedId) {
    const selectedSatellite = getSelectedSatellite();

    if (selectedSatellite) {
      const position = calculateSatellitePosition(selectedSatellite, elapsedSeconds);
      state.rotationY += (-position.lon - state.rotationY) * 0.04;
      state.rotationX += (-position.lat - state.rotationX) * 0.04;
    }
  }

  state.projection.rotate([state.rotationY, -state.rotationX, 0]);
  state.geoPath = d3.geoPath(state.projection, globe.ctx);
}

function drawSphere() {
  const { ctx } = globe;
  const gradient = ctx.createRadialGradient(
    state.canvasWidth / 2 - state.globeRadius * 0.2,
    state.canvasHeight / 2 - state.globeRadius * 0.2,
    0,
    state.canvasWidth / 2,
    state.canvasHeight / 2,
    state.globeRadius
  );

  gradient.addColorStop(0, "#0d1f3c");
  gradient.addColorStop(1, "#060d1a");

  ctx.beginPath();
  state.geoPath({ type: "Sphere" });
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawGraticule() {
  const { ctx } = globe;

  ctx.beginPath();
  state.geoPath(d3.geoGraticule()());
  ctx.strokeStyle = "rgba(100,150,255,0.06)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawLandmass() {
  if (!state.topoData) {
    return;
  }

  const { ctx } = globe;

  try {
    const land = d3.feature(state.topoData, state.topoData.objects.land);
    ctx.beginPath();
    state.geoPath(land);
    ctx.fillStyle = "#162040";
    ctx.fill();
    ctx.strokeStyle = "rgba(100,150,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  } catch (error) {
    // Ignore drawing errors from malformed topology subsets.
  }

  try {
    const countries = d3.feature(state.topoData, state.topoData.objects.countries);
    ctx.beginPath();
    state.geoPath(countries);
    ctx.strokeStyle = "rgba(100,150,255,0.08)";
    ctx.lineWidth = 0.3;
    ctx.stroke();
  } catch (error) {
    // Ignore drawing errors from malformed topology subsets.
  }
}

function drawSphereRim() {
  const { ctx } = globe;

  ctx.beginPath();
  state.geoPath({ type: "Sphere" });
  ctx.strokeStyle = "rgba(100,150,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawUserLocation() {
  const { ctx } = globe;
  const projected = state.projection([APP_CONFIG.userLon, APP_CONFIG.userLat]);

  if (!projected || !isCoordinateVisible([APP_CONFIG.userLon, APP_CONFIG.userLat])) {
    return;
  }

  ctx.beginPath();
  ctx.arc(projected[0], projected[1], 5, 0, Math.PI * 2);
  ctx.fillStyle = "#f43f5e";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(232,237,245,0.8)";
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText("BANJA LUKA", projected[0] + 8, projected[1] + 4);
}

function drawOrbitTraces(elapsedSeconds) {
  const { ctx } = globe;

  SATELLITES.forEach((satellite) => {
    if (state.selectedId && satellite.id !== state.selectedId) {
      return;
    }

    const tracePoints = [];

    for (let i = 0; i <= 360; i += 2) {
      const traceElapsed = elapsedSeconds - satellite.period * 30 + i * ((satellite.period * 60) / 360);
      const position = calculateSatellitePosition(satellite, traceElapsed);
      tracePoints.push([position.lon, position.lat]);
    }

    ctx.beginPath();

    let firstVisiblePoint = true;

    tracePoints.forEach((point) => {
      const projected = state.projection(point);

      if (!projected || !isCoordinateVisible(point)) {
        firstVisiblePoint = true;
        return;
      }

      if (firstVisiblePoint) {
        ctx.moveTo(projected[0], projected[1]);
        firstVisiblePoint = false;
      } else {
        ctx.lineTo(projected[0], projected[1]);
      }
    });

    ctx.strokeStyle = `${satellite.color}30`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawSatellites(elapsedSeconds) {
  const { ctx } = globe;

  SATELLITES.forEach((satellite) => {
    const position = calculateSatellitePosition(satellite, elapsedSeconds);
    const projected = state.projection([position.lon, position.lat]);

    if (!projected || !isCoordinateVisible([position.lon, position.lat])) {
      return;
    }

    const isSelected = satellite.id === state.selectedId;
    const pointRadius = isSelected ? 7 : 5;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(projected[0], projected[1], pointRadius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `${satellite.color}40`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(projected[0], projected[1], pointRadius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `${satellite.color}70`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(projected[0], projected[1], pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = satellite.color;
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(232,237,245,0.85)";
    ctx.font = `${isSelected ? 700 : 400} 10px "Space Mono", monospace`;
    ctx.fillText(satellite.name, projected[0] + pointRadius + 4, projected[1] + 4);
  });
}

function drawGlobe(elapsedSeconds) {
  if (!state.topoData || !state.projection) {
    return;
  }

  updateCameraForCurrentMode(elapsedSeconds);
  dom.rotationOut.textContent = `${((state.rotationY % 360 + 360) % 360).toFixed(0)}°`;

  globe.ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

  drawSphere();
  drawGraticule();
  drawLandmass();
  drawSphereRim();
  drawUserLocation();
  drawOrbitTraces(elapsedSeconds);
  drawSatellites(elapsedSeconds);
}

function getVisibilityCount(elapsedSeconds) {
  return SATELLITES.reduce((count, satellite) => {
    const position = calculateSatellitePosition(satellite, elapsedSeconds);
    const isVisible = calculateElevationAngle(position.lat, position.lon, position.alt) > 0;
    return count + (isVisible ? 1 : 0);
  }, 0);
}

function buildSatelliteList() {
  const elapsedSeconds = getElapsedSeconds();
  dom.satList.innerHTML = "";

  SATELLITES.forEach((satellite) => {
    const position = calculateSatellitePosition(satellite, elapsedSeconds);
    const elevation = calculateElevationAngle(position.lat, position.lon, position.alt);
    const isVisible = elevation > 0;

    const item = document.createElement("div");
    item.className = `sat-item${satellite.id === state.selectedId ? " active" : ""}`;
    item.style.setProperty("--sat-color", satellite.color);
    item.innerHTML = `
      <div class="sat-indicator ${isVisible ? "orbiting" : ""}" style="background:${satellite.color}"></div>
      <div class="sat-info">
        <div class="sat-name">${satellite.name}</div>
        <div class="sat-type">${satellite.type}</div>
      </div>
      <span class="sat-badge ${isVisible ? "badge-visible" : "badge-hidden"}">${isVisible ? "VIS" : "HID"}</span>
    `;

    item.addEventListener("click", () => toggleSatelliteSelection(satellite.id));
    dom.satList.appendChild(item);
  });
}

function toggleSatelliteSelection(satelliteId) {
  state.selectedId = state.selectedId === satelliteId ? null : satelliteId;
  buildSatelliteList();
  updateDetailPanel();
}

function buildElevationSvgMarkup(elevation, isVisible) {
  const clampedElevation = Math.max(0, Math.min(90, elevation));
  const radians = (clampedElevation * Math.PI) / 180;
  const endX = 110 + Math.cos(Math.PI - radians) * 90;
  const endY = 100 - Math.sin(radians) * 90;
  const color = isVisible ? "#22d3a5" : "#f43f5e";

  const tickLines = Array.from({ length: 9 }, (_, index) => {
    const degrees = index * 10;
    const tickRadians = (degrees * Math.PI) / 180;
    const x1 = 110 + Math.cos(Math.PI - tickRadians) * 100;
    const y1 = 100 - Math.sin(tickRadians) * 100;
    const x2 = 110 + Math.cos(Math.PI - tickRadians) * 96;
    const y2 = 100 - Math.sin(tickRadians) * 96;

    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
  }).join("");

  return `
    <svg viewBox="0 0 220 110" width="100%" height="80">
      <path d="M10 100 Q110 100 210 100" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <path d="M10 100 A100 100 0 0 1 210 100" stroke="rgba(100,150,255,0.2)" stroke-width="1" fill="none"/>
      <line x1="10" y1="100" x2="210" y2="100" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
      ${tickLines}
      <line x1="110" y1="100" x2="${endX}" y2="${endY}" stroke="${color}" stroke-width="1.5"/>
      <circle cx="${endX}" cy="${endY}" r="4" fill="${color}"/>
      <text x="${endX + (clampedElevation < 45 ? 6 : -20)}" y="${endY - 4}" fill="${color}" font-size="9" font-family="'Space Mono', monospace">${elevation.toFixed(1)}°</text>
      <circle cx="110" cy="100" r="4" fill="#f43f5e"/>
      <text x="98" y="112" fill="rgba(232,237,245,0.5)" font-size="8" font-family="'Space Mono', monospace">BNL</text>
    </svg>
  `;
}

function updateDetailPanel() {
  const satellite = getSelectedSatellite();

  if (!satellite) {
    setNoSelectionState();
    return;
  }

  const elapsedSeconds = getElapsedSeconds();
  const position = calculateSatellitePosition(satellite, elapsedSeconds);
  const elevation = calculateElevationAngle(position.lat, position.lon, position.alt);
  const isVisible = elevation > 0;
  const speedKmPerSecond = calculateOrbitalSpeedKmPerSecond(satellite);

  dom.detailPanel.innerHTML = `
    <div class="detail-header">
      <div class="detail-sat-name">
        <span style="width:10px;height:10px;border-radius:50%;background:${satellite.color};display:inline-block;box-shadow:0 0 6px ${satellite.color};"></span>
        ${satellite.name}
        <span class="status-pill ${isVisible ? "status-visible" : "status-hidden"}">${isVisible ? "VISIBLE" : "HIDDEN"}</span>
      </div>
      <div class="detail-sat-type">${satellite.type}</div>
    </div>

    <div class="elevation-vis">
      <div class="elevation-label">Elevation angle from your location</div>
      ${buildElevationSvgMarkup(elevation, isVisible)}
    </div>

    <div class="section-divider">Position</div>
    <div class="data-grid">
      <div class="data-row"><span class="data-key">Latitude</span><span class="data-val highlight">${position.lat.toFixed(3)}°</span></div>
      <div class="data-row"><span class="data-key">Longitude</span><span class="data-val highlight">${position.lon.toFixed(3)}°</span></div>
      <div class="data-row"><span class="data-key">Altitude</span><span class="data-val">${position.alt.toLocaleString()} km</span></div>
      <div class="data-row"><span class="data-key">Elevation</span><span class="data-val" style="color:${isVisible ? "var(--green)" : "#fb7185"}">${elevation.toFixed(2)}°</span></div>
    </div>

    <div class="section-divider">Orbital Parameters</div>
    <div class="data-grid">
      <div class="data-row"><span class="data-key">Inclination</span><span class="data-val">${satellite.inc}°</span></div>
      <div class="data-row"><span class="data-key">Period</span><span class="data-val">${satellite.period} min</span></div>
      <div class="data-row"><span class="data-key">Speed</span><span class="data-val">${speedKmPerSecond.toFixed(2)} km/s</span></div>
      <div class="data-row"><span class="data-key">Orbits / Day</span><span class="data-val">${(1440 / satellite.period).toFixed(1)}</span></div>
    </div>
  `;
}

function updateClockAndMetrics() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");

  dom.utcClock.textContent = `UTC ${hours}:${minutes}:${seconds}`;
  dom.epochOut.textContent = Math.floor(Date.now() / 1000).toLocaleString();
  dom.trackedCount.textContent = String(APP_CONFIG.initialTrackedCount);
  dom.visibleCount.textContent = String(getVisibilityCount(getElapsedSeconds()));
}

function animationLoop() {
  const elapsedSeconds = getElapsedSeconds();

  resizeGlobeIfNeeded();
  drawGlobe(elapsedSeconds);

  if (state.selectedId) {
    updateDetailPanel();
  }

  dom.visibleCount.textContent = String(getVisibilityCount(elapsedSeconds));
  requestAnimationFrame(animationLoop);
}

function bindEvents() {
  dom.resetTimeBtn.addEventListener("click", resetSimulationTime);

  Object.entries(dom.viewButtons).forEach(([key, button]) => {
    button.addEventListener("click", () => setViewMode(key));
  });

  dom.globeCanvas.addEventListener("mousedown", (event) => {
    state.dragging = true;
    state.dragStart = [event.clientX, event.clientY];
    state.dragRotation = [state.rotationY, state.rotationX];
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.dragging) {
      return;
    }

    const deltaX = event.clientX - state.dragStart[0];
    const deltaY = event.clientY - state.dragStart[1];

    state.rotationY = state.dragRotation[0] + deltaX * 0.3;
    state.rotationX = state.dragRotation[1] + deltaY * 0.2;
    state.rotationX = Math.max(-70, Math.min(70, state.rotationX));
    state.viewMode = "manual";
    updateViewButtons();

    if (!state.dragHintDismissed) {
      dom.dragHint.classList.add("fade");
      state.dragHintDismissed = true;
    }
  });

  window.addEventListener("mouseup", () => {
    state.dragging = false;
  });

  window.addEventListener("resize", () => {
    resizeStarfield();
    drawStarfield();
    resizeGlobe();
  });
}

function installTopoJsonFeatureHelper() {
  d3.feature = function featureFactory(topology, objectDefinition) {
    return buildFeature(topology, objectDefinition);

    function buildFeature(currentTopology, objectNode) {
      if (objectNode.type === "GeometryCollection") {
        return {
          type: "FeatureCollection",
          features: objectNode.geometries.map((geometry) => buildSingleFeature(currentTopology, geometry)),
        };
      }

      return buildSingleFeature(currentTopology, objectNode);
    }

    function buildSingleFeature(currentTopology, objectNode) {
      return {
        type: "Feature",
        id: objectNode.id,
        properties: objectNode.properties || {},
        geometry: buildGeometry(currentTopology, objectNode),
      };
    }

    function buildGeometry(currentTopology, objectNode) {
      const { type } = objectNode;

      if (type === "GeometryCollection") {
        return {
          type,
          geometries: objectNode.geometries.map((geometry) => buildGeometry(currentTopology, geometry)),
        };
      }

      if (type === "Point") {
        return { type, coordinates: transformPoint(currentTopology, objectNode.coordinates) };
      }

      if (type === "MultiPoint") {
        return { type, coordinates: objectNode.coordinates.map((coordinate) => transformPoint(currentTopology, coordinate)) };
      }

      if (type === "LineString") {
        return { type, coordinates: buildLine(currentTopology, objectNode.arcs) };
      }

      if (type === "MultiLineString") {
        return { type, coordinates: objectNode.arcs.map((arcSet) => buildLine(currentTopology, arcSet)) };
      }

      if (type === "Polygon") {
        return { type, coordinates: objectNode.arcs.map((arcSet) => buildLine(currentTopology, arcSet)) };
      }

      if (type === "MultiPolygon") {
        return { type, coordinates: objectNode.arcs.map((ringSet) => ringSet.map((arcSet) => buildLine(currentTopology, arcSet))) };
      }

      return null;
    }

    function transformPoint(currentTopology, point) {
      const { transform } = currentTopology;

      if (!transform) {
        return point;
      }

      return [
        point[0] * transform.scale[0] + transform.translate[0],
        point[1] * transform.scale[1] + transform.translate[1],
      ];
    }

    function buildLine(currentTopology, arcs) {
      const points = [];

      arcs.forEach((arcIndex) => {
        const arc = currentTopology.arcs[arcIndex < 0 ? ~arcIndex : arcIndex];
        const { transform } = currentTopology;
        let x = 0;
        let y = 0;

        for (let i = 0; i < arc.length; i += 1) {
          x += arc[i][0];
          y += arc[i][1];

          const resolvedX = transform ? x * transform.scale[0] + transform.translate[0] : x;
          const resolvedY = transform ? y * transform.scale[1] + transform.translate[1] : y;

          if (i > 0 || points.length === 0) {
            points.push([resolvedX, resolvedY]);
          }
        }

        if (arcIndex < 0) {
          points.reverse();
        }
      });

      if (points.length < 2) {
        points.push(points[0]);
      }

      return points;
    }
  };
}

async function loadWorldAtlas() {
  const response = await fetch(APP_CONFIG.worldAtlasUrl);
  state.topoData = await response.json();
}

async function initialize() {
  installTopoJsonFeatureHelper();
  setNoSelectionState();
  bindEvents();
  resizeStarfield();
  drawStarfield();
  updateClockAndMetrics();
  updateViewButtons();

  await loadWorldAtlas();

  resizeGlobe();
  buildSatelliteList();
  updateDetailPanel();
  animationLoop();

  setInterval(() => {
    updateClockAndMetrics();
    buildSatelliteList();
  }, 1000);
}

initialize().catch((error) => {
  console.error("Failed to initialize Satellite Tracker:", error);
  dom.detailPanel.innerHTML = `
    <div class="no-selection">
      <div class="no-sel-icon">!</div>
      FAILED TO LOAD MAP DATA
    </div>
  `;
});
