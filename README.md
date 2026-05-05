# NTP32S3 Cards

Three HACS-compatible Lovelace cards for the ESP32-S3 GPS NTP server.

The cards use a dark translucent glass style intended to sit nicely alongside the iOS Dark Glass Home Assistant theme.

## Cards

| Card type | Purpose |
| --- | --- |
| `ntp32s3-dashboard-card` | Compact GNSS/NTP overview inspired by mobile GPS dashboards |
| `ntp32s3-sky-card` | Satellite sky plot |
| `ntp32s3-signal-card` | Satellite signal strength chart |

## HACS

Add this folder/repository to HACS as a custom frontend repository.

The HACS entry point is:

```text
dist/ntp32s3-card.js
```

## Manual Resource

If installing manually, copy `dist/ntp32s3-card.js` into Home Assistant under `www/community/ntp32s3-card/`, then add this Lovelace resource:

```yaml
url: /local/community/ntp32s3-card/ntp32s3-card.js
type: module
```

## Basic Configuration

Use a status entity if your MQTT/REST sensor exposes the ESP32 JSON fields as attributes.

```yaml
type: custom:ntp32s3-dashboard-card
status_entity: sensor.ntp32s3_status
name: NTP Server
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

The `examples/` folder includes:

| File | Purpose |
| --- | --- |
| `mqtt-status-sensor.yaml` | Creates a single MQTT status sensor with JSON attributes from `<base-topic>/status` |
| `three-card-stack.yaml` | Adds all three cards as a vertical stack |

You can also map individual entities:

```yaml
type: custom:ntp32s3-dashboard-card
name: NTP Server
entities:
  satellites: sensor.gps_satellites
  hdop: sensor.gps_hdop
  altitude: sensor.gps_altitude
  ntp_packets: sensor.ntp_packets_served
  time_valid: binary_sensor.gps_time_valid
  pps_active: binary_sensor.gps_pps_active
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
