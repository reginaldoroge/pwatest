import { 
  Shield, 
  Check, 
  Volume2 
} from 'lucide-react'

export default function ProfileForm({
  employeeName,
  setEmployeeName,
  employeeRole,
  setEmployeeRole,
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
        Configure suas informações de funcionário e salve seu perfil para ter acesso ao registro de ponto eletrônico com geolocalização e buzzer sonoro offline.
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
          />
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
          disabled={!employeeName.trim()}
        >
          <Check size={18} /> Salvar e Continuar
        </button>
      </form>
    </div>
  )
}
