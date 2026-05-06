# NTP32S3 Cards

Four HACS-compatible Lovelace cards for the ESP32-S3 GPS NTP server.

The cards use Home Assistant card/theme variables with a restrained dark glass treatment.

## Cards

| Card type | Purpose |
| --- | --- |
| `ntp32s3-dashboard-card` | Compact GNSS/NTP overview inspired by mobile GPS dashboards |
| `ntp32s3-sky-card` | Satellite sky plot |
| `ntp32s3-signal-card` | Satellite signal strength chart |
| `ntp32s3-raw-card` | Raw-ish GNSS/NTP values including fix time and NTP packets |

## HACS

Add this repository to HACS as a custom repository with category `Dashboard`.

The card bundle is:

```text
dist/NTP-ESP32S3-Card.js
```

HACS auto-detects dashboard plugins by looking for JavaScript files in `dist/`. This repository intentionally does not override `filename` in `hacs.json`.

## Manual Resource

If installing manually, copy `dist/NTP-ESP32S3-Card.js` into Home Assistant under `www/community/NTP-ESP32S3-Card/`, then add this Lovelace resource:

```yaml
url: /local/community/NTP-ESP32S3-Card/NTP-ESP32S3-Card.js
type: module
```

## Basic Configuration

Use the `NTP32S3 Status` sensor created by the NTP32S3 Home Assistant integration, or any status entity that exposes the ESP32 JSON fields as attributes.

If the integration creates the default entity ID `sensor.ntp32s3_status`, the cards can auto-detect it:

```yaml
type: custom:ntp32s3-dashboard-card
name: NTP Server
```

Explicit configuration is still recommended if you rename entities:

```yaml
type: custom:ntp32s3-dashboard-card
status_entity: sensor.ntp32s3_status
name: NTP Server
```

## Troubleshooting

After installing or updating, hard-refresh Home Assistant. In the browser console, this should return `true`:

```js
customElements.get("ntp32s3-dashboard-card") !== undefined
```

And this should include the four NTP32S3 cards:

```js
window.customCards?.filter((card) => card.type?.startsWith("ntp32s3"))
```

If those checks fail, Home Assistant has not loaded the card resource. Confirm the Dashboard resource points to:

```text
/hacsfiles/NTP-ESP32S3-Card/NTP-ESP32S3-Card.js
```

or, for a manual install:

```text
/local/community/NTP-ESP32S3-Card/NTP-ESP32S3-Card.js
```

```yaml
type: custom:ntp32s3-sky-card
status_entity: sensor.ntp32s3_status
name: NTP Server
```

```yaml
type: custom:ntp32s3-signal-card
status_entity: sensor.ntp32s3_status
name: NTP Server
```

```yaml
type: custom:ntp32s3-raw-card
status_entity: sensor.ntp32s3_status
name: NTP Server
```

The `examples/` folder includes:

| File | Purpose |
| --- | --- |
| `mqtt-status-sensor.yaml` | Optional fallback if you use MQTT instead of the NTP32S3 integration |
| `three-card-stack.yaml` | Adds the dashboard, sky, signal, and raw cards as a vertical stack |

You can also map individual entities:

```yaml
type: custom:ntp32s3-dashboard-card
name: NTP Server
entities:
  satellites: sensor.ntp32s3_satellites
  satellite_detail_count: sensor.ntp32s3_satellite_detail_count
  hdop: sensor.ntp32s3_hdop
  altitude: sensor.ntp32s3_altitude
  ntp_packets: sensor.ntp32s3_ntp_packets
  ntp_packets_today: sensor.ntp32s3_ntp_packets_today
  ntp_time: sensor.ntp32s3_ntp_time
  time_valid: binary_sensor.ntp32s3_gps_time_valid
  pps_active: binary_sensor.ntp32s3_pps_active
  mqtt_connected: binary_sensor.ntp32s3_mqtt_connected
```

## Satellite Detail Data

The sky and signal cards become fully populated when the `status_entity` has one of these attributes:

- `satellite_detail`
- `satellites_detail`
- `satellites_in_view`
- `satellite_data`

Expected shape:

```json
[
  {
    "id": 12,
    "constellation": "gps",
    "azimuth": 230,
    "elevation": 48,
    "snr": 37,
    "used": true
  }
]
```

Supported constellation values include `gps`, `glonass`, `galileo`, `beidou`, and `sbas`.
