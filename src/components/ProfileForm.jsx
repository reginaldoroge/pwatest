import { 
  Shield, 
  Fingerprint, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Volume2 
} from 'lucide-react'

export default function ProfileForm({
  employeeName,
  setEmployeeName,
  employeeRole,
  setEmployeeRole,
  isEnrollCameraActive,
  startEnrollCamera,
  stopEnrollCamera,
  isEnrollingFace,
  faceEnrollError,
  handleEnrollFace,
  savedDescriptor,
  setSavedDescriptor,
  videoRef,
  saveProfile,
  playBuzzerSound
}) {
  return (
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

        {/* SOUND SETTINGS CONTAINER */}
        <div className="form-group" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 size={16} style={{ color: 'var(--primary)' }} />
            Feedback Sonoro (Buzzer)
          </label>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            O sistema emite alertas sonoros ao finalizar o registro. Teste os sons abaixo:
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => playBuzzerSound(true)}
            >
              🔊 Testar Sucesso
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => playBuzzerSound(false)}
            >
              🔊 Testar Erro
            </button>
          </div>
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
  )
}
