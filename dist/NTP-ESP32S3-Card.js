const CARD_VERSION = "0.5.0";

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
    --ntp-glass-bg: var(--ha-card-background, var(--card-background-color, #111114));
    --ntp-glass-border: var(--ha-card-border-color, var(--divider-color, rgba(255, 255, 255, 0.13)));
    --ntp-glass-border-soft: color-mix(in srgb, var(--ntp-glass-border) 62%, transparent);
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
    background: var(--ntp-glass-bg);
    border: 1px solid var(--ntp-glass-border);
    border-radius: var(--ha-card-border-radius, 22px);
    box-shadow:
      var(--ha-card-box-shadow, 0 10px 26px rgba(0, 0, 0, 0.26)),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(14px) saturate(1.1);
    -webkit-backdrop-filter: blur(14px) saturate(1.1);
  }
  ha-card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255,0.045), transparent 34%);
    opacity: 0.55;
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
    background: color-mix(in srgb, var(--ntp-glass-bg) 82%, var(--ntp-text) 18%);
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
    border-radius: 12px;
    padding: 11px 12px;
    background: color-mix(in srgb, var(--ntp-glass-bg) 88%, var(--ntp-text) 12%);
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
    ntpPacketsToday: configured.ntp_packets_today || findEntity(hass, ["sensor.ntp32s3_ntp_packets_today"]),
    ntpTime: configured.ntp_time || findEntity(hass, ["sensor.ntp32s3_ntp_time"]),
    unixTime: configured.unix_time || findEntity(hass, ["sensor.ntp32s3_unix_time"]),
    gpsChars: configured.gps_chars || findEntity(hass, ["sensor.ntp32s3_gps_characters", "sensor.ntp32s3_gps_chars"]),
    gpsPassedChecksum: configured.gps_passed_checksum || findEntity(hass, ["sensor.ntp32s3_gps_passed_checksums", "sensor.ntp32s3_gps_passed_checksum"]),
    gpsFailedChecksum: configured.gps_failed_checksum || findEntity(hass, ["sensor.ntp32s3_gps_failed_checksums", "sensor.ntp32s3_gps_failed_checksum"]),
    gpsChecksumFailurePercent: configured.gps_checksum_failure_percent || findEntity(hass, ["sensor.ntp32s3_gps_checksum_failure", "sensor.ntp32s3_gps_checksum_failure_percent"]),
    nmeaTalkerGps: configured.nmea_talker_gps || findEntity(hass, ["sensor.ntp32s3_nmea_gps_talkers", "sensor.ntp32s3_nmea_talker_gps"]),
    nmeaTalkerGlonass: configured.nmea_talker_glonass || findEntity(hass, ["sensor.ntp32s3_nmea_glonass_talkers", "sensor.ntp32s3_nmea_talker_glonass"]),
    nmeaTalkerGalileo: configured.nmea_talker_galileo || findEntity(hass, ["sensor.ntp32s3_nmea_galileo_talkers", "sensor.ntp32s3_nmea_talker_galileo"]),
    nmeaTalkerBeidou: configured.nmea_talker_beidou || findEntity(hass, ["sensor.ntp32s3_nmea_beidou_talkers", "sensor.ntp32s3_nmea_talker_beidou"]),
    nmeaTalkerMixed: configured.nmea_talker_mixed || findEntity(hass, ["sensor.ntp32s3_nmea_mixed_talkers", "sensor.ntp32s3_nmea_talker_mixed"]),
    satellitesWithSnr: configured.satellites_with_snr || findEntity(hass, ["sensor.ntp32s3_satellites_with_snr"]),
    averageSnr: configured.average_snr || findEntity(hass, ["sensor.ntp32s3_average_snr"]),
    maxSnr: configured.max_snr || findEntity(hass, ["sensor.ntp32s3_max_snr"]),
    satellitesGps: configured.satellites_gps || findEntity(hass, ["sensor.ntp32s3_gps_satellites_detail", "sensor.ntp32s3_satellites_gps"]),
    satellitesGlonass: configured.satellites_glonass || findEntity(hass, ["sensor.ntp32s3_glonass_satellites_detail", "sensor.ntp32s3_satellites_glonass"]),
    satellitesGalileo: configured.satellites_galileo || findEntity(hass, ["sensor.ntp32s3_galileo_satellites_detail", "sensor.ntp32s3_satellites_galileo"]),
    satellitesBeidou: configured.satellites_beidou || findEntity(hass, ["sensor.ntp32s3_beidou_satellites_detail", "sensor.ntp32s3_satellites_beidou"]),
    satellitesSbas: configured.satellites_sbas || findEntity(hass, ["sensor.ntp32s3_sbas_satellites_detail", "sensor.ntp32s3_satellites_sbas"]),
    satellitesUsedGps: configured.satellites_used_gps || findEntity(hass, ["sensor.ntp32s3_gps_satellites_used", "sensor.ntp32s3_satellites_used_gps"]),
    satellitesUsedGlonass: configured.satellites_used_glonass || findEntity(hass, ["sensor.ntp32s3_glonass_satellites_used", "sensor.ntp32s3_satellites_used_glonass"]),
    satellitesUsedGalileo: configured.satellites_used_galileo || findEntity(hass, ["sensor.ntp32s3_galileo_satellites_used", "sensor.ntp32s3_satellites_used_galileo"]),
    satellitesUsedBeidou: configured.satellites_used_beidou || findEntity(hass, ["sensor.ntp32s3_beidou_satellites_used", "sensor.ntp32s3_satellites_used_beidou"]),
    satellitesUsedSbas: configured.satellites_used_sbas || findEntity(hass, ["sensor.ntp32s3_sbas_satellites_used", "sensor.ntp32s3_satellites_used_sbas"]),
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

function formatDegree(value) {
  const parsed = numberish(value);
  return parsed === undefined ? "-" : `${parsed.toLocaleString(undefined, { maximumFractionDigits: 0 })}\u00b0`;
}

function formatTime(value) {
  if (value === undefined || value === null || value === "") return "-";
  const numeric = numberish(value);
  const date = numeric !== undefined ? new Date(numeric * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(value) {
  if (value === undefined || value === null || value === "") return "";
  const numeric = numberish(value);
  const date = numeric !== undefined ? new Date(numeric * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatState(value, onText = "Active", offText = "Inactive") {
  if (value === undefined || value === null || value === "") return "-";
  return boolish(value) ? onText : offText;
}

function formatPercent(value, digits = 2) {
  const parsed = numberish(value);
  return parsed === undefined ? "-" : `${parsed.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}

function localDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ntpPacketsToday(status) {
  const total = numberish(status.ntpPackets);
  if (total === undefined) return undefined;
  let storage;
  try {
    storage = window.localStorage;
  } catch (_err) {
    storage = undefined;
  }
  if (!storage) return total;

  const day = localDayKey();
  const storageKey = `ntp32s3:packets-today:${status.statusEntity || status.name || "default"}`;
  let stored;
  try {
    stored = JSON.parse(storage.getItem(storageKey) || "{}");
  } catch (_err) {
    stored = {};
  }

  let baseline = numberish(stored.baseline);
  const lastTotal = numberish(stored.lastTotal);
  if (stored.day !== day) baseline = lastTotal ?? total;
  if (baseline === undefined || total < baseline) baseline = 0;

  const today = Math.max(0, total - baseline);
  try {
    storage.setItem(storageKey, JSON.stringify({ day, baseline, lastTotal: total }));
  } catch (_err) {
    // Ignore storage failures; the displayed total is still useful.
  }
  return today;
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
  const nmea = field("nmea") || {};
  const talkers = typeof nmea === "object" && !Array.isArray(nmea) ? (nmea.talkers || {}) : {};
  const byConstellation = field("satellites_by_constellation") || {};
  const usedByConstellation = field("satellites_used_by_constellation") || {};
  return {
    raw: attrs,
    statusEntity: entities.status,
    name: config.name || field("device_name", "friendly_name") || statusState?.attributes?.friendly_name || "NTP32S3",
    ip: field("ip", "ip_address") || fromEntity("ip"),
    timeValid: field("time_valid") ?? fromEntity("timeValid"),
    ppsActive: field("pps_active") ?? fromEntity("ppsActive"),
    mqttConnected: field("mqtt_connected") ?? fromEntity("mqttConnected"),
    ntpPackets: field("ntp_packets") ?? fromEntity("ntpPackets"),
    ntpPacketsToday: field("ntp_packets_today") ?? fromEntity("ntpPacketsToday"),
    satellitesUsed: field("satellites_used", "satellites") ?? fromEntity("satellites"),
    satelliteDetailCount: field("satellite_detail_count") ?? fromEntity("satelliteDetailCount"),
    satellitesWithSnr: field("satellites_with_snr") ?? fromEntity("satellitesWithSnr"),
    averageSnr: field("average_snr") ?? fromEntity("averageSnr"),
    maxSnr: field("max_snr") ?? fromEntity("maxSnr"),
    gpsChars: field("gps_chars") ?? fromEntity("gpsChars"),
    gpsPassedChecksum: field("gps_passed_checksum") ?? fromEntity("gpsPassedChecksum"),
    gpsFailedChecksum: field("gps_failed_checksum") ?? fromEntity("gpsFailedChecksum"),
    gpsChecksumFailurePercent: field("gps_checksum_failure_percent") ?? fromEntity("gpsChecksumFailurePercent"),
    nmeaCapability: typeof nmea === "object" && !Array.isArray(nmea) ? nmea.capability : undefined,
    nmeaTalkers: {
      gps: talkers.gps ?? fromEntity("nmeaTalkerGps"),
      glonass: talkers.glonass ?? fromEntity("nmeaTalkerGlonass"),
      galileo: talkers.galileo ?? fromEntity("nmeaTalkerGalileo"),
      beidou: talkers.beidou ?? fromEntity("nmeaTalkerBeidou"),
      mixed: talkers.mixed ?? fromEntity("nmeaTalkerMixed"),
    },
    satellitesByConstellation: {
      gps: byConstellation.gps ?? fromEntity("satellitesGps"),
      glonass: byConstellation.glonass ?? fromEntity("satellitesGlonass"),
      galileo: byConstellation.galileo ?? fromEntity("satellitesGalileo"),
      beidou: byConstellation.beidou ?? fromEntity("satellitesBeidou"),
      sbas: byConstellation.sbas ?? fromEntity("satellitesSbas"),
    },
    satellitesUsedByConstellation: {
      gps: usedByConstellation.gps ?? fromEntity("satellitesUsedGps"),
      glonass: usedByConstellation.glonass ?? fromEntity("satellitesUsedGlonass"),
      galileo: usedByConstellation.galileo ?? fromEntity("satellitesUsedGalileo"),
      beidou: usedByConstellation.beidou ?? fromEntity("satellitesUsedBeidou"),
      sbas: usedByConstellation.sbas ?? fromEntity("satellitesUsedSbas"),
    },
    satellitesInView: field("satellites_in_view_count", "satellites_visible") ?? fromEntity("satellites_visible"),
    hdop: field("hdop") ?? fromEntity("hdop"),
    altitude: field("altitude_m", "altitude") ?? fromEntity("altitude"),
    latitude: field("latitude", "lat") ?? fromEntity("latitude"),
    longitude: field("longitude", "lon", "lng") ?? fromEntity("longitude"),
    speed: field("speed_kmph", "speed") ?? fromEntity("speed"),
    course: field("course_deg", "course") ?? fromEntity("course"),
    unixTime: field("unix_time") ?? fromEntity("unixTime"),
    ntpTime: field("ntp_time_utc", "ntp_time") ?? fromEntity("ntpTime"),
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
  const explicit = status.satellitesByConstellation || {};
  const hasExplicit = Object.values(explicit).some((value) => numberish(value) !== undefined);
  const counts = { gps: 0, glonass: 0, galileo: 0, beidou: 0, sbas: 0, unknown: 0 };
  if (hasExplicit) {
    for (const key of Object.keys(counts)) counts[key] = numberish(explicit[key]) ?? 0;
    return counts;
  }
  for (const sat of status.satellites) counts[sat.constellation] = (counts[sat.constellation] || 0) + 1;
  if (!status.satellites.length && numberish(status.satellitesUsed) !== undefined) counts.gps = Number(status.satellitesUsed);
  return counts;
}

function constellationRows(status) {
  const seen = satellitesByConstellation(status);
  const used = status.satellitesUsedByConstellation || {};
  return ["gps", "glonass", "galileo", "beidou", "sbas"].map((key) => ({
    key,
    label: CONSTELLATION_LABELS[key],
    seen: numberish(seen[key]) ?? 0,
    used: numberish(used[key]) ?? 0,
  }));
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
                <div class="metric"><div class="label">NTP</div><div class="value">${formatNumber(status.ntpPackets, 0)}</div></div>
                <div class="metric"><div class="label">NTP Time</div><div class="value">${formatTime(status.ntpTime ?? status.unixTime)}</div></div>
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
    const columnCount = Math.max(1, sats.length);
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
        .chart { display:grid; grid-template-columns: repeat(var(--sat-columns), minmax(16px, 1fr)); gap: clamp(3px, 1.4vw, 10px); align-items:end; height:190px; padding-top:6px; }
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
          ${sats.length ? html`<div class="chart" style="--sat-columns:${columnCount}">${bars}</div>${legend(status)}` : html`<div class="empty">Waiting for satellite signal detail. Add SNR/CN0 values to the status entity satellite array to populate the graph.</div>${legend(status)}`}
        </div>
      </ha-card>`;
  }
}

class NtpRawCard extends NtpBaseCard {
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
    const fixTime = status.ntpTime ?? status.unixTime;
    const sats = numberish(status.satellitesUsed) ?? status.satellites.length;
    const packetsToday = status.ntpPacketsToday ?? ntpPacketsToday(status);
    this.shadowRoot.innerHTML = html`
      <style>${BASE_STYLE}
        .raw-section { margin-top: 14px; }
        .raw-title {
          margin: 0 0 10px;
          color: var(--ntp-muted);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .12em;
        }
        .raw-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:14px 18px; }
        .raw-grid.triple { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .raw-item { min-width:0; }
        .raw-label { color: var(--ntp-muted); font-size: 12px; font-weight: 700; }
        .raw-value { margin-top: 3px; color: var(--ntp-text); font-size: 18px; line-height: 1.15; font-weight: 760; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .raw-note { margin-top: 3px; color: var(--ntp-dim); font-size: 11px; font-weight: 650; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width: 460px) {
          .raw-grid, .raw-grid.triple { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .raw-value { font-size: 16px; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          ${this.header(status, "Raw Data")}
          <div class="raw-section">
            <div class="raw-title">Position</div>
            <div class="raw-grid">
              <div class="raw-item"><div class="raw-label">Lat</div><div class="raw-value">${formatCoordinate(status.latitude, "N", "S")}</div></div>
              <div class="raw-item"><div class="raw-label">Lon</div><div class="raw-value">${formatCoordinate(status.longitude, "E", "W")}</div></div>
            </div>
          </div>
          <div class="raw-section">
            <div class="raw-grid triple">
              <div class="raw-item"><div class="raw-label">Alt</div><div class="raw-value">${formatNumber(status.altitude, 1)} m</div><div class="raw-note">metric</div></div>
              <div class="raw-item"><div class="raw-label">NTP Today</div><div class="raw-value">${formatNumber(packetsToday, 0)}</div><div class="raw-note">packets</div></div>
              <div class="raw-item"><div class="raw-label">PPS</div><div class="raw-value">${formatState(status.ppsActive)}</div><div class="raw-note">precision pulse</div></div>
              <div class="raw-item"><div class="raw-label">HDOP</div><div class="raw-value">${formatNumber(status.hdop, 2)}</div><div class="raw-note">dilution</div></div>
              <div class="raw-item"><div class="raw-label">Sats</div><div class="raw-value">${formatNumber(sats, 0)}</div><div class="raw-note">${formatNumber(status.satelliteDetailCount ?? status.satellites.length, 0)} detailed</div></div>
              <div class="raw-item"><div class="raw-label">Fix</div><div class="raw-value">${formatTime(fixTime)}</div><div class="raw-note">${formatDate(fixTime)}</div></div>
              <div class="raw-item"><div class="raw-label">NTP Packets</div><div class="raw-value">${formatNumber(status.ntpPackets, 0)}</div><div class="raw-note">served</div></div>
              <div class="raw-item"><div class="raw-label">NTP Time</div><div class="raw-value">${formatTime(fixTime)}</div><div class="raw-note">from NTP</div></div>
              <div class="raw-item"><div class="raw-label">Unix</div><div class="raw-value">${formatNumber(status.unixTime, 0)}</div><div class="raw-note">seconds</div></div>
            </div>
          </div>
        </div>
      </ha-card>`;
  }
}

class NtpHealthCard extends NtpBaseCard {
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
    const checksumFailure = numberish(status.gpsChecksumFailurePercent);
    const checksumClass = checksumFailure === undefined ? "" : checksumFailure <= 1 ? "ok" : checksumFailure <= 5 ? "warn" : "bad";
    const passed = numberish(status.gpsPassedChecksum) ?? 0;
    const failed = numberish(status.gpsFailedChecksum) ?? 0;
    const checksumTotal = passed + failed;
    const failedWidth = checksumTotal > 0 ? Math.max(0, Math.min(100, failed / checksumTotal * 100)) : 0;
    const avgSnr = numberish(status.averageSnr);
    const maxSnr = numberish(status.maxSnr);
    const rows = constellationRows(status);
    const maxSeen = Math.max(1, ...rows.map((row) => row.seen));
    const constellationMarkup = rows.map((row) => {
      const seenWidth = Math.max(0, Math.min(100, row.seen / maxSeen * 100));
      const usedWidth = row.seen > 0 ? Math.max(0, Math.min(100, row.used / row.seen * 100)) : 0;
      return html`<div class="const-row">
        <div class="const-label"><i style="background:${DEFAULT_COLORS[row.key]}"></i>${row.label}</div>
        <div class="const-track">
          <div class="const-seen" style="width:${seenWidth}%"></div>
          <div class="const-used" style="width:${usedWidth}%;background:${DEFAULT_COLORS[row.key]}"></div>
        </div>
        <div class="const-count">${formatNumber(row.used, 0)} / ${formatNumber(row.seen, 0)}</div>
      </div>`;
    }).join("");
    const talkers = status.nmeaTalkers || {};
    this.shadowRoot.innerHTML = html`
      <style>${BASE_STYLE}
        .health-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:12px; }
        .metric.big { grid-column: span 2; }
        .value.good { color: var(--ntp-good); }
        .value.warn { color: var(--ntp-warn); }
        .value.bad { color: var(--ntp-bad); }
        .quality { margin-top: 12px; height: 10px; border-radius: 999px; overflow:hidden; background: color-mix(in srgb, var(--ntp-good) 28%, transparent); border:1px solid var(--ntp-glass-border-soft); }
        .quality .fail { height:100%; margin-left:auto; background: var(--ntp-bad); min-width: ${failedWidth > 0 ? "2px" : "0"}; }
        .split { display:grid; grid-template-columns: minmax(0, 1.15fr) minmax(190px, .85fr); gap:16px; margin-top:16px; }
        .panel { border:1px solid var(--ntp-glass-border-soft); border-radius:12px; padding:13px; background: color-mix(in srgb, var(--ntp-glass-bg) 90%, var(--ntp-text) 10%); min-width:0; }
        .panel-title { color:var(--ntp-muted); font-size:11px; font-weight:850; text-transform:uppercase; letter-spacing:.12em; margin-bottom:11px; }
        .const-row { display:grid; grid-template-columns: 76px minmax(0,1fr) 48px; align-items:center; gap:10px; margin:9px 0; }
        .const-label { display:flex; align-items:center; gap:7px; color:var(--ntp-muted); font-size:12px; font-weight:750; min-width:0; }
        .const-label i { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
        .const-track { position:relative; height:12px; border-radius:999px; overflow:hidden; background:rgba(255,255,255,.06); border:1px solid var(--ntp-glass-border-soft); }
        .const-seen { position:absolute; inset:0 auto 0 0; background:rgba(255,255,255,.10); }
        .const-used { position:absolute; inset:0 auto 0 0; opacity:.95; }
        .const-count { color:var(--ntp-text); text-align:right; font-size:12px; font-weight:800; }
        .talkers { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
        .talker { min-width:0; }
        .talker .raw-label { color:var(--ntp-muted); font-size:11px; font-weight:800; }
        .talker .raw-value { margin-top:3px; color:var(--ntp-text); font-size:18px; font-weight:780; }
        @media (max-width: 620px) {
          .health-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .metric.big { grid-column: span 2; }
          .split { grid-template-columns: 1fr; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          ${this.header(status, "Signal and GPS Health")}
          <div class="health-grid">
            <div class="metric big"><div class="label">Checksum Failure</div><div class="value ${checksumClass}">${formatPercent(status.gpsChecksumFailurePercent)}</div><div class="quality"><div class="fail" style="width:${failedWidth}%"></div></div></div>
            <div class="metric"><div class="label">GPS Chars</div><div class="value">${formatNumber(status.gpsChars, 0)}</div></div>
            <div class="metric"><div class="label">Sats Used</div><div class="value">${formatNumber(status.satellitesUsed, 0)}</div></div>
            <div class="metric"><div class="label">Avg SNR</div><div class="value">${avgSnr === undefined ? "-" : formatNumber(avgSnr, 1)} <span class="unit">dBHz</span></div></div>
            <div class="metric"><div class="label">Max SNR</div><div class="value">${maxSnr === undefined ? "-" : formatNumber(maxSnr, 1)} <span class="unit">dBHz</span></div></div>
            <div class="metric"><div class="label">SNR Sats</div><div class="value">${formatNumber(status.satellitesWithSnr, 0)}</div></div>
            <div class="metric"><div class="label">NMEA</div><div class="value">${escapeHtml(status.nmeaCapability || "-")}</div></div>
          </div>
          <div class="split">
            <div class="panel">
              <div class="panel-title">Constellations Used / Seen</div>
              ${constellationMarkup}
            </div>
            <div class="panel">
              <div class="panel-title">NMEA Talkers</div>
              <div class="talkers">
                <div class="talker"><div class="raw-label">GPS</div><div class="raw-value">${formatNumber(talkers.gps, 0)}</div></div>
                <div class="talker"><div class="raw-label">GLONASS</div><div class="raw-value">${formatNumber(talkers.glonass, 0)}</div></div>
                <div class="talker"><div class="raw-label">Galileo</div><div class="raw-value">${formatNumber(talkers.galileo, 0)}</div></div>
                <div class="talker"><div class="raw-label">BeiDou</div><div class="raw-value">${formatNumber(talkers.beidou, 0)}</div></div>
                <div class="talker"><div class="raw-label">Mixed</div><div class="raw-value">${formatNumber(talkers.mixed, 0)}</div></div>
                <div class="talker"><div class="raw-label">Failed</div><div class="raw-value">${formatNumber(status.gpsFailedChecksum, 0)}</div></div>
              </div>
            </div>
          </div>
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
if (!customElements.get("ntp32s3-raw-card")) {
  customElements.define("ntp32s3-raw-card", NtpRawCard);
}
if (!customElements.get("ntp32s3-health-card")) {
  customElements.define("ntp32s3-health-card", NtpHealthCard);
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
    description: "Theme-aware GNSS/NTP dashboard card.",
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
  {
    type: "ntp32s3-raw-card",
    name: "NTP32S3 Raw Data Card",
    preview: true,
    description: "Raw-ish GNSS/NTP values laid out like a receiver dashboard.",
  },
  {
    type: "ntp32s3-health-card",
    name: "NTP32S3 Health Card",
    preview: true,
    description: "GPS stream health, SNR summary, and constellation diagnostics.",
  },
];
for (const card of ntp32s3Cards) {
  if (!window.customCards.some((existing) => existing.type === card.type)) {
    window.customCards.push(card);
  }
}

console.info(`%c NTP32S3 Cards %c ${CARD_VERSION} `, "color: #64d2ff; font-weight: 700;", "color: #fff; background: #111827; border-radius: 4px;");
