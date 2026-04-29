import mapboxgl from 'mapbox-gl'

type MapboxWithTelemetryToggle = typeof mapboxgl & {
  setTelemetryEnabled?: (enabled: boolean) => void
}

let telemetryDisabled = false

export const disableMapboxTelemetry = () => {
  if (telemetryDisabled) {
    return
  }

  telemetryDisabled = true

  try {
    ;(mapboxgl as MapboxWithTelemetryToggle).setTelemetryEnabled?.(false)
  } catch {
    telemetryDisabled = false
  }
}
