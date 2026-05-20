import { Calendar, MapPin, Trash2 } from 'lucide-react'

export default function HistoryList({
  isConfiguring,
  attendanceHistory,
  setStampedPhoto,
  setSuccessRecord,
  handleDeleteRecord
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
  )
}
