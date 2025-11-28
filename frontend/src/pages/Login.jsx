import React, { useState } from 'react'

export default function Login(){
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function sendVerification(e){
    e && e.preventDefault()
    setMessage('')
    const res = await fetch('/api/send-verification', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, fullName, userType: 'student', skipEmail: true }) })
    const j = await res.json()
    if (j.success) { setStep(2); setMessage('Code sent (dev).') } else setMessage(j.message || 'Error')
  }

  async function verifyCode(e){
    e && e.preventDefault()
    setMessage('')
    const res = await fetch('/api/verify-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, code }) })
    const j = await res.json()
    if (j.success) { setStep(3); setMessage('Verified.') } else setMessage(j.message || 'Error')
  }

  async function createUser(e){
    e && e.preventDefault()
    setMessage('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
    const j = await res.json()
    if (j.success) { setMessage('Account created! You may sign in.'); setStep(1); } else setMessage(j.message || 'Error')
  }

  return (
    <div className="login-box">
      <h2>Sign Up / Login</h2>
      {message && <p className="message">{message}</p>}
      {step === 1 && (
        <form onSubmit={sendVerification}>
          <input placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} required />
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <button type="submit">Send verification</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyCode}>
          <input placeholder="6-digit code" value={code} onChange={e=>setCode(e.target.value)} required />
          <button type="submit">Verify</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={createUser}>
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button type="submit">Create account</button>
        </form>
      )}
    </div>
  )
}
