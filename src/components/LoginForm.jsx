import { useState } from 'react'
import { 
  Shield, 
  Check, 
  User, 
  Hash, 
  Lock 
} from 'lucide-react'
import { formatCPF, validateCPF } from '../utils/validation'

export default function LoginForm({
  onLogin,
  playBuzzerSound
}) {
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Portaria')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isCpfValid = cpf.length === 14 && validateCPF(cpf)

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.')
      playBuzzerSound(false)
      return
    }

    if (!validateCPF(cpf)) {
      setError('CPF inválido. Por favor, verifique os dígitos.')
      playBuzzerSound(false)
      return
    }

    if (password !== '1234') {
      setError('Senha de segurança incorreta.')
      playBuzzerSound(false)
      return
    }

    // Success login
    playBuzzerSound(true)
    onLogin(cpf, name.trim(), role)
  }

  return (
    <div className="glass-panel" style={{ marginBottom: '20px', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Shield className="text-primary" style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '18px' }}>Login de Acesso</h2>
      </div>
      <p style={{ marginBottom: '20px' }}>
        Informe suas credenciais de colaborador para acessar o sistema de Ponto Seguro. A sessão permanecerá ativa até que realize o logoff.
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* CPF FIELD WITH MASK & VALIDATION TICK */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hash size={14} /> CPF do Colaborador
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              inputMode="numeric"
              className="form-input" 
              placeholder="000.000.000-00" 
              value={cpf}
              onChange={handleCpfChange}
              style={{ width: '100%', paddingRight: '40px' }}
              required
            />
            {cpf.length === 14 && (
              <span style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: isCpfValid ? 'var(--success)' : 'var(--error)'
              }}>
                {isCpfValid ? <Check size={20} /> : '⚠️'}
              </span>
            )}
          </div>
          {cpf.length > 0 && cpf.length < 14 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digite os 11 dígitos do CPF</span>
          )}
          {cpf.length === 14 && !isCpfValid && (
            <span style={{ fontSize: '11px', color: 'var(--error)' }}>Algoritmo de CPF rejeitou estes dígitos</span>
          )}
        </div>

        {/* FULL NAME FIELD */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} /> Nome Completo
          </label>
          <input 
            type="text" 
            autoComplete="off"
            spellCheck="false"
            data-lpignore="true"
            className="form-input" 
            placeholder="Ex: João da Silva" 
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            required
          />
        </div>

        {/* ROLE DROPDOWN FIELD */}
        <div className="form-group">
          <label className="form-label">Função / Cargo</label>
          <select 
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'rgba(9, 13, 22, 0.95)', 
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <option value="Portaria">🏠 Portaria</option>
            <option value="Zeladoria">🧹 Zeladoria</option>
            <option value="Limpeza">🧽 Limpeza</option>
            <option value="Segurança">🛡️ Segurança</option>
            <option value="Supervisão">👔 Supervisão</option>
          </select>
        </div>

        {/* PASSWORD FIELD */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} /> Senha de Segurança
          </label>
          <input 
            type="password" 
            inputMode="numeric"
            className="form-input" 
            placeholder="Digite sua senha de segurança" 
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            required
          />
        </div>

        {/* ERROR SUMMARY */}
        {error && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--error)', 
            borderRadius: '12px', 
            color: 'var(--error)', 
            fontSize: '13px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={!name.trim() || !isCpfValid || !password}
          style={{ opacity: (!name.trim() || !isCpfValid || !password) ? 0.6 : 1 }}
        >
          <Check size={18} /> Entrar no Ponto Seguro
        </button>
      </form>
    </div>
  )
}
