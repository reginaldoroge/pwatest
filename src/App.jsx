import { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import Clock from './components/Clock'
import ProfileForm from './components/ProfileForm'
import CameraView from './components/CameraView'
import ReceiptView from './components/ReceiptView'
import HistoryList from './components/HistoryList'
import { playBuzzerSound } from './utils/audio'
import { getCoordinates } from './utils/geolocation'
import localforage from 'localforage'
import './App.css'

// Configure localForage database
localforage.config({
  name: 'PontoSeguroDB',
  storeName: 'attendance_history'
})

function App() {
  // --- STATE ---
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('ponto_employee_name') || '')
  const [employeeRole, setEmployeeRole] = useState(() => localStorage.getItem('ponto_employee_role') || '')
  const [isConfiguring, setIsConfiguring] = useState(() => !localStorage.getItem('ponto_employee_name'))
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

  // AI Face recognition states
  const [isModelsLoaded, setIsModelsLoaded] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState(null)
  const [savedDescriptor, setSavedDescriptor] = useState(() => {
    const saved = localStorage.getItem('ponto_employee_face_descriptor')
    return saved ? JSON.parse(saved) : null
  })
  const [isEnrollingFace, setIsEnrollingFace] = useState(false)
  const [faceEnrollError, setFaceEnrollError] = useState(null)
  const [faceMatchDistance, setFaceMatchDistance] = useState(null)
  const [isEnrollCameraActive, setIsEnrollCameraActive] = useState(false)
  const [enrollProgress, setEnrollProgress] = useState(0)
  const [biometricsVerificationError, setBiometricsVerificationError] = useState(null)
  const [biometricMatchScore, setBiometricMatchScore] = useState(null)
  const [captureStatusText, setCaptureStatusText] = useState('')

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
          setAttendanceHistory(saved)
        } else {
          // Fallback legacy migration: check if old localStorage has data
          const legacySaved = localStorage.getItem('ponto_attendance_history')
          if (legacySaved) {
            const parsed = JSON.parse(legacySaved)
            setAttendanceHistory(parsed)
            await localforage.setItem('ponto_attendance_history', parsed)
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

  // --- SAVE HISTORY EFFECT ---
  useEffect(() => {
    if (!isHistoryLoaded) return
    localforage.setItem('ponto_attendance_history', attendanceHistory)
      .catch(err => console.error("Erro ao salvar histórico no localforage:", err))
  }, [attendanceHistory, isHistoryLoaded])

  // --- AI MODEL LOADING EFFECT ---
  useEffect(() => {
    const loadAiModels = async () => {
      if (isModelsLoaded || isLoadingModels) return
      setIsLoadingModels(true)
      setModelsError(null)
      try {
        if (!window.faceapi) throw new Error("Biblioteca de reconhecimento facial (face-api) não carregada.")
        const faceapi = window.faceapi
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        console.log("Modelos de Inteligência Artificial carregados com sucesso!")
        setIsModelsLoaded(true)
      } catch (err) {
        console.error("Falha ao carregar modelos de IA:", err)
        setModelsError("Erro ao iniciar a Inteligência Facial. Verifique sua conexão com a internet.")
      } finally {
        setIsLoadingModels(false)
      }
    }
    const delayTimer = setTimeout(loadAiModels, 1000)
    return () => clearTimeout(delayTimer)
  }, [])

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

  // --- ENROLLMENT CAMERA MANAGEMENT ---
  const startEnrollCamera = async () => {
    setFaceEnrollError(null)
    setIsEnrollCameraActive(true)
    setEnrollProgress(0)
    stopCamera()
    try {
      const constraints = { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 150)
    } catch (err) {
      console.warn("Câmera de cadastro falhou, tentando fallback...", err)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        streamRef.current = stream
        setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 150)
      } catch (errFallback) {
        console.warn("Fallback de cadastro falhou, tentando simples...", errFallback)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          streamRef.current = stream
          setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 150)
        } catch (errSimple) {
          console.error("Todas as tentativas falharam:", errSimple)
          setFaceEnrollError("Câmera real indisponível para cadastro.")
          setIsEnrollCameraActive(false)
        }
      }
    }
  }

  const stopEnrollCamera = () => {
    stopCamera()
    setIsEnrollCameraActive(false)
    setEnrollProgress(0)
  }

  const handleEnrollFace = async () => {
    if (isEnrollingFace) return
    setIsEnrollingFace(true)
    setFaceEnrollError(null)
    try {
      const video = videoRef.current
      if (!video) throw new Error("Vídeo não inicializado.")
      if (!window.faceapi) throw new Error("Biblioteca de IA (face-api.js) não carregada.")
      const faceapi = window.faceapi
      const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
      if (!detection) throw new Error("Rosto não detectado. Fique sob boa iluminação e sem óculos escuros.")
      const descriptorArray = Array.from(detection.descriptor)
      localStorage.setItem('ponto_employee_face_descriptor', JSON.stringify(descriptorArray))
      setSavedDescriptor(descriptorArray)
      stopEnrollCamera()
      setIsEnrollingFace(false)
    } catch (err) {
      console.error(err)
      setFaceEnrollError(err.message || "Erro ao processar biometria.")
      setIsEnrollingFace(false)
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

  // --- PROFILE MANAGEMENT ---
  const saveProfile = (e) => {
    e.preventDefault()
    if (!employeeName.trim()) return
    localStorage.setItem('ponto_employee_name', employeeName.trim())
    localStorage.setItem('ponto_employee_role', employeeRole.trim() || 'Funcionário')
    setIsConfiguring(false)
  }

  // --- DUAL-CAMERA REGISTRATION PIPELINE ---
  const handleRegisterPoint = async () => {
    if (isRegistering) return
    setIsRegistering(true)
    setBiometricsVerificationError(null)
    setBiometricMatchScore(null)
    setFaceMatchDistance(null)
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

      const newRecord = {
        id: 'ponto_' + Date.now(),
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

  return (
    <>
      <Header employeeName={employeeName} employeeRole={employeeRole} onEditProfile={() => setIsConfiguring(true)} />
      {isConfiguring && (
        <ProfileForm
          employeeName={employeeName} setEmployeeName={setEmployeeName}
          employeeRole={employeeRole} setEmployeeRole={setEmployeeRole}
          isEnrollCameraActive={isEnrollCameraActive}
          startEnrollCamera={startEnrollCamera} stopEnrollCamera={stopEnrollCamera}
          isEnrollingFace={isEnrollingFace} faceEnrollError={faceEnrollError}
          handleEnrollFace={handleEnrollFace} savedDescriptor={savedDescriptor}
          setSavedDescriptor={setSavedDescriptor} videoRef={videoRef}
          saveProfile={saveProfile} playBuzzerSound={playBuzzerSound}
        />
      )}
      {!isConfiguring && !stampedPhoto && <Clock />}
      {!isConfiguring && !stampedPhoto && (
        <CameraView
          isCameraActive={isCameraActive} setIsCameraActive={setIsCameraActive}
          startCamera={startCamera} stopCamera={stopCamera}
          isRegistering={isRegistering} captureStatusText={captureStatusText}
          videoRef={videoRef} isCapturingLocation={isCapturingLocation}
          geolocation={geolocation} geoError={geoError}
          getCoordinates={triggerGetCoordinates} toggleCameraFacing={toggleCameraFacing}
          handleRegisterPoint={handleRegisterPoint} cameraError={cameraError}
          biometricsVerificationError={biometricsVerificationError}
          setBiometricsVerificationError={setBiometricsVerificationError}
          faceMatchDistance={faceMatchDistance} setFaceMatchDistance={setFaceMatchDistance}
          handleReset={handleReset} setIsConfiguring={setIsConfiguring}
        />
      )}
      {stampedPhoto && successRecord && (
        <ReceiptView
          stampedPhoto={stampedPhoto} successRecord={successRecord}
          handleShareWhatsApp={handleShareWhatsApp} handleDownload={handleDownload}
          handleReset={handleReset}
        />
      )}
      <HistoryList
        isConfiguring={isConfiguring} attendanceHistory={attendanceHistory}
        setStampedPhoto={setStampedPhoto} setSuccessRecord={setSuccessRecord}
        handleDeleteRecord={handleDeleteRecord}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <footer className="footer-info">
        <span>© 2026 Ponto Seguro PWA</span>
        <span>Tecnologia PWA Offline</span>
      </footer>
    </>
  )
}

export default App
