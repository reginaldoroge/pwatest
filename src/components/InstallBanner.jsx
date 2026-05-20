import { useState, useEffect } from 'react'
import { Download, Camera, MapPin, Bell, CheckCircle2, Shield, X, ChevronRight, Settings } from 'lucide-react'
import { requestCameraStream, stopCameraStream } from '../utils/camera'
import {
  clearConfirmedPermission,
  confirmPermission,
  getBrowserPermissionState,
  getConfirmedPermissions,
  getEffectivePermissionState,
  isIosDevice,
  requestLocationPermission
} from '../utils/permissions'
import './InstallBanner.css'

const REQUIRED_PERMISSIONS = ['camera', 'location']
const IS_IOS = isIosDevice()

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [permissions, setPermissions] = useState({
    camera: 'unknown',
    location: 'unknown',
    notifications: 'unknown'
  })
  const [isRequesting, setIsRequesting] = useState(false)
  const [allGranted, setAllGranted] = useState(false)
  const [showSettingsHint, setShowSettingsHint] = useState(false)
  const [confirmedPermissions, setConfirmedPermissions] = useState(() => getConfirmedPermissions())
  const [permissionError, setPermissionError] = useState('')

  // Check if app is already installed and if permissions were previously completed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    setIsInstalled(isStandalone)

    // Check if user completed the permission flow in a previous session
    const permissionsCompleted = localStorage.getItem('ponto_permissions_completed')
    if (permissionsCompleted) {
      // Verify permissions are still granted (user might have revoked in browser settings)
      // The interval check will handle hiding the banner if they're still valid
    }
  }, [])

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed
    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  // Check permissions status
  useEffect(() => {
    const checkPermissions = async () => {
      const perms = { camera: 'unknown', location: 'unknown', notifications: 'unknown' }

      const camState = await getBrowserPermissionState('camera')
      perms.camera = getEffectivePermissionState('camera', camState, confirmedPermissions)

      const geoState = await getBrowserPermissionState('geolocation')
      perms.location = getEffectivePermissionState('location', geoState, confirmedPermissions)

      try {
        if ('Notification' in window) {
          perms.notifications = Notification.permission === 'default' ? 'prompt' : Notification.permission
        } else {
          perms.notifications = 'unavailable'
        }
      } catch { perms.notifications = 'unavailable' }

      setPermissions(perms)

      const allDone = REQUIRED_PERMISSIONS.every(key => perms[key] === 'granted')
      setAllGranted(allDone)
    }

    checkPermissions()
    const interval = setInterval(checkPermissions, 3000)
    return () => clearInterval(interval)
  }, [confirmedPermissions])

  // Determine if banner should show
  useEffect(() => {
    // If all required permissions are granted, allow hiding
    const needsPermissions = permissions.camera !== 'granted' || permissions.location !== 'granted'
    const needsInstall = !isInstalled && deferredPrompt
    const permissionsCompleted = localStorage.getItem('ponto_permissions_completed')

    // If permissions were completed in a previous session and still granted, hide
    if (permissionsCompleted && !needsPermissions && !needsInstall) {
      setShowBanner(false)
      return
    }

    // Show banner if permissions are needed or install is needed
    if (needsInstall || needsPermissions) {
      setShowBanner(true)
      // Clear the completed flag since permissions are no longer all granted
      localStorage.removeItem('ponto_permissions_completed')
      // Check if any permission is denied (blocked) to show settings hint
      const anyDenied = permissions.camera === 'denied' || permissions.location === 'denied'
      setShowSettingsHint(anyDenied)
    } else {
      // All granted - mark as completed and hide
      localStorage.setItem('ponto_permissions_completed', 'true')
      setShowBanner(false)
    }
  }, [isInstalled, deferredPrompt, permissions])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const recheckPermissions = async () => {
    const perms = { camera: 'unknown', location: 'unknown', notifications: 'unknown' }
    const latestConfirmed = getConfirmedPermissions()
    const camState = await getBrowserPermissionState('camera')
    perms.camera = getEffectivePermissionState('camera', camState, latestConfirmed)

    const geoState = await getBrowserPermissionState('geolocation')
    perms.location = getEffectivePermissionState('location', geoState, latestConfirmed)

    try {
      if ('Notification' in window) {
        perms.notifications = Notification.permission === 'default' ? 'prompt' : Notification.permission
      } else {
        perms.notifications = 'unavailable'
      }
    } catch { perms.notifications = 'unavailable' }
    setPermissions(perms)
    setConfirmedPermissions(latestConfirmed)
  }

  const requestSingle = async (key) => {
    setPermissionError('')

    if (!window.isSecureContext) {
      setPermissionError('No iPhone, câmera e localização só podem ser liberadas em HTTPS.')
      return false
    }

    if (key === 'camera' && permissions.camera !== 'granted') {
      try {
        const stream = await requestCameraStream('user')
        stopCameraStream(stream)
        setConfirmedPermissions(confirmPermission('camera'))
        return true
      } catch (err) {
        setConfirmedPermissions(clearConfirmedPermission('camera'))
        setPermissionError('Não foi possível liberar a câmera. Se já foi bloqueada, libere nas configurações do Safari/site.')
        console.warn('Camera permission denied:', err)
        return false
      }
    }

    if (key === 'location' && permissions.location !== 'granted') {
      try {
        await requestLocationPermission()
        setConfirmedPermissions(confirmPermission('location'))
        return true
      } catch (err) {
        setConfirmedPermissions(clearConfirmedPermission('location'))
        setPermissionError('Não foi possível liberar a localização. Confira se Localização está ativa para Safari/Sites no iPhone.')
        console.warn('Geolocation permission denied:', err)
        return false
      }
    }

    if (key === 'notifications' && permissions.notifications !== 'granted') {
      try {
        const result = await Notification.requestPermission()
        if (result === 'granted') setConfirmedPermissions(confirmPermission('notifications'))
        return result === 'granted'
      } catch (err) {
        console.warn('Notification permission denied:', err)
        return false
      }
    }

    return true
  }

  const handleRequestPermission = async (key) => {
    if (isRequesting) return
    setIsRequesting(key)
    await requestSingle(key)
    setIsRequesting(false)
    setTimeout(recheckPermissions, 500)
  }

  const handleRequestPermissions = async () => {
    if (isRequesting) return

    if (IS_IOS) {
      setPermissionError('No iPhone, libere câmera e localização uma por vez tocando em cada permissão.')
      return
    }

    setIsRequesting('all')

    if (permissions.camera !== 'granted') await requestSingle('camera')
    if (permissions.location !== 'granted') await requestSingle('location')
    if (permissions.notifications !== 'granted') await requestSingle('notifications')

    setIsRequesting(false)
    setTimeout(recheckPermissions, 500)
  }

  if (!showBanner) return null

  const permissionItems = [
    {
      key: 'camera',
      label: 'Câmera',
      desc: 'Para captura de foto do ponto',
      icon: <Camera size={16} />,
      status: permissions.camera
    },
    {
      key: 'location',
      label: 'Localização',
      desc: 'Para registro do GPS',
      icon: <MapPin size={16} />,
      status: permissions.location
    },
    {
      key: 'notifications',
      label: 'Notificações',
      desc: 'Para alertas de sincronização',
      icon: <Bell size={16} />,
      status: permissions.notifications
    }
  ]

  const needsInstall = !isInstalled && deferredPrompt

  // Only allow dismiss when all required permissions are granted
  const canDismiss = allGranted
  const showGrantAll = !IS_IOS && !allGranted && !showSettingsHint

  return (
    <div className="install-banner-overlay">
      <div className="install-banner">
        {/* Close button - only show when all permissions granted */}
        {canDismiss && (
          <button className="install-banner-close" onClick={() => {
            localStorage.setItem('ponto_permissions_completed', 'true')
            setShowBanner(false)
          }} title="Fechar">
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div className="install-banner-header">
          <div className="install-banner-logo">
            <img src="/icon-192.png" alt="Ponto Seguro" width="48" height="48" />
          </div>
          <div>
            <h3 className="install-banner-title">Ponto Seguro</h3>
            <p className="install-banner-subtitle">
              {allGranted ? 'Tudo configurado!' : 'Permissões necessárias para o funcionamento'}
            </p>
          </div>
        </div>

        {/* Install Section */}
        {needsInstall && (
          <button className="install-banner-install-btn" onClick={handleInstall}>
            <div className="install-banner-install-icon">
              <Download size={20} />
            </div>
            <div className="install-banner-install-text">
              <span className="install-banner-install-title">Instalar Aplicativo</span>
              <span className="install-banner-install-desc">Acesso rápido na tela inicial</span>
            </div>
            <ChevronRight size={18} className="install-banner-arrow" />
          </button>
        )}

        {/* Permissions Section */}
        <div className="install-banner-permissions">
          <span className="install-banner-section-label">
            <Shield size={13} />
            Permissões necessárias
          </span>

          <div className="install-banner-perm-list">
            {permissionItems.map((item) => {
              const canRequest = item.status !== 'granted' && item.status !== 'unavailable'
              const isClickable = canRequest && !isRequesting
              const isLoading = isRequesting === item.key || isRequesting === 'all'
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`install-banner-perm-item ${isClickable ? 'perm-clickable' : ''}`}
                  onClick={isClickable ? () => handleRequestPermission(item.key) : undefined}
                  disabled={!isClickable}
                  aria-label={`Liberar ${item.label}`}
                >
                  <div className={`install-banner-perm-icon ${item.status === 'granted' ? 'perm-granted' : item.status === 'denied' ? 'perm-denied' : 'perm-pending'}`}>
                    {item.icon}
                  </div>
                  <div className="install-banner-perm-info">
                    <span className="install-banner-perm-label">{item.label}</span>
                    <span className="install-banner-perm-desc">{item.desc}</span>
                  </div>
                  <div className="install-banner-perm-status">
                    {item.status === 'granted' ? (
                      <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                    ) : isLoading ? (
                      <span className="animate-spin" style={{ display: 'inline-flex', fontSize: '12px' }}>⏳</span>
                    ) : item.status === 'denied' ? (
                      <span className="perm-denied-badge perm-clickable-badge">Toque para tentar</span>
                    ) : item.status === 'unavailable' ? (
                      <span className="perm-na-badge">N/A</span>
                    ) : (
                      <span className="perm-pending-badge">Toque para liberar</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Settings hint for blocked permissions */}
          {showSettingsHint && (
            <div className="install-banner-settings-hint">
              <Settings size={14} />
              <span>
                Permissão bloqueada. Acesse as configurações do navegador para desbloquear:
                <strong> Configurações → Privacidade → Permissões do site</strong>
              </span>
            </div>
          )}

          {permissionError && (
            <div className="install-banner-settings-hint">
              <Settings size={14} />
              <span>{permissionError}</span>
            </div>
          )}

          {IS_IOS && !allGranted && !permissionError && (
            <div className="install-banner-ios-hint">
              No iPhone, libere câmera e localização separadamente.
            </div>
          )}

          {showGrantAll && (
            <button
              className="install-banner-grant-btn"
              onClick={handleRequestPermissions}
              disabled={!!isRequesting}
            >
              {isRequesting === 'all' ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-flex' }}>⏳</span>
                  Solicitando...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Liberar Todas
                </>
              )}
            </button>
          )}

          {allGranted && !needsInstall && (
            <button className="install-banner-done-btn" onClick={() => {
              localStorage.setItem('ponto_permissions_completed', 'true')
              setShowBanner(false)
            }}>
              <CheckCircle2 size={16} />
              Tudo pronto! Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
