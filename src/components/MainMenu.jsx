import { Clock, CalendarDays, Fingerprint, ChevronRight, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function MainMenu({ onNavigate, employeeName, pendingCount }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  const greeting = (() => {
    const h = currentTime.getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div className="main-menu-container">
      {/* Greeting Section */}
      <div className="menu-greeting">
        <p className="greeting-text">{greeting},</p>
        <h2 className="greeting-name">{employeeName?.split(' ')[0] || 'Colaborador'} 👋</h2>
      </div>

      {/* Live Clock Widget */}
      <div className="menu-clock-widget">
        <div className="menu-clock-icon-wrapper">
          <Clock size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="menu-clock-info">
          <span className="menu-clock-time">{formattedTime}</span>
          <span className="menu-clock-date">{formattedDate}</span>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="menu-cards">
        {/* BATER PONTO */}
        <button
          className="menu-card menu-card-primary"
          onClick={() => onNavigate('ponto')}
          id="menu-btn-ponto"
        >
          <div className="menu-card-icon-wrap menu-card-icon-primary">
            <Fingerprint size={28} strokeWidth={1.8} />
          </div>
          <div className="menu-card-content">
            <span className="menu-card-title">Bater Ponto</span>
            <span className="menu-card-desc">Registrar entrada ou saída com foto e GPS</span>
          </div>
          <ChevronRight size={20} className="menu-card-arrow" />
        </button>

        {/* HISTÓRICO */}
        <button
          className="menu-card menu-card-secondary"
          onClick={() => onNavigate('historico')}
          id="menu-btn-historico"
        >
          <div className="menu-card-icon-wrap menu-card-icon-secondary">
            <CalendarDays size={28} strokeWidth={1.8} />
          </div>
          <div className="menu-card-content">
            <span className="menu-card-title">Histórico</span>
            <span className="menu-card-desc">Consultar registros de ponto anteriores</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {pendingCount > 0 && (
              <span className="menu-card-badge">{pendingCount}</span>
            )}
            <ChevronRight size={20} className="menu-card-arrow" />
          </div>
        </button>
      </div>

      {/* Security Badge */}
      <div className="menu-security-badge">
        <Shield size={14} style={{ color: 'var(--success)' }} />
        <span>Protegido com captura biométrica dupla</span>
      </div>
    </div>
  )
}
