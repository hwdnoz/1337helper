import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (username === 'admin' && password === 'admin') {
      onLogin()
      navigate('/admin')
    } else {
      setError('Invalid username or password')
      setPassword('')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Admin Login</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        <div className="login-info">
          <strong>Default Credentials:</strong>
          <div>Username: <code>admin</code></div>
          <div>Password: <code>admin</code></div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="back-button"
          style={{ marginTop: '1rem', background: '#555' }}
        >
          Back to Code Runner
        </button>
      </div>
    </div>
  )
}

export default Login
