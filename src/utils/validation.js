/**
 * Formata uma string bruta aplicando a máscara de CPF: 000.000.000-00
 * @param {string} value Valor de input
 * @returns {string} Valor formatado
 */
export function formatCPF(value) {
  if (!value) return ''
  
  // Remove qualquer caractere que não seja dígito
  const digitsOnly = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limitedDigits = digitsOnly.slice(0, 11)
  
  // Aplica a máscara progressivamente
  if (limitedDigits.length <= 3) {
    return limitedDigits
  }
  if (limitedDigits.length <= 6) {
    return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3)}`
  }
  if (limitedDigits.length <= 9) {
    return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6)}`
  }
  return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6, 9)}-${limitedDigits.slice(9)}`
}

/**
 * Valida se um CPF é algoritmamente correto
 * @param {string} cpf CPF completo (com ou sem máscara)
 * @returns {boolean} True se for um CPF válido, caso contrário False
 */
export function validateCPF(cpf) {
  if (!cpf) return false
  
  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // CPF deve conter exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // CPF não pode conter todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Validação do Primeiro Dígito
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false
  
  // Validação do Segundo Dígito
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false
  
  return true
}
