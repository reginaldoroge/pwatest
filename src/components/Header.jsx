import { User, Edit2 } from 'lucide-react'

export default function Header({ employeeName, employeeRole, onEditProfile, isOnline }) {
  return (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Connectivity Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: isOnline ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
          fontSize: '10px',
          fontWeight: 'bold',
          color: isOnline ? '#34d399' : '#f59e0b'
        }}>
          <span style={{
            position: 'relative',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#f59e0b',
            display: 'inline-block'
          }}>
            {isOnline && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                display: 'inline-block',
                opacity: 0.75
              }}></span>
            )}
          </span>
          {isOnline ? 'ONLINE' : 'MODO OFFLINE'}
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '8px 12px', borderRadius: '10px' }}
          onClick={onEditProfile}
          title="Editar Perfil"
        >
          <Edit2 size={14} />
        </button>
      </div>
    </header>
  )
}
