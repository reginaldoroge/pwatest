const CONFIRMED_KEY = 'ponto_permissions_confirmed'

export function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function getConfirmedPermissions() {
  try {
    return JSON.parse(localStorage.getItem(CONFIRMED_KEY)) || {}
  } catch {
    return {}
  }
}

export function confirmPermission(key) {
  const confirmed = {
    ...getConfirmedPermissions(),
    [key]: true
  }
  localStorage.setItem(CONFIRMED_KEY, JSON.stringify(confirmed))
  return confirmed
}

export function clearConfirmedPermission(key) {
  const confirmed = getConfirmedPermissions()
  delete confirmed[key]
  localStorage.setItem(CONFIRMED_KEY, JSON.stringify(confirmed))
  return confirmed
}

export async function getBrowserPermissionState(name) {
  try {
    if (!navigator.permissions?.query) return 'prompt'
    const permission = await navigator.permissions.query({ name })
    return permission.state
  } catch {
    return 'prompt'
  }
}

export function getEffectivePermissionState(key, browserState, confirmed) {
  if (isIosDevice() && confirmed[key]) return 'granted'
  return browserState
}

export function requestLocationPermission() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada pelo navegador.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}
