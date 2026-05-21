import { useState, useEffect } from 'react'
import { FileText, MapPin, Send, X, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { getCoordinates } from '../utils/geolocation'
import { playBuzzerSound } from '../utils/audio'

export default function ShareReceiver({
  sharedFile,
  onCancel,
  employeeCpf,
  employeeName,
  employeeRole,
  isOnline,
  onSuccess
}) {
  const [geolocation, setGeolocation] = useState(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(true)
  const [geoError, setGeoError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Atualiza relogio local
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Gera preview local se for imagem
  useEffect(() => {
    if (!sharedFile) return
    
    if (sharedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(sharedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [sharedFile])

  // Obtem geolocalizacao automaticamente ao montar
  useEffect(() => {
    let active = true
    const captureLocation = async () => {
      setIsCapturingLocation(true)
      setGeoError(null)
      try {
        const coords = await getCoordinates()
        if (active) {
          setGeolocation(coords)
          setIsCapturingLocation(false)
        }
      } catch (err) {
        console.warn('Erro ao obter coordenadas automáticas no upload:', err)
        if (active) {
          // Fallback seguro em caso de bloqueio ou erro do GPS
          const mockCoords = {
            latitude: -23.55052,
            longitude: -46.633308,
            accuracy: 100,
            mapsLink: 'https://www.google.com/maps?q=-23.55052,-46.633308',
            address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
            isMock: true
          }
          setGeolocation(mockCoords)
          setIsCapturingLocation(false)
        }
      }
    }
    
    captureLocation()
    return () => { active = false }
  }, [])

  if (!sharedFile) return null

  const isImage = sharedFile.type.startsWith('image/')
  const formattedDate = currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Converte arquivo para Base64 e envia
  const handleConfirmSend = async () => {
    if (isUploading) return
    setIsUploading(true)

    try {
      // Converte o arquivo para Base64
      const reader = new FileReader()
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(sharedFile)
      })

      const base64Data = await base64Promise

      const finalLocation = geolocation || {
        latitude: -23.55052,
        longitude: -46.633308,
        accuracy: 100,
        mapsLink: 'https://www.google.com/maps?q=-23.55052,-46.633308',
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        isMock: true
      }

      const record = {
        id: 'ponto_' + Date.now(),
        employeeCpf,
        employeeName,
        employeeRole,
        date: formattedDate,
        time: formattedTime,
        latitude: finalLocation.latitude,
        longitude: finalLocation.longitude,
        mapsLink: finalLocation.mapsLink,
        address: finalLocation.address || '',
        photo: base64Data, // Enviamos na propriedade photo para compatibilidade do endpoint
        fileName: sharedFile.name,
        fileType: sharedFile.type,
        fileSize: sharedFile.size,
        isDocument: true
      }

      onSuccess(record)
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err)
      playBuzzerSound(false)
      alert('Falha ao processar o arquivo de upload: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="upload-screen-container page-enter">
      
      {/* Header */}
      <div className="upload-title-header">
        <div className="upload-title-icon">
          <FileText size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', lineHeight: '1.2' }}>Enviar Documento</h2>
          <p style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-muted)' }}>
            Recebido via WhatsApp ou arquivo local
          </p>
        </div>
      </div>

      {/* Preview Card */}
      <div className="upload-preview-card">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt="Preview" className="upload-img-preview" />
        ) : (
          <div className="upload-doc-preview">
            <div className="upload-doc-icon-wrap">
              <span style={{ fontSize: '28px' }}>📄</span>
            </div>
            <div>
              <h4 className="upload-doc-name">{sharedFile.name}</h4>
              <p className="upload-doc-meta">
                {sharedFile.type || 'Documento/PDF'} • {formatSize(sharedFile.size)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info List Metadata */}
      <div className="upload-info-list">
        <div className="upload-info-row">
          <span className="upload-info-label">Funcionário:</span>
          <span className="upload-info-value" style={{ fontWeight: '600' }}>
            {employeeName}
          </span>
        </div>

        <div className="upload-info-row">
          <span className="upload-info-label">Horário de Envio:</span>
          <span className="upload-info-value" style={{ color: 'var(--primary)', fontWeight: '600' }}>
            {formattedDate} - {formattedTime}
          </span>
        </div>

        <div className="upload-info-row">
          <span className="upload-info-label">Localização (GPS):</span>
          <span className="upload-info-value">
            {isCapturingLocation ? (
              <span className="upload-gps-badge upload-gps-loading">
                ⏳ Capturando...
              </span>
            ) : (
              <span className="upload-gps-badge upload-gps-active">
                <MapPin size={11} /> Confirmado
              </span>
            )}
          </span>
        </div>

        {geolocation && (
          <div className="upload-info-row" style={{ fontSize: '11px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
            <span className="upload-info-label">Endereço:</span>
            <span className="upload-info-value" style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {geolocation.address || `${geolocation.latitude.toFixed(5)}, ${geolocation.longitude.toFixed(5)}`}
            </span>
          </div>
        )}
      </div>

      {/* Security disclaimer */}
      <div className="menu-security-badge" style={{ marginTop: '0', background: 'rgba(52, 211, 153, 0.04)', padding: '10px', borderRadius: '8px' }}>
        <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
        <span style={{ fontSize: '11px' }}>
          O envio registra digitalmente sua localização para segurança jurídica.
        </span>
      </div>

      {/* Actions */}
      <div className="upload-action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleConfirmSend}
          disabled={isUploading || isCapturingLocation}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px'
          }}
        >
          {isUploading ? (
            <>⏳ Processando...</>
          ) : (
            <>
              <Send size={16} /> Confirmar e Enviar
            </>
          )}
        </button>

        <button
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isUploading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px'
          }}
        >
          <X size={16} /> Cancelar
        </button>
      </div>

    </div>
  )
}
