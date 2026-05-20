/**
 * Utilitários para envio de registros de ponto e sincronização offline com o Webhook.
 */

const WEBHOOK_URL = 'https://webhook.site/0045d1d6-057e-441d-9b91-e81e5a76118d'

/**
 * Envia um registro de ponto específico para o servidor via POST HTTP.
 * @param {Object} record - O objeto contendo as informações e foto do ponto.
 * @returns {Promise<boolean>} Retorna true se o envio foi bem-sucedido, senão false.
 */
export const sendRecordToServer = async (record) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(record)
    })
    
    if (response.ok) {
      console.log(`[Sync] Registro ${record.id} enviado com sucesso para o Webhook!`)
      return true
    } else {
      console.warn(`[Sync] Servidor respondeu com código de erro ${response.status} ao enviar ${record.id}`)
      return false
    }
  } catch (err) {
    console.error(`[Sync] Falha na rede ao conectar com o servidor para enviar ${record.id}:`, err)
    return false
  }
}

/**
 * Procura por todos os registros pendentes no histórico e tenta enviá-los de forma sequencial.
 * Atualiza o histórico local e o estado do React caso haja alterações.
 * @param {Array} history - O estado atual do histórico de pontos.
 * @param {Function} setHistory - Função para atualizar o estado do histórico.
 * @returns {Promise<void>}
 */
export const syncPendingRecords = async (history, setHistory) => {
  const pendingRecords = history.filter(item => item.syncStatus === 'pending')
  
  if (pendingRecords.length === 0) {
    console.log('[Sync] Nenhum registro pendente para sincronização.')
    return
  }

  console.log(`[Sync] Detectado(s) ${pendingRecords.length} registro(s) pendente(s). Iniciando sincronização...`)
  let hasChanges = false
  const updatedHistory = [...history]

  for (let i = 0; i < updatedHistory.length; i++) {
    const item = updatedHistory[i]
    if (item.syncStatus === 'pending') {
      const isSent = await sendRecordToServer(item)
      if (isSent) {
        updatedHistory[i] = {
          ...item,
          syncStatus: 'synced'
        }
        hasChanges = true
      }
    }
  }

  if (hasChanges) {
    setHistory(updatedHistory)
    console.log('[Sync] Histórico sincronizado atualizado com sucesso!')
  } else {
    console.warn('[Sync] Tentativa de sincronização concluída, mas nenhum registro foi enviado com sucesso.')
  }
}
