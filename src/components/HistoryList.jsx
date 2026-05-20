import { Calendar, MapPin, Trash2 } from 'lucide-react'

export default function HistoryList({
  isConfiguring,
  attendanceHistory,
  setStampedPhoto,
  setSuccessRecord,
  handleDeleteRecord,
  handleSyncRecord
}) {
  if (isConfiguring) return null

  return (
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
                {item.syncStatus === 'pending' ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (handleSyncRecord) handleSyncRecord(item)
                    }}
                    className="badge" 
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    title="Clique para tentar sincronizar agora"
                  >
                    ⏳ Pendente
                  </button>
                ) : (
                  <span className="badge badge-success" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    ☁️ Sincronizado
                  </span>
                )}
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
  )
}
