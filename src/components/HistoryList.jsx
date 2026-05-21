import { MapPin, Trash2, Clock, CloudOff, CheckCircle2, RefreshCw, ImageOff } from 'lucide-react'

export default function HistoryList({
  isConfiguring,
  attendanceHistory,
  setStampedPhoto,
  setSuccessRecord,
  handleDeleteRecord,
  handleSyncRecord
}) {
  if (isConfiguring) return null

  // Group records by date
  const groupedByDate = attendanceHistory.reduce((groups, item) => {
    const date = item.date
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
    return groups
  }, {})

  const dateKeys = Object.keys(groupedByDate)
  const totalSynced = attendanceHistory.filter(r => r.syncStatus === 'synced').length
  const totalPending = attendanceHistory.filter(r => r.syncStatus === 'pending').length

  return (
    <div className="history-container">
      {/* Stats Bar */}
      {attendanceHistory.length > 0 && (
        <div className="history-stats-bar">
          <div className="history-stat">
            <span className="history-stat-number">{attendanceHistory.length}</span>
            <span className="history-stat-label">Total</span>
          </div>
          <div className="history-stat-divider" />
          <div className="history-stat">
            <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
            <span className="history-stat-number" style={{ color: 'var(--success)' }}>{totalSynced}</span>
            <span className="history-stat-label">Sincronizados</span>
          </div>
          {totalPending > 0 && (
            <>
              <div className="history-stat-divider" />
              <div className="history-stat">
                <CloudOff size={13} style={{ color: '#f59e0b' }} />
                <span className="history-stat-number" style={{ color: '#f59e0b' }}>{totalPending}</span>
                <span className="history-stat-label">Pendentes</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {attendanceHistory.length === 0 ? (
        <div className="history-empty-state">
          <div className="history-empty-icon">
            <ImageOff size={32} strokeWidth={1.5} />
          </div>
          <h3 className="history-empty-title">Nenhum registro ainda</h3>
          <p className="history-empty-desc">
            Seus comprovantes de ponto aparecerão aqui após o primeiro registro.
          </p>
        </div>
      ) : (
        <div className="history-groups">
          {dateKeys.map((date) => (
            <div key={date} className="history-date-group">
              {/* Date Header */}
              <div className="history-date-header">
                <span className="history-date-label">{date}</span>
                <span className="history-date-count">{groupedByDate[date].length} registro{groupedByDate[date].length > 1 ? 's' : ''}</span>
              </div>

              {/* Cards */}
              <div className="history-cards-list">
                {groupedByDate[date].map((item) => (
                  <div
                    key={item.id}
                    className="history-card-v2"
                    onClick={() => {
                      setStampedPhoto(item.photo)
                      setSuccessRecord(item)
                    }}
                  >
                    {/* Photo or Document Fallback */}
                    <div className="history-card-photo-wrap">
                      {item.isDocument && item.fileType !== 'image/*' && !item.fileType?.startsWith('image/') ? (
                        <div className="history-card-doc-fallback" title={item.fileName || 'Documento'}>
                          📄
                        </div>
                      ) : (
                        <img src={item.photo} alt="Ponto" className="history-card-photo" />
                      )}
                      <div className="history-card-photo-overlay">
                        <Clock size={12} />
                        <span>{item.time}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="history-card-body">
                      <div className="history-card-top-row">
                        <span className="history-card-time-main">{item.time}</span>
                        {item.syncStatus === 'pending' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (handleSyncRecord) handleSyncRecord(item)
                            }}
                            className="history-sync-badge history-sync-pending"
                            title="Clique para sincronizar"
                          >
                            <RefreshCw size={10} />
                            Pendente
                          </button>
                        ) : (
                          <span className="history-sync-badge history-sync-done">
                            <CheckCircle2 size={10} />
                            Sincronizado
                          </span>
                        )}
                      </div>

                      <div className="history-card-address">
                        <MapPin size={11} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                        <span>{item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}</span>
                      </div>

                      <div className="history-card-bottom-row">
                        <span className="history-card-employee">{item.employeeName}</span>
                        <button
                          className="history-delete-btn"
                          onClick={(e) => handleDeleteRecord(item.id, e)}
                          title="Excluir registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
