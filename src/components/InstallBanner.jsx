import { useState, useEffect } from 'react'
import { Download, Camera, MapPin, Bell, CheckCircle2, Shield, X, ChevronRight } from 'lucide-react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [permissions, setPermissions] = useState({
    camera: 'unknown',
    location: 'unknown',
    notifications: 'unknown'
  })
  const [isRequesting, setIsRequesting] = useState(false)
  const [allGranted, setAllGranted] = useState(false)

  // Check if app is already installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    setIsInstalled(isStandalone)

    // Check if user already dismissed
    const wasDismissed = sessionStorage.getItem('ponto_install_dismissed')
    if (wasDismissed) setDismissed(true)
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

      try {
        const cam = await navigator.permissions.query({ name: 'camera' })
        perms.camera = cam.state
      } catch { perms.camera = 'prompt' }

      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' })
        perms.location = geo.state
      } catch { perms.location = 'prompt' }

      try {
        if ('Notification' in window) {
          perms.notifications = Notification.permission === 'default' ? 'prompt' : Notification.permission
        } else {
          perms.notifications = 'unavailable'
        }
      } catch { perms.notifications = 'unavailable' }

      setPermissions(perms)

      const allDone = perms.camera === 'granted' && perms.location === 'granted'
      setAllGranted(allDone)
    }

    checkPermissions()
    const interval = setInterval(checkPermissions, 3000)
    return () => clearInterval(interval)
  }, [])

  // Determine if banner should show
  useEffect(() => {
    if (dismissed) { setShowBanner(false); return }
    
    const needsInstall = !isInstalled && deferredPrompt
    const needsPermissions = permissions.camera !== 'granted' || permissions.location !== 'granted'
    
    if (needsInstall || needsPermissions) {
      setShowBanner(true)
    } else {
      setShowBanner(false)
    }
  }, [isInstalled, deferredPrompt, permissions, dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleRequestPermissions = async () => {
    setIsRequesting(true)

    // Request Camera
    if (permissions.camera !== 'granted') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        stream.getTracks().forEach(t => t.stop())
      } catch (err) {
        console.warn('Camera permission denied:', err)
      }
    }

    // Request Geolocation
    if (permissions.location !== 'granted') {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        })
      } catch (err) {
        console.warn('Geolocation permission denied:', err)
      }
    }

    // Request Notifications
    if (permissions.notifications === 'prompt' || permissions.notifications === 'default') {
      try {
        await Notification.requestPermission()
      } catch (err) {
        console.warn('Notification permission denied:', err)
      }
    }

    setIsRequesting(false)
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('ponto_install_dismissed', 'true')
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

  return (
    <div className="install-banner-overlay">
      <div className="install-banner">
        {/* Close button */}
        <button className="install-banner-close" onClick={handleDismiss} title="Fechar">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="install-banner-header">
          <div className="install-banner-logo">
            <img src="/icon-192.png" alt="Ponto Seguro" width="48" height="48" />
          </div>
          <div>
            <h3 className="install-banner-title">Ponto Seguro</h3>
            <p className="install-banner-subtitle">Configure o app para melhor experiência</p>
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
            {permissionItems.map((item) => (
              <div key={item.key} className="install-banner-perm-item">
                <div className={`install-banner-perm-icon ${item.status === 'granted' ? 'perm-granted' : 'perm-pending'}`}>
                  {item.icon}
                </div>
                <div className="install-banner-perm-info">
                  <span className="install-banner-perm-label">{item.label}</span>
                  <span className="install-banner-perm-desc">{item.desc}</span>
                </div>
                <div className="install-banner-perm-status">
                  {item.status === 'granted' ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                  ) : item.status === 'denied' ? (
                    <span className="perm-denied-badge">Bloqueado</span>
                  ) : item.status === 'unavailable' ? (
                    <span className="perm-na-badge">N/A</span>
                  ) : (
                    <span className="perm-pending-badge">Pendente</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!allGranted && (
            <button
              className="install-banner-grant-btn"
              onClick={handleRequestPermissions}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-flex' }}>⏳</span>
                  Solicitando...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Liberar Permissões
                </>
              )}
            </button>
          )}

          {allGranted && !needsInstall && (
            <button className="install-banner-done-btn" onClick={handleDismiss}>
              <CheckCircle2 size={16} />
              Tudo pronto! Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
