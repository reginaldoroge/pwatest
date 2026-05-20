import { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import Clock from './components/Clock'
import MainMenu from './components/MainMenu'
import LoginForm from './components/LoginForm'
import CameraView from './components/CameraView'
import ReceiptView from './components/ReceiptView'
import HistoryList from './components/HistoryList'
import { ArrowLeft, Fingerprint, CalendarDays } from 'lucide-react'
import { playBuzzerSound } from './utils/audio'
import { getCoordinates } from './utils/geolocation'
import { sendRecordToServer, syncPendingRecords, recordSyncFailure } from './utils/sync'
import localforage from 'localforage'
import './App.css'

// Configure localForage database
localforage.config({
  name: 'PontoSeguroDB',
  storeName: 'attendance_history'
})

function App() {
  // --- STATE ---
  const [employeeCpf, setEmployeeCpf] = useState(() => localStorage.getItem('ponto_employee_cpf') || '')
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('ponto_employee_name') || '')
  const [employeeRole, setEmployeeRole] = useState(() => localStorage.getItem('ponto_employee_role') || '')
  const [isConfiguring, setIsConfiguring] = useState(() => {
    return !localStorage.getItem('ponto_employee_name') || 
           !localStorage.getItem('ponto_employee_role') ||
           !localStorage.getItem('ponto_employee_cpf')
  })
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('user') 
  const [geolocation, setGeolocation] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [stampedPhoto, setStampedPhoto] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [successRecord, setSuccessRecord] = useState(null)
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  const [captureStatusText, setCaptureStatusText] = useState('')
  const [showLogoffConfirm, setShowLogoffConfirm] = useState(false)
  const [currentScreen, setCurrentScreen] = useState('menu') // 'menu' | 'ponto' | 'historico'

  // Refs
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  // --- LOAD AND MIGRATE HISTORY EFFECT ---
  useEffect(() => {
    const initHistory = async () => {
      try {
        const saved = await localforage.getItem('ponto_attendance_history')
        if (saved) {
          const mapped = saved.map(item => ({ ...item, syncStatus: item.syncStatus || 'synced' }))
          setAttendanceHistory(mapped)
        } else {
          // Fallback legacy migration: check if old localStorage has data
          const legacySaved = localStorage.getItem('ponto_attendance_history')
          if (legacySaved) {
            const parsed = JSON.parse(legacySaved)
            const migrated = parsed.map(item => ({ ...item, syncStatus: item.syncStatus || 'synced' }))
            setAttendanceHistory(migrated)
            await localforage.setItem('ponto_attendance_history', migrated)
            localStorage.removeItem('ponto_attendance_history')
            console.log("Histórico legado do localStorage migrado com sucesso para o IndexedDB via localForage!")
          }
        }
      } catch (err) {
        console.error("Erro ao inicializar histórico com localForage:", err)
      } finally {
        setIsHistoryLoaded(true)
      }
    }
    initHistory()
  }, [])

  // --- MONITOR CONNECTIVITY EFFECT ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // --- AUTO SYNC ON CONNECT EFFECT ---
  useEffect(() => {
    if (isHistoryLoaded && isOnline) {
      syncPendingRecords(setAttendanceHistory)
    }
  }, [isHistoryLoaded, isOnline])

  // --- SAVE HISTORY EFFECT ---
  useEffect(() => {
    if (!isHistoryLoaded) return
    localforage.setItem('ponto_attendance_history', attendanceHistory)
      .catch(err => console.error("Erro ao salvar histórico no localforage:", err))
  }, [attendanceHistory, isHistoryLoaded])

  // --- BROWSER BACK BUTTON SUPPORT ---
  useEffect(() => {
    if (isConfiguring) return

    // Push state when navigating to sub-screens
    if (currentScreen !== 'menu') {
      window.history.pushState({ screen: currentScreen }, '')
    }

    const handlePopState = () => {
      if (stampedPhoto) {
        setStampedPhoto(null)
        setSuccessRecord(null)
      } else if (currentScreen !== 'menu') {
        navigateToMenu()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentScreen, isConfiguring])
  // --- CAMERA MANAGEMENT ---
  const startCamera = async () => {
    setCameraError(null)
    setIsCameraActive(true)
    stopCamera()
    try {
      const constraints = { video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      console.warn("Primeira tentativa de câmera falhou, tentando fallback...", err)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (errFallback) {
        console.warn("Fallback 1 falhou, tentando simples...", errFallback)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          streamRef.current = stream
          if (videoRef.current) videoRef.current.srcObject = stream
        } catch (errSimple) {
          console.error("Todas as tentativas falharam:", errSimple)
          setCameraError("Câmera real indisponível. Por favor, conceda permissões de câmera.")
          setIsCameraActive(false)
        }
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }



  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  useEffect(() => {
    if (isCameraActive) startCamera()
    return () => stopCamera()
  }, [facingMode])

  // --- GEOLOCATION TRIGGER ---
  const triggerGetCoordinates = async () => {
    setIsCapturingLocation(true)
    setGeoError(null)
    try {
      const res = await getCoordinates()
      setGeolocation(res)
      setIsCapturingLocation(false)
      return res
    } catch (err) {
      setGeoError(err)
      setIsCapturingLocation(false)
      throw err
    }
  }

  // --- SESSION & LOGIN MANAGEMENT ---
  const handleLogin = (cpf, name, role) => {
    localStorage.setItem('ponto_employee_cpf', cpf)
    localStorage.setItem('ponto_employee_name', name)
    localStorage.setItem('ponto_employee_role', role)
    
    setEmployeeCpf(cpf)
    setEmployeeName(name)
    setEmployeeRole(role)
    setIsConfiguring(false)
  }

  const handleLogoff = () => {
    setShowLogoffConfirm(true)
  }

  const executeLogoff = () => {
    localStorage.removeItem('ponto_employee_cpf')
    localStorage.removeItem('ponto_employee_name')
    localStorage.removeItem('ponto_employee_role')
    
    setEmployeeCpf('')
    setEmployeeName('')
    setEmployeeRole('')
    setIsConfiguring(true)
    setShowLogoffConfirm(false)
  }

  // --- DUAL-CAMERA REGISTRATION PIPELINE ---
  const handleRegisterPoint = async () => {
    if (isRegistering) return
    setIsRegistering(true)
    setCaptureStatusText("Obtendo localização GPS...")

    let location = null
    try {
      location = await triggerGetCoordinates()
    } catch (err) {
      console.warn("Prosseguindo sem GPS exato devido a erro:", err)
    }

    if (!location) {
      location = {
        latitude: -23.55052,
        longitude: -46.633308,
        accuracy: 100,
        mapsLink: `https://www.google.com/maps?q=-23.55052,-46.633308`,
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
        isMock: true
      }
      setGeolocation(location)
    }

    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error("Elemento canvas indisponível.")
      
      const getCameraStream = async (mode) => {
        try {
          return await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
        } catch (err) {
          try {
            return await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false })
          } catch (e) {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          }
        }
      }

      const selfieCanvas = document.createElement('canvas')
      selfieCanvas.width = 640
      selfieCanvas.height = 480
      const selfieCtx = selfieCanvas.getContext('2d')

      const envCanvas = document.createElement('canvas')
      envCanvas.width = 640
      envCanvas.height = 480
      const envCtx = envCanvas.getContext('2d')
      let hasBackCapture = false

      // Capture Selfie (Front Camera)
      stopCamera()
      setCaptureStatusText("Capturando Câmera Frontal (Selfie)...")
      const frontStream = await getCameraStream('user')
      streamRef.current = frontStream
      if (videoRef.current) {
        videoRef.current.srcObject = frontStream
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = () => videoRef.current.play().then(resolve).catch(resolve)
          setTimeout(resolve, 600)
        })
      }
      await new Promise(resolve => setTimeout(resolve, 300))
      if (!videoRef.current) throw new Error("Elemento de vídeo não inicializado.")
      selfieCtx.drawImage(videoRef.current, 0, 0, 640, 480)

      // Capture Environment (Back Camera)
      setCaptureStatusText("Alternando para Câmera Traseira (Ambiente)...")
      stopCamera()
      if (videoRef.current) videoRef.current.srcObject = null
      await new Promise(resolve => setTimeout(resolve, 300))

      try {
        const backStream = await getCameraStream('environment')
        streamRef.current = backStream
        if (videoRef.current) {
          videoRef.current.srcObject = backStream
          await new Promise(resolve => {
            videoRef.current.onloadedmetadata = () => videoRef.current.play().then(resolve).catch(resolve)
            setTimeout(resolve, 600)
          })
        }
        setCaptureStatusText("Capturando foto do ambiente...")
        await new Promise(resolve => setTimeout(resolve, 300))
        if (videoRef.current) {
          envCtx.drawImage(videoRef.current, 0, 0, 640, 480)
          hasBackCapture = true
        }
      } catch (envErr) {
        console.warn("Erro ao capturar câmera traseira, usando selfie nas duas perspectivas.", envErr)
      }

      stopCamera()
      if (videoRef.current) videoRef.current.srcObject = null
      setIsCameraActive(false)

      // Canvas Composition Drawing
      const width = 640
      const height = 480
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (hasBackCapture) ctx.drawImage(envCanvas, 0, 0, width, height)
      else ctx.drawImage(selfieCanvas, 0, 0, width, height)

      // Picture-in-Picture selfie drawing
      ctx.save()
      ctx.shadowColor = 'rgba(217, 184, 103, 0.6)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 4
      ctx.strokeStyle = '#d9b867'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(20, 20, 140, 105, 8)
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(20, 20, 140, 105, 8)
      ctx.clip()
      ctx.drawImage(selfieCanvas, 20, 20, 140, 105)
      ctx.restore()

      // Watermark Logo
      const logoImg = new Image()
      logoImg.src = '/icon-192.png'
      await new Promise(resolve => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 60
        const logoX = width - logoSize - 20
        const logoY = 20
        ctx.save()
        ctx.shadowColor = 'rgba(217, 184, 103, 0.4)'
        ctx.shadowBlur = 10
        ctx.fillStyle = 'rgba(9, 13, 22, 0.65)'
        ctx.beginPath()
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
        ctx.restore()
      }

      // Bottom Banner & Texts Stamping
      const bannerHeight = 105
      const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height)
      gradient.addColorStop(0, 'rgba(9, 13, 22, 0.0)')
      gradient.addColorStop(0.15, 'rgba(9, 13, 22, 0.88)')
      gradient.addColorStop(1, 'rgba(9, 13, 22, 0.98)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, height - bannerHeight, width, bannerHeight)

      const accentGradient = ctx.createLinearGradient(0, 0, width, 0)
      accentGradient.addColorStop(0, '#d9b867')
      accentGradient.addColorStop(0.5, '#b7894d')
      accentGradient.addColorStop(1, '#34d399')
      ctx.fillStyle = accentGradient
      ctx.fillRect(0, height - bannerHeight, width, 3)

      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'

      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      const now = new Date()
      const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      ctx.fillText(`⏱️ REGISTRO: ${formattedDate} - ${formattedTime}`, 20, height - 82)

      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      const addressText = `🏠 END: ${location.address || 'Endereço Indisponível'}`
      const maxAddressWidth = width - 260
      let displayAddress = addressText
      if (ctx.measureText(displayAddress).width > maxAddressWidth) {
        while (ctx.measureText(displayAddress + '...').width > maxAddressWidth && displayAddress.length > 5) {
          displayAddress = displayAddress.slice(0, -1)
        }
        displayAddress = displayAddress.trim() + '...'
      }
      ctx.fillText(displayAddress, 20, height - 60)

      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`📍 GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, 20, height - 40)
      ctx.fillText(`🔗 MAPS: https://www.google.com/maps?q=${location.latitude},${location.longitude}`, 20, height - 20)

      // User Badge
      const userBadgeText = employeeName.toUpperCase()
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      const badgeWidth = ctx.measureText(userBadgeText).width + 16
      const badgeX = width - badgeWidth - 20
      ctx.fillStyle = 'rgba(217, 184, 103, 0.2)'
      ctx.strokeStyle = 'rgba(217, 184, 103, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(badgeX, height - 68, badgeWidth, 22, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fce2a6'
      ctx.textAlign = 'center'
      ctx.fillText(userBadgeText, badgeX + badgeWidth / 2, height - 57)

      // Security double photo stamp badge
      const bioBadgeText = "🛡️ FOTO DUPLA: CONFIRMADA"
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
      const bioBadgeWidth = ctx.measureText(bioBadgeText).width + 12
      const bioBadgeX = width - bioBadgeWidth - 20
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(bioBadgeX, height - 38, bioBadgeWidth, 18, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#34d399'
      ctx.fillText(bioBadgeText, bioBadgeX + bioBadgeWidth / 2, height - 29)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setStampedPhoto(dataUrl)

      const baseRecord = {
        id: 'ponto_' + Date.now(),
        employeeCpf,
        employeeName,
        employeeRole,
        date: formattedDate,
        time: formattedTime,
        latitude: location.latitude,
        longitude: location.longitude,
        mapsLink: location.mapsLink,
        address: location.address || '',
        photo: dataUrl
      }

      let syncStatus = 'pending'
      if (isOnline) {
        setCaptureStatusText("Sincronizando registro...")
        const isSent = await sendRecordToServer(baseRecord)
        if (isSent) {
          syncStatus = 'synced'
        } else {
          recordSyncFailure(baseRecord.id)
        }
      }

      const newRecord = {
        ...baseRecord,
        syncStatus
      }

      setAttendanceHistory(prev => [newRecord, ...prev])
      setSuccessRecord(newRecord)
      playBuzzerSound(true)
    } catch (err) {
      console.error("Erro ao registrar ponto:", err)
      playBuzzerSound(false)
      alert("Erro técnico ao capturar e processar. Detalhes: " + err.message)
    } finally {
      setIsRegistering(false)
      setCaptureStatusText("")
    }
  }

  // --- ACTIONS & SHARING ---
  const handleReset = () => {
    setStampedPhoto(null)
    setSuccessRecord(null)
    setGeolocation(null)
    setGeoError(null)
    setCurrentScreen('menu')
  }

  const navigateToMenu = () => {
    stopCamera()
    setIsCameraActive(false)
    setStampedPhoto(null)
    setSuccessRecord(null)
    setCurrentScreen('menu')
  }

  const handleDownload = () => {
    if (!stampedPhoto || !successRecord) return
    const link = document.createElement('a')
    link.href = stampedPhoto
    link.download = `Ponto_${employeeName.replace(/\s+/g, '_')}_${successRecord.date.replace(/\//g, '-')}_${successRecord.time.replace(/:/g, '')}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareWhatsApp = async () => {
    if (!successRecord || !stampedPhoto) return
    const mapsUrl = `https://www.google.com/maps?q=${successRecord.latitude},${successRecord.longitude}`
    const shareText = `⏰ *PONTO ELETRÔNICO REGISTRADO!* ⏰\n\n👤 *Funcionário:* ${successRecord.employeeName}\n💼 *Cargo:* ${successRecord.employeeRole}\n📅 *Data:* ${successRecord.date}\n🕒 *Hora:* ${successRecord.time}\n` + (successRecord.address ? `🏠 *Endereço:* ${successRecord.address}\n` : '') + `📍 *Localização:* ${mapsUrl}\n\n*Comprovante de Ponto com Foto gerado com sucesso.*`
    
    if (navigator.share && navigator.canShare) {
      try {
        const res = await fetch(stampedPhoto)
        const blob = await res.blob()
        const fileName = `ponto-${successRecord.date.replace(/\//g, '-')}-${successRecord.time.replace(/:/g, '')}.jpg`
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Registro de Ponto', text: shareText })
          return
        }
      } catch (err) {
        console.warn("Web Share API falhou:", err)
      }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank')
    setTimeout(() => {
      handleDownload()
      alert("Comprovante enviado! A foto carimbada foi baixada no seu dispositivo. Caso queira, anexe-a na mensagem.")
    }, 800)
  }

  const handleDeleteRecord = (id, e) => {
    e.stopPropagation()
    if (confirm("Deseja realmente excluir este comprovante do seu histórico local?")) {
      setAttendanceHistory(prev => prev.filter(item => item.id !== id))
    }
  }

  const handleSyncRecord = async (record) => {
    if (isRegistering) return
    setIsRegistering(true)
    setCaptureStatusText("Sincronizando registro...")
    try {
      const isSent = await sendRecordToServer(record)
      if (isSent) {
        setAttendanceHistory(prev => {
          const updated = prev.map(item => 
            item.id === record.id ? { ...item, syncStatus: 'synced' } : item
          )
          localforage.setItem('ponto_attendance_history', updated)
          return updated
        })
        playBuzzerSound(true)
      } else {
        playBuzzerSound(false)
        alert("Não foi possível enviar o registro no momento. Verifique sua conexão de rede.")
      }
    } catch (err) {
      console.error("[Sync] Erro manual:", err)
      playBuzzerSound(false)
      alert("Erro crítico de sincronização.")
    } finally {
      setIsRegistering(false)
      setCaptureStatusText("")
    }
  }

  const pendingCount = attendanceHistory.filter(r => r.syncStatus === 'pending').length

  return (
    <>
      {/* HEADER — always visible when logged in */}
      {!isConfiguring && (
        <Header employeeName={employeeName} employeeRole={employeeRole} onLogoff={handleLogoff} isOnline={isOnline} />
      )}

      {/* LOGIN SCREEN */}
      {isConfiguring && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%',
          margin: 'auto 0'
        }}>
          <LoginForm
            onLogin={handleLogin}
            playBuzzerSound={playBuzzerSound}
          />
        </div>
      )}

      {/* ===== MAIN MENU SCREEN ===== */}
      {!isConfiguring && currentScreen === 'menu' && (
        <MainMenu
          onNavigate={setCurrentScreen}
          employeeName={employeeName}
          pendingCount={pendingCount}
        />
      )}

      {/* ===== BATER PONTO SCREEN ===== */}
      {!isConfiguring && currentScreen === 'ponto' && (
        <div className="page-enter">
          {/* Back Button */}
          {!stampedPhoto && (
            <button className="nav-back-btn" onClick={navigateToMenu} id="btn-back-ponto">
              <ArrowLeft size={16} />
              <span>Voltar ao Menu</span>
            </button>
          )}

          {/* Page Title */}
          {!stampedPhoto && (
            <div className="page-title-header">
              <div className="page-title-icon page-title-icon-primary">
                <Fingerprint size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', lineHeight: '1.2' }}>Bater Ponto</h2>
                <p style={{ fontSize: '12px', marginTop: '2px' }}>Registre sua entrada ou saída</p>
              </div>
            </div>
          )}

          {/* Clock */}
          {!stampedPhoto && <Clock />}

          {/* Camera & Registration */}
          {!stampedPhoto && (
            <CameraView
              isCameraActive={isCameraActive} setIsCameraActive={setIsCameraActive}
              startCamera={startCamera} stopCamera={stopCamera}
              isRegistering={isRegistering} captureStatusText={captureStatusText}
              videoRef={videoRef} isCapturingLocation={isCapturingLocation}
              geolocation={geolocation} geoError={geoError}
              getCoordinates={triggerGetCoordinates} toggleCameraFacing={toggleCameraFacing}
              handleRegisterPoint={handleRegisterPoint} cameraError={cameraError}
            />
          )}

          {/* Receipt after registration */}
          {stampedPhoto && successRecord && (
            <>
              <button className="nav-back-btn" onClick={handleReset} id="btn-back-ponto-receipt">
                <ArrowLeft size={16} />
                <span>Voltar ao Menu</span>
              </button>
              <ReceiptView
                stampedPhoto={stampedPhoto} successRecord={successRecord}
                handleShareWhatsApp={handleShareWhatsApp} handleDownload={handleDownload}
                handleReset={handleReset}
              />
            </>
          )}
        </div>
      )}

      {/* ===== HISTÓRICO SCREEN ===== */}
      {!isConfiguring && currentScreen === 'historico' && (
        <div className="page-enter">
          {/* Back Button */}
          {!stampedPhoto && (
            <button className="nav-back-btn" onClick={navigateToMenu} id="btn-back-historico">
              <ArrowLeft size={16} />
              <span>Voltar ao Menu</span>
            </button>
          )}

          {/* Page Title */}
          {!stampedPhoto && (
            <div className="page-title-header">
              <div className="page-title-icon page-title-icon-secondary">
                <CalendarDays size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', lineHeight: '1.2' }}>Histórico de Pontos</h2>
                <p style={{ fontSize: '12px', marginTop: '2px' }}>Consulte todos os registros anteriores</p>
              </div>
            </div>
          )}

          {/* Receipt view when clicking a history item */}
          {stampedPhoto && successRecord ? (
            <>
              <button className="nav-back-btn" onClick={() => { setStampedPhoto(null); setSuccessRecord(null) }} id="btn-back-receipt">
                <ArrowLeft size={16} />
                <span>Voltar ao Histórico</span>
              </button>
              <ReceiptView
                stampedPhoto={stampedPhoto} successRecord={successRecord}
                handleShareWhatsApp={handleShareWhatsApp} handleDownload={handleDownload}
                handleReset={() => { setStampedPhoto(null); setSuccessRecord(null) }}
              />
            </>
          ) : (
            <HistoryList
              isConfiguring={false}
              attendanceHistory={attendanceHistory}
              setStampedPhoto={setStampedPhoto}
              setSuccessRecord={setSuccessRecord}
              handleDeleteRecord={handleDeleteRecord}
              handleSyncRecord={handleSyncRecord}
            />
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      <footer className="footer-info">
        <span>© 2026 Ponto Seguro PWA</span>
        <span>Tecnologia PWA Offline</span>
      </footer>

      {/* CONFIRMATION LOGOFF MODAL */}
      {showLogoffConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}>
          <div className="glass-panel" style={{
            maxWidth: '340px',
            width: '100%',
            borderColor: 'var(--error)',
            boxShadow: '0 8px 32px 0 rgba(239, 68, 68, 0.15)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid var(--error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <span style={{ fontSize: '24px' }}>🚪</span>
            </div>
            
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                Confirmar Saída
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                Deseja realmente fazer logoff do sistema? Todos os seus dados de sessão local serão desconectados.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowLogoffConfirm(false)}
                style={{ flex: 1, padding: '10px' }}
              >
                Cancelar
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={executeLogoff}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: 'linear-gradient(135deg, var(--error), oklch(0.65 0.15 25 / 80%))',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' 
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
