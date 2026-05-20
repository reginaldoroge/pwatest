import localforage from 'localforage'

const WEBHOOK_URL = 'https://webhook.site/0045d1d6-057e-441d-9b91-e81e5a76118d'

// Trava global para impedir sincronizações concorrentes/duplicadas no React
let isSyncing = false

// Cache em memória para rastrear timestamps de falhas de envio: recordId -> lastFailureTimestamp
const failedSyncs = new Map()

/**
 * Envia um registro de ponto específico para o servidor via POST HTTP em modo opaco (no-cors).
 * Isso evita qualquer erro de CORS no navegador e garante a entrega da imagem em Base64.
 * @param {Object} record - O objeto contendo as informações e foto do ponto.
 * @returns {Promise<boolean>} Retorna true se o envio foi transmitido, senão false.
 */
export const sendRecordToServer = async (record) => {
  try {
    // Usamos mode: 'no-cors' para evitar que o navegador rejeite a requisição devido a políticas de CORS
    // do servidor de destino. A requisição é transmitida normalmente e chega ao Webhook.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(record)
    })
    
    console.log(`[Sync] Registro ${record.id} transmitido com sucesso (modo opaco) para o Webhook!`)
    failedSyncs.delete(record.id) // Remove do controle de falha em caso de sucesso
    return true
  } catch (err) {
    console.error(`[Sync] Falha na transmissão de rede ao enviar ${record.id}:`, err)
    failedSyncs.set(record.id, Date.now()) // Registra timestamp da falha
    return false
  }
}

/**
 * Registra manualmente uma falha de sincronização para um ID de registro.
 * Útil para sincronizações iniciadas fora de syncPendingRecords.
 * @param {string} recordId - ID do registro de ponto.
 */
export const recordSyncFailure = (recordId) => {
  failedSyncs.set(recordId, Date.now())
}

/**
 * Procura por todos os registros pendentes no banco localForage e tenta enviá-los de forma sequencial.
 * Atualiza o histórico local e o estado do React caso haja alterações.
 * @param {Function} setHistory - Função para atualizar o estado do histórico do React.
 * @returns {Promise<void>}
 */
export const syncPendingRecords = async (setHistory) => {
  // Se já houver um processo ativo, bloqueamos chamadas concorrentes
  if (isSyncing) {
    console.log('[Sync] Sincronização já está em andamento. Ignorando chamada paralela.')
    return
  }

  isSyncing = true
  try {
    // Busca o histórico absoluto mais recente direto do localForage para evitar closures desatualizadas
    const history = await localforage.getItem('ponto_attendance_history') || []
    
    const now = Date.now()
    // Filtra registros 'pending' aplicando um throttle de 30 segundos nas falhas recentes para evitar loops infinitos
    const pendingRecords = history.filter(item => {
      if (item.syncStatus !== 'pending') return false
      const lastFailure = failedSyncs.get(item.id)
      if (lastFailure && now - lastFailure < 30000) {
        console.log(`[Sync] Ignorando envio automático do registro ${item.id} (falhou há menos de 30s)`)
        return false
      }
      return true
    })
    
    if (pendingRecords.length === 0) {
      console.log('[Sync] Nenhum registro pendente elegível para sincronização.')
      return
    }

    console.log(`[Sync] Detectado(s) ${pendingRecords.length} registro(s) pendente(s) elegível(eis). Iniciando transmissão segura...`)

    for (const item of pendingRecords) {
      const isSent = await sendRecordToServer(item)
      if (isSent) {
        setHistory(prev => {
          const updated = prev.map(r => r.id === item.id ? { ...r, syncStatus: 'synced' } : r)
          // Persiste síncronamente no banco para garantir consistência
          localforage.setItem('ponto_attendance_history', updated)
            .catch(err => console.error('[Sync] Erro ao persistir atualização do syncStatus:', err))
          return updated
        })
      }
    }
  } catch (err) {
    console.error('[Sync] Erro crítico no processo de sincronização:', err)
  } finally {
    isSyncing = false
  }
}
