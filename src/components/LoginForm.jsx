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
    <div className="glass-panel" style={{ width: '100%', margin: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        <Shield className="text-primary" style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '18px', textAlign: 'center' }}>Login de Acesso</h2>
      </div>
      <p style={{ marginBottom: '20px', textAlign: 'center' }}>
        Informe suas credenciais de colaborador para acessar o sistema de Ponto Seguro. A sessão permanecerá ativa até que realize o logoff.
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* Campos ocultos fictícios para capturar e desviar o preenchimento automático do navegador */}
        <input type="text" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }} tabIndex="-1" readOnly />
        <input type="password" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }} tabIndex="-1" readOnly />

        {/* CPF FIELD WITH MASK & VALIDATION TICK */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '40px', textAlign: 'center' }}
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
            <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>Digite os 11 dígitos do CPF</span>
          )}
          {cpf.length === 14 && !isCpfValid && (
            <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: 'var(--error)' }}>Algoritmo de CPF rejeitou estes dígitos</span>
          )}
        </div>

        {/* FULL NAME FIELD */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
            style={{ textAlign: 'center' }}
            required
          />
        </div>

        {/* ROLE DROPDOWN FIELD */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'center' }}>Função / Cargo</label>
          <select 
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'rgba(9, 13, 22, 0.95)', 
              color: 'var(--text-main)',
              cursor: 'pointer',
              textAlign: 'center',
              textAlignLast: 'center'
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lock size={14} /> Senha de Segurança
          </label>
          <input 
            type="password" 
            inputMode="numeric"
            autoComplete="new-password"
            className="form-input" 
            placeholder="Digite sua senha de segurança" 
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            style={{ textAlign: 'center' }}
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
            marginBottom: '20px',
            textAlign: 'center'
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
