import { 
  Camera, 
  MapPin, 
  RefreshCw, 
  Scan, 
  XCircle 
} from 'lucide-react'

export default function CameraView({
  isCameraActive,
  setIsCameraActive,
  startCamera,
  stopCamera,
  isRegistering,
  captureStatusText,
  videoRef,
  isCapturingLocation,
  geolocation,
  geoError,
  getCoordinates,
  toggleCameraFacing,
  handleRegisterPoint,
  cameraError,
  biometricsVerificationError,
  setBiometricsVerificationError,
  faceMatchDistance,
  setFaceMatchDistance,
  handleReset,
  setIsConfiguring
}) {
  if (biometricsVerificationError) {
    /* BIOMETRIC VERIFICATION ERROR PANEL */
    return (
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
                startCamera() // Restart camera
              }}
              style={{ flex: 2, padding: '12px 10px', fontSize: '14px', background: 'linear-gradient(135deg, var(--error), var(--warning))', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* NORMAL CAMERA WINDOW & TRACKER */
  return (
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
}
