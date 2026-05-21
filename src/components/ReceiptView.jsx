import { CheckCircle, Share2, Download } from 'lucide-react'

export default function ReceiptView({
  stampedPhoto,
  successRecord,
  handleShareWhatsApp,
  handleDownload,
  handleReset
}) {
  if (!stampedPhoto || !successRecord) return null

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
        <CheckCircle size={48} style={{ color: 'var(--success)' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Ponto Registrado com Sucesso!</h2>
        <p>Seu comprovante eletrônico carimbado foi gerado e salvo offline.</p>
      </div>

      {/* Photo preview or Document Preview */}
      <div style={{ position: 'relative' }}>
        {successRecord.isDocument && successRecord.fileType !== 'image/*' && !successRecord.fileType?.startsWith('image/') ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, rgba(217, 184, 103, 0.15), rgba(217, 184, 103, 0.05))',
            border: '2px dashed rgba(217, 184, 103, 0.4)',
            borderRadius: '12px',
            color: 'var(--text-main)',
            gap: '12px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '48px' }}>📄</span>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px', margin: '0 auto' }}>
                {successRecord.fileName || 'documento.pdf'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {successRecord.fileType || 'Documento'} {successRecord.fileSize ? `| ${(successRecord.fileSize / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>
          </div>
        ) : (
          <img 
            src={stampedPhoto} 
            alt="Ponto carimbado" 
            className="photo-preview"
          />
        )}
        <div className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px' }}>
          Original Carimbado
        </div>
      </div>

      {/* Meta text review details */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Funcionário:</span>
          <span style={{ fontWeight: '600' }}>{successRecord.employeeName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Horário Oficial:</span>
          <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{successRecord.date} - {successRecord.time}</span>
        </div>
        {successRecord.address && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Endereço:</span>
            <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '70%' }}>{successRecord.address}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>GPS Coordenadas:</span>
          <span style={{ fontWeight: '600' }}>{successRecord.latitude.toFixed(5)}, {successRecord.longitude.toFixed(5)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Google Maps:</span>
          <a 
            href={successRecord.mapsLink} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: 'var(--secondary)', fontWeight: '600', textDecoration: 'underline' }}
          >
            Abrir Mapa
          </a>
        </div>
      </div>

      {/* Share Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          className="btn btn-success" 
          onClick={handleShareWhatsApp}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontSize: '16px' }}
        >
          <Share2 size={18} /> Encaminhar para WhatsApp
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={handleDownload}
          >
            <Download size={18} /> {successRecord.isDocument ? 'Baixar Arquivo' : 'Baixar Foto'}
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={handleReset}
          >
            Novo Registro
          </button>
        </div>
      </div>

    </div>
  )
}
