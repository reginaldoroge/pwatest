import { User, Edit2 } from 'lucide-react'

export default function Header({ employeeName, employeeRole, onEditProfile }) {
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
      <button 
        className="btn btn-secondary" 
        style={{ width: 'auto', padding: '8px 12px', borderRadius: '10px' }}
        onClick={onEditProfile}
      >
        <Edit2 size={14} />
      </button>
    </header>
  )
}
