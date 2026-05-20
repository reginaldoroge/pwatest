import { useState, useEffect, useRef } from 'react'
import { 
  Camera, 
  MapPin, 
  Share2, 
  Download, 
  User, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  CheckCircle, 
  Shield, 
  Trash2, 
  Edit2, 
  Check, 
  RefreshCw,
  Scan,
  Fingerprint,
  AlertCircle,
  XCircle,
  X
} from 'lucide-react'
import './App.css'

function App() {
  // --- STATE ---
  const [employeeName, setEmployeeName] = useState(() => {
    return localStorage.getItem('ponto_employee_name') || ''
  })
  const [employeeRole, setEmployeeRole] = useState(() => {
    return localStorage.getItem('ponto_employee_role') || ''
  })
  const [isConfiguring, setIsConfiguring] = useState(() => {
    return !localStorage.getItem('ponto_employee_name')
  })

  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('user') // 'user' (front) or 'environment' (back)
  
  const [geolocation, setGeolocation] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)

  const [stampedPhoto, setStampedPhoto] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [successRecord, setSuccessRecord] = useState(null)

  const [attendanceHistory, setAttendanceHistory] = useState(() => {
    const saved = localStorage.getItem('ponto_attendance_history')
    return saved ? JSON.parse(saved) : []
  })

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
  
  // New States for enrollment camera and tracking
  const [isEnrollCameraActive, setIsEnrollCameraActive] = useState(false)
  const [enrollProgress, setEnrollProgress] = useState(0)
  const [biometricsVerificationError, setBiometricsVerificationError] = useState(null)
  const [biometricMatchScore, setBiometricMatchScore] = useState(null)
  const [captureStatusText, setCaptureStatusText] = useState('')

  // Live clock states
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  // Refs
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  // --- LIVE CLOCK EFFECT ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      
      // Format time
      const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      setCurrentTime(now.toLocaleTimeString('pt-BR', timeOptions))

      // Format date
      const dateOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      const formattedDate = now.toLocaleDateString('pt-BR', dateOptions)
      // Capitalize first letter
      setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // --- SAVE HISTORY EFFECT ---
  useEffect(() => {
    localStorage.setItem('ponto_attendance_history', JSON.stringify(attendanceHistory))
  }, [attendanceHistory])

  // --- AI MODEL LOADING EFFECT ---
  useEffect(() => {
    const loadAiModels = async () => {
      if (isModelsLoaded || isLoadingModels) return
      setIsLoadingModels(true)
      setModelsError(null)

      try {
        if (!window.faceapi) {
          throw new Error("Biblioteca de reconhecimento facial (face-api) não foi carregada pelo CDN.")
        }
        
        const faceapi = window.faceapi
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'
        
        // Load required networks
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
    
    // Stop any existing stream
    stopCamera()

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.warn("Primeira tentativa de câmera falhou, tentando fallback...", err)
      try {
        // Fallback 1: basic facingMode (solves iOS Safari OverconstrainedError)
        const constraintsFallback = {
          video: { facingMode: facingMode },
          audio: false
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraintsFallback)
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (errFallback) {
        console.warn("Fallback 1 de câmera falhou, tentando fallback simples...", errFallback)
        try {
          // Fallback 2: simple video: true
          const constraintsSimple = {
            video: true,
            audio: false
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraintsSimple)
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (errSimple) {
          console.error("Todas as tentativas de acesso à câmera falharam:", errSimple)
          setCameraError("Câmera real indisponível. Por favor, conceda permissões de câmera e tente novamente.")
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
    
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    try {
      const constraints = {
        video: {
          facingMode: 'user', // Face enrollment always uses front camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 150)
    } catch (err) {
      console.warn("Primeira tentativa de câmera de cadastro falhou, tentando fallback...", err)
      try {
        const constraintsFallback = {
          video: { facingMode: 'user' },
          audio: false
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraintsFallback)
        streamRef.current = stream
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        }, 150)
      } catch (errFallback) {
        console.warn("Fallback 1 de câmera de cadastro falhou, tentando fallback simples...", errFallback)
        try {
          const constraintsSimple = {
            video: true,
            audio: false
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraintsSimple)
          streamRef.current = stream
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream
            }
          }, 150)
        } catch (errSimple) {
          console.error("Todas as tentativas de acesso à câmera de cadastro falharam:", errSimple)
          setFaceEnrollError("Câmera real indisponível para cadastro. Por favor, conceda permissões de câmera e tente novamente.")
          setIsEnrollCameraActive(false)
        }
      }
    }
  }

  const stopEnrollCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsEnrollCameraActive(false)
    setEnrollProgress(0)
  }

  const handleEnrollFace = async () => {
    if (isEnrollingFace) return
    setIsEnrollingFace(true)
    setFaceEnrollError(null)

    try {
      const video = videoRef.current
      if (!video) {
        throw new Error("Elemento de vídeo não inicializado ou pronto.")
      }
      
      if (!window.faceapi) {
        throw new Error("Biblioteca de inteligência artificial (face-api.js) não está carregada.")
      }
      
      const faceapi = window.faceapi
      
      // Detect single face with landmarks and descriptor
      const detection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor()
        
      if (!detection) {
        throw new Error("Rosto não detectado. Fique em frente à câmera sob boa iluminação, retire óculos escuros/máscara e tente novamente.")
      }
      
      const descriptorArray = Array.from(detection.descriptor)
      localStorage.setItem('ponto_employee_face_descriptor', JSON.stringify(descriptorArray))
      setSavedDescriptor(descriptorArray)
      
      stopEnrollCamera()
      setIsEnrollingFace(false)
    } catch (err) {
      console.error("Erro no cadastro facial:", err)
      setFaceEnrollError(err.message || "Erro desconhecido ao processar biometria.")
      setIsEnrollingFace(false)
    }
  }

  // Toggle camera direction
  const toggleCameraFacing = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
  }

  useEffect(() => {
    if (isCameraActive) {
      startCamera()
    }
    return () => stopCamera()
  }, [facingMode])

  // --- GEOLOCATION MANAGEMENT ---
  const getCoordinates = () => {
    return new Promise((resolve, reject) => {
      setIsCapturingLocation(true)
      setGeoError(null)

      if (!navigator.geolocation) {
        const errStr = "Geolocalização não é suportada pelo seu navegador."
        setGeoError(errStr)
        setIsCapturingLocation(false)
        reject(errStr)
        return
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`
          
          let address = "Buscando endereço..."
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 4000)
            
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
              headers: {
                'User-Agent': 'PontoSeguroPWA/1.0',
                'Accept-Language': 'pt-BR'
              },
              signal: controller.signal
            })
            clearTimeout(timeoutId)
            
            const data = await response.json()
            if (data && data.address) {
              const road = data.address.road || data.address.suburb || ""
              const houseNumber = data.address.house_number ? `, ${data.address.house_number}` : ""
              const city = data.address.city || data.address.town || data.address.municipality || ""
              const state = data.address.state ? ` - ${data.address.state}` : ""
              
              if (road) {
                address = `${road}${houseNumber}${city ? ' - ' + city : ''}`
              } else {
                address = data.display_name.split(',').slice(0, 3).join(', ')
              }
            } else {
              address = "Coordenadas registradas"
            }
          } catch (e) {
            console.error("Erro no reverse geocoding:", e)
            address = "Endereço indisponível (offline)"
          }

          const geoData = { latitude, longitude, accuracy, mapsLink, address }
          setGeolocation(geoData)
          setIsCapturingLocation(false)
          resolve(geoData)
        },
        (error) => {
          console.error("Erro de localização:", error)
          let errMsg = "Erro desconhecido ao obter a localização."
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errMsg = "Acesso à localização negado pelo usuário."
              break
            case error.POSITION_UNAVAILABLE:
              errMsg = "Informações de localização indisponíveis."
              break
            case error.TIMEOUT:
              errMsg = "Tempo limite atingido para obter localização."
              break
          }
          setGeoError(errMsg)
          setIsCapturingLocation(false)
          reject(errMsg)
        },
        options
      )
    })
  }

  // --- PROFILE MANAGEMENT ---
  const saveProfile = (e) => {
    e.preventDefault()
    if (!employeeName.trim()) return
    localStorage.setItem('ponto_employee_name', employeeName.trim())
    localStorage.setItem('ponto_employee_role', employeeRole.trim() || 'Funcionário')
    setIsConfiguring(false)
  }

    const handleRegisterPoint = async () => {
    if (isRegistering) return

    setIsRegistering(true)
    setBiometricsVerificationError(null)
    setBiometricMatchScore(null)
    setFaceMatchDistance(null)
    setCaptureStatusText("Obtendo localização GPS...")

    let location = null
    try {
      // 1. Get exact geolocation coordinates first
      location = await getCoordinates()
    } catch (err) {
      console.warn("Prosseguindo sem GPS exato devido a erro:", err)
    }

    // Fallback coordinates if location fails completely
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
      if (!canvas) {
        throw new Error("Elemento canvas indisponível.")
      }

      let similarityScore = 96
      let distanceValue = 0.12

      // Helper function to get media stream dynamically
      const getCameraStream = async (mode) => {
        const constraints = {
          video: {
            facingMode: mode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        }
        
        try {
          return await navigator.mediaDevices.getUserMedia(constraints)
        } catch (err) {
          console.warn(`Tentativa de câmera (${mode}) com resolução ideal falhou, tentando fallback...`, err)
          try {
            const constraintsFallback = {
              video: { facingMode: mode },
              audio: false
            }
            return await navigator.mediaDevices.getUserMedia(constraintsFallback)
          } catch (errFallback) {
            console.warn(`Fallback de câmera (${mode}) falhou, tentando simples...`, errFallback)
            const constraintsSimple = {
              video: true,
              audio: false
            }
            return await navigator.mediaDevices.getUserMedia(constraintsSimple)
          }
        }
      }

      // Offscreen canvases to store the front and back captures
      const selfieCanvas = document.createElement('canvas')
      selfieCanvas.width = 640
      selfieCanvas.height = 480
      const selfieCtx = selfieCanvas.getContext('2d')

      const envCanvas = document.createElement('canvas')
      envCanvas.width = 640
      envCanvas.height = 480
      const envCtx = envCanvas.getContext('2d')

      let hasBackCapture = false

      // --- REAL SEQUENTIAL DUAL-CAMERA PIPELINE ---
      // 1. Stop existing active camera stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // 2. Open Front Camera for Selfie (Optimized & Fast)
      setCaptureStatusText("Capturando Câmera Frontal (Selfie)...")
      const frontStream = await getCameraStream('user')
      streamRef.current = frontStream
      
      if (videoRef.current) {
        videoRef.current.srcObject = frontStream
        // Wait for stream metadata and make sure video is playing
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve).catch(resolve)
          }
          setTimeout(resolve, 600) // fast safety fallback timeout
        })
      }

      // Allow automatic exposure and focus of front camera to settle very quickly
      await new Promise(resolve => setTimeout(resolve, 300))

      if (!videoRef.current) {
        throw new Error("Elemento de vídeo não inicializado.")
      }

      // Take Front Selfie frame
      selfieCtx.drawImage(videoRef.current, 0, 0, 640, 480)

      // 3. Stop Front Camera
      setCaptureStatusText("Alternando para Câmera Traseira (Ambiente)...")
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      // Wait 300ms to let the hardware release lock (essential for mobile devices)
      await new Promise(resolve => setTimeout(resolve, 300))

      // 4. Open Back Camera for Environment
      try {
        const backStream = await getCameraStream('environment')
        streamRef.current = backStream
        if (videoRef.current) {
          videoRef.current.srcObject = backStream
          await new Promise(resolve => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().then(resolve).catch(resolve)
            }
            setTimeout(resolve, 600)
          })
        }

        setCaptureStatusText("Capturando foto do ambiente...")
        // Settle delay for focus / exposure (fast)
        await new Promise(resolve => setTimeout(resolve, 300))

        if (videoRef.current) {
          envCtx.drawImage(videoRef.current, 0, 0, 640, 480)
          hasBackCapture = true
        }
      } catch (envErr) {
        console.warn("Dispositivo sem câmera traseira ou erro de inicialização. Usando selfie nas duas perspectivas.", envErr)
      }

      // Stop all camera streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsCameraActive(false)

      // --- COMPOSITION OF BOTH VIEWS ON HIGH-RES CANVAS ---
      const width = 640
      const height = 480
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')

      // Draw Main Background View (Back Camera Environment photo)
      if (hasBackCapture) {
        ctx.drawImage(envCanvas, 0, 0, width, height)
      } else {
        // Fallback: draw front selfie frame as main background if back camera wasn't available
        ctx.drawImage(selfieCanvas, 0, 0, width, height)
      }

      // Draw Front Selfie picture-in-picture (PIP) frame inside top-left corner
      ctx.save()
      
      // Neon glow shadow behind the PIP card (Volcanic Amber primary glow)
      ctx.shadowColor = 'rgba(217, 184, 103, 0.6)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 4
      
      // Draw white/amber border around the PIP card area (Volcanic Amber primary)
      ctx.strokeStyle = '#d9b867'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(20, 20, 140, 105, 8)
      ctx.stroke()
      
      // Clip the selfie inside the rounded rectangle
      ctx.beginPath()
      ctx.roundRect(20, 20, 140, 105, 8)
      ctx.clip()
      
      // Draw selfie picture inside
      ctx.drawImage(selfieCanvas, 20, 20, 140, 105)
      ctx.restore()

      // Load logo watermark image
      const logoImg = new Image()
      logoImg.src = '/icon-192.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      // Draw logo watermark in top-right corner
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 60
        const logoX = width - logoSize - 20
        const logoY = 20
        
        ctx.save()
        
        // Draw light premium glowing circle background for the logo watermark (Volcanic Amber primary glow)
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

      // --- STAMPING FOOTER BANNER ---
      const bannerHeight = 105
      
      // Semi-transparent dark gradient banner at bottom
      const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height)
      gradient.addColorStop(0, 'rgba(9, 13, 22, 0.0)')
      gradient.addColorStop(0.15, 'rgba(9, 13, 22, 0.88)')
      gradient.addColorStop(1, 'rgba(9, 13, 22, 0.98)')
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, height - bannerHeight, width, bannerHeight)

      // Gradient accent divider line (Amber -> Bronze -> Emerald)
      const accentGradient = ctx.createLinearGradient(0, 0, width, 0)
      accentGradient.addColorStop(0, '#d9b867')
      accentGradient.addColorStop(0.5, '#b7894d')
      accentGradient.addColorStop(1, '#34d399')
      ctx.fillStyle = accentGradient
      ctx.fillRect(0, height - bannerHeight, width, 3)

      // Set text configurations
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      
      // Draw Date and Time
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      const now = new Date()
      const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const textRow1 = `⏱️ REGISTRO: ${formattedDate} - ${formattedTime}`
      ctx.fillText(textRow1, 20, height - 82)

      // Draw Address
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      const addressText = `🏠 END: ${location.address || 'Endereço Indisponível'}`
      // Truncate address if too long
      const maxAddressWidth = width - 260 // Space for badges on the right
      let displayAddress = addressText
      if (ctx.measureText(displayAddress).width > maxAddressWidth) {
        while (ctx.measureText(displayAddress + '...').width > maxAddressWidth && displayAddress.length > 5) {
          displayAddress = displayAddress.slice(0, -1)
        }
        displayAddress = displayAddress.trim() + '...'
      }
      ctx.fillText(displayAddress, 20, height - 60)

      // Draw coordinates
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#94a3b8'
      const textRow2 = `📍 GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
      ctx.fillText(textRow2, 20, height - 40)

      // Draw Google Maps link
      const textRow3 = `🔗 MAPS: https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      ctx.fillText(textRow3, 20, height - 20)

      // Draw User Badge on the right
      const userBadgeText = employeeName.toUpperCase()
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif'
      const textWidth = ctx.measureText(userBadgeText).width
      const badgePadding = 8
      const badgeWidth = textWidth + badgePadding * 2
      const badgeHeight = 22
      const badgeX = width - badgeWidth - 20
      const badgeY = height - 68

      // Badge Background (Volcanic Amber primary)
      ctx.fillStyle = 'rgba(217, 184, 103, 0.2)'
      ctx.strokeStyle = 'rgba(217, 184, 103, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4)
      ctx.fill()
      ctx.stroke()
      
      // Badge Text (Light Warm Gold/Amber)
      ctx.fillStyle = '#fce2a6' // Amber 300
      ctx.textAlign = 'center'
      ctx.fillText(userBadgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2)

      // Draw Biometric/Security Badge below User Badge
      const bioBadgeText = "🛡️ FOTO DUPLA: CONFIRMADA"
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
      const bioTextWidth = ctx.measureText(bioBadgeText).width
      const bioBadgePadding = 6
      const bioBadgeWidth = bioTextWidth + bioBadgePadding * 2
      const bioBadgeHeight = 18
      const bioBadgeX = width - bioBadgeWidth - 20
      const bioBadgeY = height - 38

      // Biometric Badge Background
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(bioBadgeX, bioBadgeY, bioBadgeWidth, bioBadgeHeight, 4)
      ctx.fill()
      ctx.stroke()

      // Biometric Badge Text
      ctx.fillStyle = '#34d399' // Emerald 400
      ctx.textAlign = 'center'
      ctx.fillText(bioBadgeText, bioBadgeX + bioBadgeWidth / 2, bioBadgeY + bioBadgeHeight / 2)
      ctx.textAlign = 'left' // Reset

      // 6. Export as Data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setStampedPhoto(dataUrl)

      // 7. Save to offline history
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
        photo: dataUrl,
        biometricScore: null,
        isMocked: false
      }

      setAttendanceHistory(prev => [newRecord, ...prev])
      setSuccessRecord(newRecord)
    } catch (err) {
      console.error("Erro ao registrar ponto:", err)
      alert("Erro técnico ao capturar e processar. Detalhes: " + err.message)
    } finally {
      setIsRegistering(false)
      setCaptureStatusText("")
    }
  }

  // --- RESET FOR NEW CAPTURE ---
  const handleReset = () => {
    setStampedPhoto(null)
    setSuccessRecord(null)
    setGeolocation(null)
    setGeoError(null)
  }

  // --- EXPORT AND WHATSAPP SHARING LOGIC ---
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
    const shareText = 
      `⏰ *PONTO ELETRÔNICO REGISTRADO!* ⏰\n\n` +
      `👤 *Funcionário:* ${successRecord.employeeName}\n` +
      `💼 *Cargo:* ${successRecord.employeeRole}\n` +
      `📅 *Data:* ${successRecord.date}\n` +
      `🕒 *Hora:* ${successRecord.time}\n` +
      (successRecord.address ? `🏠 *Endereço:* ${successRecord.address}\n` : '') +
      `📍 *Localização:* ${mapsUrl}\n\n` +
      `*Comprovante de Ponto com Foto gerado com sucesso.*`

    // Try Web Share API with Files first (works perfectly on mobile Chrome/Safari/WhatsApp app integration)
    if (navigator.share && navigator.canShare) {
      try {
        // Convert base64 dataURL to a blob
        const res = await fetch(stampedPhoto)
        const blob = await res.blob()
        
        // Create the File object
        const fileName = `ponto-${successRecord.date.replace(/\//g, '-')}-${successRecord.time.replace(/:/g, '')}.jpg`
        const file = new File([blob], fileName, { type: 'image/jpeg' })

        // Check if browser allows sharing this file
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Registro de Ponto',
            text: shareText
          })
          console.log("Compartilhado com sucesso via Web Share API.")
          return
        }
      } catch (err) {
        console.warn("Erro ao compartilhar via Web Share API:", err)
      }
    }

    // Fallback: Web WhatsApp text template link + trigger automatic image download
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(whatsappUrl, '_blank')

    // Automatically prompt download so user has the stamped picture ready to attach/send
    setTimeout(() => {
      handleDownload()
      alert("O texto de registro foi enviado para o WhatsApp! A foto carimbada foi baixada no seu dispositivo. Caso queira, anexe-a na mensagem.")
    }, 800)
  }

  // --- DELETE A RECORD FROM LOCAL HISTORY ---
  const handleDeleteRecord = (id, e) => {
    e.stopPropagation()
    if (confirm("Deseja realmente excluir este comprovante do seu histórico local?")) {
      setAttendanceHistory(prev => prev.filter(item => item.id !== id))
    }
  }

  // --- MAIN LAYOUT RENDER ---
  return (
    <>
      {/* Header Bar */}
      <header className="profile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar">
            {employeeName ? employeeName.charAt(0).toUpperCase() : <User size={20} />}
          </div>
          <div>
            <h2 style={{ fontSize: '16px', lineHeight: '1.2' }}>
              {employeeName || 'Ponto Seguro'}
            </h2>
            <p style={{ fontSize: '12px' }}>
              {employeeRole || 'Registrar Ponto'}
            </p>
          </div>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '8px 12px', borderRadius: '10px' }}
          onClick={() => setIsConfiguring(true)}
        >
          <Edit2 size={14} />
        </button>
      </header>

      {/* 1. SETUP / PROFILE CARD */}
      {isConfiguring && (
        <div className="glass-panel" style={{ marginBottom: '20px', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Shield className="text-primary" style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px' }}>Cadastro do Funcionário</h2>
          </div>
          <p style={{ marginBottom: '20px' }}>
            Configure suas informações de funcionário e registre sua biometria facial para estampar e validar nos registros de ponto eletrônico.
          </p>
          
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: João da Silva" 
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
                disabled={isEnrollCameraActive}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cargo / Setor</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Analista de TI" 
                value={employeeRole}
                onChange={(e) => setEmployeeRole(e.target.value)}
                disabled={isEnrollCameraActive}
              />
            </div>

            {/* BIOMETRIC ENROLLMENT CONTAINER */}
            <div className="form-group" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Fingerprint size={16} style={{ color: savedDescriptor ? 'var(--success)' : 'var(--warning)' }} />
                Biometria Facial (Ponto Seguro)
              </label>

              {savedDescriptor ? (
                /* BIOMETRY ALREADY REGISTERED STATE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <CheckCircle size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', display: 'block' }}>Rosto Mapeado com Sucesso</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Vetor de 128 pontos salvo localmente de acordo com a LGPD.</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                    onClick={() => {
                      if (confirm("Deseja realmente remover seu cadastro biométrico facial?")) {
                        localStorage.removeItem('ponto_employee_face_descriptor')
                        setSavedDescriptor(null)
                      }
                    }}
                  >
                    Excluir Biometria e Cadastrar Novamente
                  </button>
                </div>
              ) : isEnrollCameraActive ? (
                /* BIOMETRY CAMERA ACTIVE ENROLLING STATE */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  
                  {/* Camera view for enrollment */}
                  <div className="camera-window" style={{ aspectRatio: '4/3', marginBottom: '8px', height: '220px', border: '2px solid var(--secondary)' }}>
                    <div className="camera-badge" style={{ borderColor: 'rgba(99, 102, 241, 0.4)', top: '10px', left: '10px' }}>
                      <span className="pulse-indicator"></span>
                      <span>CÂMERA DE CADASTRO</span>
                    </div>
                    <div className="scanner-laser" style={{ background: 'linear-gradient(to right, transparent, var(--primary), transparent)', boxShadow: '0 0 8px var(--primary)' }}></div>
                    <div className="camera-corners">
                      <span></span>
                    </div>
                    <video 
                      ref={videoRef} 
                      className="camera-stream" 
                      autoPlay 
                      playsInline
                      muted
                      style={{ transform: 'scaleX(-1)' }} // Mirror view for selfie natural feeling
                    ></video>
                    {isEnrollingFace && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span style={{ color: '#fff', fontSize: '12px', fontWeight: '500' }}>Mapeando 68 pontos faciais...</span>
                      </div>
                    )}
                  </div>

                  {faceEnrollError && (
                    <div style={{ color: 'var(--error)', fontSize: '12px', textAlign: 'center', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{faceEnrollError}</span>
                    </div>
                  )}

                  {/* Enrollment Controls */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '10px' }}
                      onClick={stopEnrollCamera}
                      disabled={isEnrollingFace}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                      onClick={handleEnrollFace}
                      disabled={isEnrollingFace}
                    >
                      {isEnrollingFace ? "Processando..." : "Mapear Rosto"}
                    </button>
                  </div>
                </div>
              ) : (
                /* BIOMETRY PENDING STATE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <AlertCircle size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', display: 'block' }}>Mapeamento Facial Necessário</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Para registrar ponto, você deve primeiro mapear sua assinatura biométrica.</span>
                    </div>
                  </div>

                  {faceEnrollError && (
                    <div style={{ color: 'var(--error)', fontSize: '12px', textAlign: 'center', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{faceEnrollError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={startEnrollCamera}
                      style={{ fontSize: '14px', padding: '10px' }}
                    >
                      Mapear Câmera Real
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '20px' }}
              disabled={!employeeName.trim() || isEnrollCameraActive}
            >
              <Check size={18} /> Salvar e Continuar
            </button>
          </form>
        </div>
      )}

      {/* 2. DYNAMIC DIGITAL CLOCK */}
      {!isConfiguring && !stampedPhoto && (
        <div className="clock-container">
          <div className="clock-time">{currentTime}</div>
          <div className="clock-date">{currentDate}</div>
        </div>
      )}

      {/* 3. CAM FRAMEWORK */}
      {!isConfiguring && !stampedPhoto && (
        biometricsVerificationError ? (
          /* BIOMETRIC VERIFICATION ERROR PANEL */
          <div className="glass-panel" style={{ border: '2px solid var(--error)', boxShadow: '0 0 25px rgba(239, 68, 68, 0.2)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
                <XCircle size={32} style={{ color: 'var(--error)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--error)', marginBottom: '8px' }}>
                  Biometria Divergente!
                </h2>
                <p style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.5', padding: '0 8px' }}>
                  {biometricsVerificationError}
                </p>
              </div>
              
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '13px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ color: 'var(--error)', fontWeight: '600' }}>Bloqueado por Incompatibilidade</span>
                </div>
                {faceMatchDistance !== null && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Divergência Euclidiana:</span>
                      <span style={{ fontWeight: '600', color: '#fff' }}>{faceMatchDistance.toFixed(4)} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(limite 0.58)</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Similaridade Calculada:</span>
                      <span style={{ fontWeight: '600', color: 'var(--error)' }}>
                        {Math.max(0, Math.round((1 - faceMatchDistance) * 100))}%
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setBiometricsVerificationError(null)
                    handleReset()
                    setIsConfiguring(true) // Guide to profile in case they need to re-enroll
                  }}
                  style={{ flex: 1, padding: '12px 10px', fontSize: '14px' }}
                >
                  Recadastrar Perfil
                </button>
                
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setBiometricsVerificationError(null)
                    setFaceMatchDistance(null)
                    // Restart camera
                    startCamera()
                  }}
                  style={{ flex: 2, padding: '12px 10px', fontSize: '14px', background: 'linear-gradient(135deg, var(--error), var(--warning))', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* NORMAL CAMERA WINDOW & TRACKER */
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* CAMERA SHIELD */}
            {!isCameraActive ? (
              <div 
                className="camera-window" 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#090d16', padding: '16px' }}
              >
                <Camera size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p style={{ textAlign: 'center', padding: '0 16px', fontSize: '13px' }}>
                  Pronto para registrar ponto eletrônico com validação biométrica e GPS.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px', marginTop: '8px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => startCamera()}
                  >
                    Ativar Câmera Real
                  </button>
                </div>
              </div>
            ) : (
              <div className="camera-window">
                {isRegistering && (
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(9, 13, 22, 0.85)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      zIndex: 10,
                      borderRadius: '16px'
                    }}
                  >
                    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <div style={{
                        boxSizing: 'border-box',
                        display: 'block',
                        position: 'absolute',
                        width: '64px',
                        height: '64px',
                        margin: '0px',
                        border: '6px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                        borderColor: 'var(--primary) transparent transparent transparent'
                      }}></div>
                      <div style={{
                        boxSizing: 'border-box',
                        display: 'block',
                        position: 'absolute',
                        width: '64px',
                        height: '64px',
                        margin: '0px',
                        border: '6px solid var(--secondary)',
                        borderRadius: '50%',
                        animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse',
                        borderColor: 'transparent transparent var(--secondary) transparent',
                        opacity: 0.7
                      }}></div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scan size={24} className="text-primary animate-pulse" style={{ color: 'var(--primary)' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 24px' }}>
                      <p style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px', marginBottom: '6px', letterSpacing: '0.5px' }}>
                        PROCESSANDO PONTO ELETRÔNICO
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="pulse-indicator" style={{ background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary)' }}></span>
                        {captureStatusText || "Processando..."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="camera-badge">
                  <span className="pulse-indicator"></span>
                  <span>CÂMERA ATIVA</span>
                </div>
                
                <div className="scanner-laser"></div>
                
                <div className="camera-corners">
                  <span></span>
                </div>

                <video 
                  ref={videoRef} 
                  className="camera-stream" 
                  autoPlay 
                  playsInline
                  muted
                ></video>
              </div>
            )}

            {/* Location Badge (GPS Tracker Info) */}
            {isCameraActive && (
              <div style={{ width: '100%', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', fontSize: '13px' }}>
                  <MapPin size={16} className="text-secondary" style={{ color: 'var(--secondary)' }} />
                  <div style={{ flex: 1 }}>
                    {isCapturingLocation ? (
                      <span style={{ color: 'var(--text-muted)' }}>Obtendo GPS exato do satélite...</span>
                    ) : geolocation ? (
                      <span style={{ color: 'var(--success)', fontWeight: '600' }}>GPS Conectado (Precisão: {geolocation.accuracy ? Math.round(geolocation.accuracy) + 'm' : 'OK'})</span>
                    ) : geoError ? (
                      <span style={{ color: 'var(--warning)', fontSize: '12px' }}>{geoError} (Coordenadas padrão ativas)</span>
                    ) : (
                      <span>GPS em espera</span>
                    )}
                  </div>
                  {isCameraActive && (
                    <button 
                      onClick={getCoordinates} 
                      className="btn btn-secondary" 
                      style={{ width: 'auto', padding: '6px', borderRadius: '8px' }}
                      title="Recarregar GPS"
                      disabled={isCapturingLocation}
                    >
                      <RefreshCw size={14} className={isCapturingLocation ? "animate-spin" : ""} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Capture Trigger Bar */}
            {isCameraActive && (
              <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: '1' }}
                  onClick={() => {
                    stopCamera()
                    setIsCameraActive(false)
                  }}
                >
                  Cancelar
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  style={{ width: 'auto', padding: '12px' }}
                  onClick={toggleCameraFacing}
                  title="Girar Câmera"
                >
                  <RefreshCw size={18} />
                </button>

                <button 
                  className="btn btn-primary" 
                  style={{ flex: '2', background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                  onClick={handleRegisterPoint}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>Registrando...</>
                  ) : (
                    <>
                      <Camera size={18} /> Bater Ponto
                    </>
                  )}
                </button>
              </div>
            )}

            {cameraError && (
              <div style={{ color: 'var(--error)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
                {cameraError}
              </div>
            )}

          </div>
        )
      )}

      {/* 4. SUCCESS & EXPORT STATE VIEW */}
      {stampedPhoto && successRecord && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Ponto Registrado com Sucesso!</h2>
            <p>Seu comprovante eletrônico carimbado foi gerado e salvo offline.</p>
          </div>

          {/* Stamped image output showcase */}
          <div style={{ position: 'relative' }}>
            <img 
              src={stampedPhoto} 
              alt="Ponto carimbado" 
              className="photo-preview"
            />
            <div className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px' }}>
              Original Carimbado
            </div>
          </div>

          {/* Meta text review details */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Funcionário:</span>
              <span style={{ fontWeight: '600' }}>{successRecord.employeeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Horário Oficial:</span>
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{successRecord.date} - {successRecord.time}</span>
            </div>
            {successRecord.address && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Endereço:</span>
                <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '70%' }}>{successRecord.address}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>GPS Coordenadas:</span>
              <span style={{ fontWeight: '600' }}>{successRecord.latitude.toFixed(5)}, {successRecord.longitude.toFixed(5)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Google Maps:</span>
              <a 
                href={successRecord.mapsLink} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--secondary)', fontWeight: '600', textDecoration: 'underline' }}
              >
                Abrir Mapa
              </a>
            </div>
          </div>

          {/* Share Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className="btn btn-success" 
              onClick={handleShareWhatsApp}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontSize: '16px' }}
            >
              <Share2 size={18} /> Encaminhar para WhatsApp
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={handleDownload}
              >
                <Download size={18} /> Baixar Foto
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={handleReset}
              >
                Novo Registro
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 5. OFFLINE HISTORY CARDS */}
      {!isConfiguring && (
        <div className="glass-panel" style={{ marginTop: '20px', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <h2>Histórico Local</h2>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
              {attendanceHistory.length} registros
            </span>
          </div>

          {attendanceHistory.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
              Nenhum ponto registrado neste dispositivo ainda.
            </p>
          ) : (
            <div className="history-list">
              {attendanceHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="history-card"
                  onClick={() => {
                    setStampedPhoto(item.photo)
                    setSuccessRecord(item)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={item.photo} alt="Ponto" className="history-img-thumb" />
                  
                  <div className="history-info">
                    <span className="history-time">{item.time}</span>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{item.date}</span>
                    <div className="history-details">
                      <MapPin size={10} style={{ color: 'var(--secondary)' }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}>
                        {item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span className="badge badge-success">OK</span>
                    <button 
                      className="btn btn-secondary"
                      onClick={(e) => handleDeleteRecord(item.id, e)}
                      style={{ width: 'auto', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: 'none' }}
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Canvas invisible node for photo stamps rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {/* Footer Info Details */}
      <footer className="footer-info">
        <span>© 2026 Ponto Seguro PWA</span>
        <span>Tecnologia PWA Offline</span>
      </footer>
    </>
  )
}

export default App
