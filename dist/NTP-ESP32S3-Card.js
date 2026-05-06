const CARD_VERSION = "0.3.0";

const DEFAULT_COLORS = {
  gps: "#2f8cff",
  glonass: "#ff4f4f",
  galileo: "#bd42ff",
  beidou: "#f0a72f",
  sbas: "#9aa3ad",
  unknown: "#6b7280",
};

const CONSTELLATION_LABELS = {
  gps: "GPS",
  glonass: "GLONASS",
  galileo: "Galileo",
  beidou: "BeiDou",
  sbas: "SBAS",
  unknown: "Other",
};

const BASE_STYLE = `
  :host {
    display: block;
    --ntp-glass-bg: var(--ha-card-background, rgba(18, 18, 22, 0.62));
    --ntp-glass-border: rgba(255, 255, 255, 0.13);
    --ntp-glass-border-soft: rgba(255, 255, 255, 0.08);
    --ntp-text: var(--primary-text-color, #f5f7fb);
    --ntp-muted: var(--secondary-text-color, rgba(235, 240, 255, 0.62));
    --ntp-dim: rgba(235, 240, 255, 0.38);
    --ntp-good: var(--success-color, #34c759);
    --ntp-warn: var(--warning-color, #ffcc00);
    --ntp-bad: var(--error-color, #ff453a);
    --ntp-accent: var(--accent-color, #64d2ff);
  }
  ha-card {
    position: relative;
    overflow: hidden;
    color: var(--ntp-text);
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.025)),
      var(--ntp-glass-bg);
    border: 1px solid var(--ntp-glass-border);
    border-radius: var(--ha-card-border-radius, 22px);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(22px) saturate(1.35);
    -webkit-backdrop-filter: blur(22px) saturate(1.35);
  }
  ha-card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 0%, rgba(255,255,255,0.12), transparent 34%),
      radial-gradient(circle at 100% 18%, rgba(100,210,255,0.12), transparent 32%);
    opacity: 0.72;
  }
  .wrap {
    position: relative;
    padding: 18px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .title {
    min-width: 0;
    font-size: 15px;
    line-height: 1.15;
    font-weight: 700;
    letter-spacing: 0;
  }
  .subtitle {
    margin-top: 3px;
    color: var(--ntp-muted);
    font-size: 12px;
    font-weight: 500;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    border: 1px solid var(--ntp-glass-border-soft);
    background: rgba(255, 255, 255, 0.07);
    color: var(--ntp-muted);
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 650;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ntp-bad);
    box-shadow: 0 0 12px currentColor;
  }
  .ok .dot { background: var(--ntp-good); }
  .warn .dot { background: var(--ntp-warn); }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .metric {
    min-width: 0;
    border-radius: 16px;
    padding: 11px 12px;
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid var(--ntp-glass-border-soft);
  }
  .label {
    color: var(--ntp-dim);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    font-weight: 800;
  }
  .value {
    margin-top: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ntp-text);
    font-size: 18px;
    line-height: 1.1;
    font-weight: 760;
  }
  .unit {
    color: var(--ntp-muted);
    font-size: 11px;
    font-weight: 650;
  }
  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 18px 0 10px;
    color: var(--ntp-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .12em;
  }
  .empty {
    display: grid;
    min-height: 120px;
    place-items: center;
    color: var(--ntp-muted);
    text-align: center;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.035);
    padding: 16px;
    font-size: 13px;
  }
  @media (max-width: 460px) {
    .wrap { padding: 16px; }
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .value { font-size: 16px; }
  }
`;

function html(strings, ...values) {
  return strings.reduce((out, part, index) => out + part + (values[index] ?? ""), "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function entityValue(hass, entityId) {
  if (!entityId) return undefined;
  const state = hass.states[entityId];
  if (!state || ["unknown", "unavailable"].includes(state.state)) return undefined;
  const numberValue = Number(state.state);
  return Number.isFinite(numberValue) ? numberValue : state.state;
}

function findEntity(hass, candidates) {
  for (const entityId of candidates) {
    if (entityId && hass.states[entityId]) return entityId;
  }
  const states = Object.values(hass.states);
  const candidateNames = candidates.map((entityId) => entityId?.split(".").pop()).filter(Boolean);
  const found = states.find((state) => {
    const uniqueId = String(state.attributes?.unique_id || state.entity_id || "").toLowerCase();
    const friendly = String(state.attributes?.friendly_name || "").toLowerCase();
    return candidateNames.some((name) => {
      const normalized = String(name).toLowerCase();
      return uniqueId.endsWith(normalized) || friendly.includes(normalized.replaceAll("_", " "));
    });
  });
  return found?.entity_id;
}

function autoEntities(hass, config) {
  const configured = config.entities || {};
  const statusEntity = config.status_entity || findEntity(hass, [
    "sensor.ntp32s3_status",
    "sensor.ntp_server_status",
    "sensor.esp32_s3_ntp_server_status",
  ]);
  return {
    status: statusEntity,
    satellites: configured.satellites || findEntity(hass, ["sensor.ntp32s3_satellites"]),
    satelliteDetailCount: configured.satellite_detail_count || findEntity(hass, ["sensor.ntp32s3_satellite_detail_count"]),
    hdop: configured.hdop || findEntity(hass, ["sensor.ntp32s3_hdop"]),
    altitude: configured.altitude || findEntity(hass, ["sensor.ntp32s3_altitude"]),
    ntpPackets: configured.ntp_packets || findEntity(hass, ["sensor.ntp32s3_ntp_packets"]),
    timeValid: configured.time_valid || findEntity(hass, ["binary_sensor.ntp32s3_gps_time_valid"]),
    ppsActive: configured.pps_active || findEntity(hass, ["binary_sensor.ntp32s3_pps_active"]),
    mqttConnected: configured.mqtt_connected || findEntity(hass, ["binary_sensor.ntp32s3_mqtt_connected"]),
    ip: configured.ip,
    latitude: configured.latitude,
    longitude: configured.longitude,
    speed: configured.speed,
    course: configured.course,
  };
}

function boolish(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["true", "on", "yes", "valid", "active", "connected"].includes(value.toLowerCase());
  return false;
}

function numberish(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value, digits = 1) {
  const parsed = numberish(value);
  if (parsed === undefined) return "-";
  return parsed.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatCoordinate(value, positive, negative) {
  const parsed = numberish(value);
  if (parsed === undefined) return "-";
  return `${Math.abs(parsed).toFixed(5)} ${parsed >= 0 ? positive : negative}`;
}

function normalizeConstellation(value) {
  const text = String(value || "unknown").toLowerCase();
  if (text.includes("gps") || text === "1") return "gps";
  if (text.includes("glo") || text === "2") return "glonass";
  if (text.includes("gal") || text === "3") return "galileo";
  if (text.includes("bei") || text.includes("bds") || text === "4") return "beidou";
  if (text.includes("sbas") || text === "5") return "sbas";
  return "unknown";
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch (_err) {
    return undefined;
  }
}

function getStatus(hass, config) {
  const entities = autoEntities(hass, config);
  const statusState = entities.status ? hass.states[entities.status] : undefined;
  const parsedState = parseMaybeJson(statusState?.state);
  const attrs = { ...(statusState?.attributes || {}), ...(parsedState && !Array.isArray(parsedState) ? parsedState : {}) };
  const field = (...names) => {
    for (const name of names) {
      if (attrs[name] !== undefined) return attrs[name];
    }
    return undefined;
  };
  const fromEntity = (key) => entityValue(hass, entities[key]);
  const satellites = field("satellite_detail", "satellites_detail", "satellites_in_view", "satellites_view", "satellite_data");
  return {
    raw: attrs,
    statusEntity: entities.status,
    name: config.name || field("device_name", "friendly_name") || statusState?.attributes?.friendly_name || "NTP32S3",
    ip: field("ip", "ip_address") || fromEntity("ip"),
    timeValid: field("time_valid") ?? fromEntity("timeValid"),
    ppsActive: field("pps_active") ?? fromEntity("ppsActive"),
    mqttConnected: field("mqtt_connected") ?? fromEntity("mqttConnected"),
    ntpPackets: field("ntp_packets") ?? fromEntity("ntpPackets"),
    satellitesUsed: field("satellites_used", "satellites") ?? fromEntity("satellites"),
    satelliteDetailCount: field("satellite_detail_count") ?? fromEntity("satelliteDetailCount"),
    satellitesInView: field("satellites_in_view_count", "satellites_visible") ?? fromEntity("satellites_visible"),
    hdop: field("hdop") ?? fromEntity("hdop"),
    altitude: field("altitude_m", "altitude") ?? fromEntity("altitude"),
    latitude: field("latitude", "lat") ?? fromEntity("latitude"),
    longitude: field("longitude", "lon", "lng") ?? fromEntity("longitude"),
    speed: field("speed_kmph", "speed") ?? fromEntity("speed"),
    course: field("course_deg", "course") ?? fromEntity("course"),
    unixTime: field("unix_time") ?? fromEntity("unix_time"),
    satellites: normalizeSatellites(satellites),
  };
}

function normalizeSatellites(value) {
  const parsed = typeof value === "string" ? parseMaybeJson(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((sat, index) => ({
      id: sat.id ?? sat.prn ?? sat.svid ?? sat.satellite ?? index + 1,
      constellation: normalizeConstellation(sat.constellation ?? sat.gnss ?? sat.type),
      elevation: numberish(sat.elevation ?? sat.el ?? sat.elev) ?? 0,
      azimuth: numberish(sat.azimuth ?? sat.az ?? sat.heading) ?? index * 37,
      snr: numberish(sat.snr ?? sat.cno ?? sat.signal ?? sat.strength),
      used: boolish(sat.used ?? sat.in_use ?? sat.locked),
    }))
    .filter((sat) => Number.isFinite(sat.elevation) && Number.isFinite(sat.azimuth));
}

function satellitesByConstellation(status) {
  const counts = { gps: 0, glonass: 0, galileo: 0, beidou: 0, sbas: 0, unknown: 0 };
  for (const sat of status.satellites) counts[sat.constellation] = (counts[sat.constellation] || 0) + 1;
  if (!status.satellites.length && numberish(status.satellitesUsed) !== undefined) counts.gps = Number(status.satellitesUsed);
  return counts;
}

function legend(status) {
  const counts = satellitesByConstellation(status);
  return html`<div class="legend">
    ${Object.entries(CONSTELLATION_LABELS).map(([key, label]) => html`
      <span><i style="background:${DEFAULT_COLORS[key]}"></i>${label}${counts[key] ? ` ${counts[key]}` : ""}</span>
    `).join("")}
  </div>`;
}

function skySvg(status, mini = false) {
  const sats = status.satellites;
  const center = 100;
  const radius = 82;
  const points = sats.map((sat) => {
    const az = (sat.azimuth - 90) * Math.PI / 180;
    const r = radius * (1 - Math.max(0, Math.min(90, sat.elevation)) / 90);
    const x = center + Math.cos(az) * r;
    const y = center + Math.sin(az) * r;
    const size = sat.used ? 5 : 4;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size}" fill="${DEFAULT_COLORS[sat.constellation] || DEFAULT_COLORS.unknown}" opacity="${sat.used ? "1" : ".62"}"><title>${escapeHtml(CONSTELLATION_LABELS[sat.constellation])} ${escapeHtml(sat.id)}${sat.snr !== undefined ? ` - ${sat.snr} dB` : ""}</title></circle>`;
  }).join("");
  return html`
    <svg class="sky ${mini ? "mini" : ""}" viewBox="0 0 200 200" role="img" aria-label="Satellite sky view">
      <defs>
        <radialGradient id="ntpSkyGlow" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stop-color="rgba(100,210,255,.16)" />
          <stop offset="100%" stop-color="rgba(100,210,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#ntpSkyGlow)" />
      <circle cx="100" cy="100" r="82" class="ring outer" />
      <circle cx="100" cy="100" r="55" class="ring" />
      <circle cx="100" cy="100" r="28" class="ring" />
      <line x1="100" y1="18" x2="100" y2="182" class="axis" />
      <line x1="18" y1="100" x2="182" y2="100" class="axis" />
      <text x="100" y="12" text-anchor="middle">N</text>
      <text x="188" y="104" text-anchor="middle">E</text>
      <text x="100" y="196" text-anchor="middle">S</text>
      <text x="12" y="104" text-anchor="middle">W</text>
      ${points}
    </svg>`;
}

class NtpBaseCard extends HTMLElement {
  setConfig(config) {
    this.config = { ...(this.constructor.getStubConfig?.() || {}), ...(config || {}) };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 4;
  }

  header(status, subtitle) {
    if (!status.statusEntity && !this.config?.status_entity) {
      return html`<div class="header">
        <div>
          <div class="title">${escapeHtml(this.config?.name || "NTP32S3")}</div>
          <div class="subtitle">Waiting for NTP32S3 Status entity</div>
        </div>
        <div class="pill"><span class="dot"></span>No entity</div>
      </div>`;
    }
    const valid = boolish(status.timeValid);
    const cls = valid ? "ok" : boolish(status.ppsActive) ? "warn" : "";
    return html`<div class="header">
      <div>
        <div class="title">${escapeHtml(status.name)}</div>
        <div class="subtitle">${escapeHtml(subtitle || status.ip || "GPS disciplined NTP")}</div>
      </div>
      <div class="pill ${cls}"><span class="dot"></span>${valid ? "Locked" : "Waiting"}</div>
    </div>`;
  }
}

class NtpDashboardCard extends NtpBaseCard {
  static getStubConfig() {
    return { name: "NTP Server" };
  }

  static getConfigElement() {
    return document.createElement("ntp32s3-card-editor");
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const status = getStatus(this._hass, this.config);
    const sats = numberish(status.satellitesUsed) ?? status.satellites.length;
    this.shadowRoot.innerHTML = html`
      <style>${BASE_STYLE}
        .dashboard { display: grid; grid-template-columns: minmax(0, 1.2fr) 178px; gap: 16px; align-items: center; }
        .position { margin-top: 4px; color: var(--ntp-muted); font-size: 12px; line-height: 1.45; }
        .skybox { display: grid; place-items: center; min-width: 0; }
        .sky { width: 176px; max-width: 100%; }
        .ring { fill: none; stroke: rgba(255,255,255,.22); stroke-width: 1; }
        .outer { stroke: rgba(255,255,255,.38); }
        .axis { stroke: rgba(255,255,255,.08); stroke-width: 1; }
        text { fill: var(--ntp-muted); font-size: 10px; font-weight: 800; }
        .footer { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
        @media (max-width: 620px) { .dashboard { grid-template-columns: 1fr; } .skybox { order: -1; } }
      </style>
      <ha-card>
        <div class="wrap">
          ${this.header(status, "Dashboard")}
          <div class="dashboard">
            <div>
              <div class="grid">
                <div class="metric"><div class="label">Lat</div><div class="value">${formatCoordinate(status.latitude, "N", "S")}</div></div>
                <div class="metric"><div class="label">Lon</div><div class="value">${formatCoordinate(status.longitude, "E", "W")}</div></div>
                <div class="metric"><div class="label">Alt</div><div class="value">${formatNumber(status.altitude, 1)} <span class="unit">m</span></div></div>
                <div class="metric"><div class="label">HDOP</div><div class="value">${formatNumber(status.hdop, 2)}</div></div>
                <div class="metric"><div class="label">Sats</div><div class="value">${formatNumber(sats, 0)}</div></div>
                <div class="metric"><div class="label">Detail</div><div class="value">${formatNumber(status.satelliteDetailCount ?? status.satellites.length, 0)}</div></div>
              </div>
              <div class="footer">
                <span class="pill ${boolish(status.ppsActive) ? "ok" : ""}"><span class="dot"></span>PPS ${boolish(status.ppsActive) ? "active" : "inactive"}</span>
                <span class="pill ${boolish(status.mqttConnected) ? "ok" : ""}"><span class="dot"></span>MQTT ${boolish(status.mqttConnected) ? "online" : "offline"}</span>
              </div>
            </div>
            <div class="skybox">${skySvg(status, true)}</div>
          </div>
        </div>
      </ha-card>`;
  }
}

class NtpSkyCard extends NtpBaseCard {
  static getStubConfig() {
    return { name: "NTP Server" };
  }

  static getConfigElement() {
    return document.createElement("ntp32s3-card-editor");
  }

  getCardSize() {
    return 5;
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const status = getStatus(this._hass, this.config);
    this.shadowRoot.innerHTML = html`
      <style>${BASE_STYLE}
        .sky-wrap { display: grid; place-items: center; }
        .sky { width: min(320px, 100%); }
        .ring { fill: none; stroke: rgba(255,255,255,.24); stroke-width: 1; }
        .outer { stroke: rgba(255,255,255,.42); }
        .axis { stroke: rgba(255,255,255,.08); stroke-width: 1; }
        text { fill: var(--ntp-muted); font-size: 10px; font-weight: 800; }
        .legend { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top: 12px; }
        .legend span { display:inline-flex; align-items:center; gap:5px; color:var(--ntp-muted); font-size:11px; font-weight:700; }
        .legend i { width:7px; height:7px; border-radius:50%; }
      </style>
      <ha-card>
        <div class="wrap">
          ${this.header(status, "Sky View")}
          ${status.satellites.length ? html`<div class="sky-wrap">${skySvg(status)}</div>${legend(status)}` : html`<div class="empty">Waiting for satellite detail data. The card will render the full sky plot when the MQTT status entity includes a satellite array.</div>${legend(status)}`}
        </div>
      </ha-card>`;
  }
}

class NtpSignalCard extends NtpBaseCard {
  static getStubConfig() {
    return { name: "NTP Server" };
  }

  static getConfigElement() {
    return document.createElement("ntp32s3-card-editor");
  }

  getCardSize() {
    return 4;
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const status = getStatus(this._hass, this.config);
    const sats = [...status.satellites].sort((a, b) => (b.snr ?? 0) - (a.snr ?? 0)).slice(0, this.config.max_satellites || 14);
    const bars = sats.map((sat) => {
      const snr = Math.max(0, Math.min(60, sat.snr ?? 0));
      return html`<div class="bar-cell">
        <div class="bar-track"><div class="bar" style="height:${Math.max(6, snr / 60 * 100)}%;background:${DEFAULT_COLORS[sat.constellation] || DEFAULT_COLORS.unknown}"></div></div>
        <div class="sat-id">${escapeHtml(sat.id)}</div>
        <div class="snr">${sat.snr ?? "-"}</div>
      </div>`;
    }).join("");
    this.shadowRoot.innerHTML = html`
      <style>${BASE_STYLE}
        .chart { display:grid; grid-template-columns: repeat(auto-fit, minmax(34px, 1fr)); gap:10px; align-items:end; height:190px; padding-top:6px; }
        .bar-cell { display:grid; grid-template-rows: 1fr auto auto; gap:5px; min-width:0; height:100%; text-align:center; }
        .bar-track { position:relative; align-self:end; height:132px; border-radius: 10px; overflow:hidden; background: rgba(255,255,255,.055); border:1px solid var(--ntp-glass-border-soft); }
        .bar { position:absolute; left:0; right:0; bottom:0; border-radius: 9px 9px 0 0; box-shadow: 0 -6px 20px rgba(255,255,255,.12); }
        .sat-id { color: var(--ntp-text); font-size: 11px; font-weight: 800; overflow:hidden; text-overflow:ellipsis; }
        .snr { color: var(--ntp-muted); font-size: 10px; font-weight: 700; }
        .legend { display:flex; gap:8px; flex-wrap:wrap; margin-top: 13px; }
        .legend span { display:inline-flex; align-items:center; gap:5px; color:var(--ntp-muted); font-size:11px; font-weight:700; }
        .legend i { width:7px; height:7px; border-radius:50%; }
      </style>
      <ha-card>
        <div class="wrap">
          ${this.header(status, "Signal Strength")}
          ${sats.length ? html`<div class="chart">${bars}</div>${legend(status)}` : html`<div class="empty">Waiting for satellite signal detail. Add SNR/CN0 values to the status entity satellite array to populate the graph.</div>${legend(status)}`}
        </div>
      </ha-card>`;
  }
}

class NtpCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const statusEntity = this.config?.status_entity || "";
    const name = this.config?.name || "";
    this.shadowRoot.innerHTML = html`
      <style>
        .editor { display: grid; gap: 12px; }
        label { display: grid; gap: 6px; font-weight: 600; }
        input { font: inherit; padding: 9px 10px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
        .hint { color: var(--secondary-text-color); font-size: 12px; line-height: 1.35; }
      </style>
      <div class="editor">
        <label>
          Name
          <input data-field="name" value="${escapeHtml(name)}" placeholder="NTP Server">
        </label>
        <label>
          Status entity
          <input data-field="status_entity" value="${escapeHtml(statusEntity)}" placeholder="sensor.ntp32s3_status">
        </label>
        <div class="hint">Leave status entity blank to auto-detect sensor.ntp32s3_status from the NTP32S3 integration.</div>
      </div>
    `;
    this.shadowRoot.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (event) => {
        const target = event.currentTarget;
        const field = target.dataset.field;
        const value = target.value.trim();
        const config = { ...(this.config || {}) };
        if (value) {
          config[field] = value;
        } else {
          delete config[field];
        }
        this.config = config;
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config },
          bubbles: true,
          composed: true,
        }));
      });
    });
  }
}

if (!customElements.get("ntp32s3-dashboard-card")) {
  customElements.define("ntp32s3-dashboard-card", NtpDashboardCard);
}
if (!customElements.get("ntp32s3-sky-card")) {
  customElements.define("ntp32s3-sky-card", NtpSkyCard);
}
if (!customElements.get("ntp32s3-signal-card")) {
  customElements.define("ntp32s3-signal-card", NtpSignalCard);
}
if (!customElements.get("ntp32s3-card-editor")) {
  customElements.define("ntp32s3-card-editor", NtpCardEditor);
}

window.customCards = window.customCards || [];
const ntp32s3Cards = [
  {
    type: "ntp32s3-dashboard-card",
    name: "NTP32S3 Dashboard Card",
    preview: true,
    description: "iOS dark glass GNSS/NTP dashboard card.",
  },
  {
    type: "ntp32s3-sky-card",
    name: "NTP32S3 Sky View Card",
    preview: true,
    description: "Satellite sky plot for NTP32S3 status data.",
  },
  {
    type: "ntp32s3-signal-card",
    name: "NTP32S3 Signal Card",
    preview: true,
    description: "Satellite signal strength bars for NTP32S3 status data.",
  },
];
for (const card of ntp32s3Cards) {
  if (!window.customCards.some((existing) => existing.type === card.type)) {
    window.customCards.push(card);
  }
}

console.info(`%c NTP32S3 Cards %c ${CARD_VERSION} `, "color: #64d2ff; font-weight: 700;", "color: #fff; background: #111827; border-radius: 4px;");
