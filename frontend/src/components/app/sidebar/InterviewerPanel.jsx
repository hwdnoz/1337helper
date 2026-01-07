import { useState } from 'react'
import { API_URL } from '../../../config'

export default function InterviewerPanel() {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [status, setStatus] = useState('')

  const startSession = async () => {
    const res = await fetch(`${API_URL}/api/interviewer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem: 'Two Sum' })
    })
    const data = await res.json()
    setSessionId(data.session_id)
    setMessages([{ role: 'interviewer', text: data.message }])
    setHintsUsed(0)
  }

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return

    const userMessage = input
    const newMessages = [...messages, { role: 'user', text: userMessage }]
    setMessages(newMessages)
    setInput('')
    setStatus('Interviewer is thinking...')

    // Use Server-Sent Events for streaming
    const res = await fetch(`${API_URL}/api/interviewer/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message: userMessage })
    })

    if (!res.ok) {
      setStatus('Error: Failed to connect')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const jsonStr = line.replace('data: ', '')
          try {
            const event = JSON.parse(jsonStr)

            if (event.type === 'tool') {
              // Add tool message immediately
              setMessages(prev => [...prev, { role: event.role, text: event.text }])
              setHintsUsed(event.hints_used)
              // Keep "thinking..." status
            } else if (event.type === 'final') {
              // Add final message and clear status
              setMessages(prev => [...prev, { role: 'interviewer', text: event.text }])
              setHintsUsed(event.hints_used)
              setStatus('')
            } else if (event.type === 'error') {
              setStatus(`Error: ${event.text}`)
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', e)
          }
        }
      }
    } catch (error) {
      console.error('Stream reading error:', error)
      setStatus('')
    }
  }

  const requestHint = async () => {
    if (!sessionId) return
    const res = await fetch(`${API_URL}/api/interviewer/hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
    const data = await res.json()
    if (data.hint) {
      setMessages([...messages, { role: 'hint', text: data.hint }])
      setHintsUsed(data.hints_used)
    }
  }

  const endSession = async () => {
    if (!sessionId) return
    await fetch(`${API_URL}/api/interviewer/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
    setSessionId(null)
    setMessages([])
    setInput('')
    setHintsUsed(0)
    setStatus('')
  }

  if (!sessionId) {
    return (
      <div className="interviewer-panel interviewer-panel--empty">
        <p className="interviewer-panel__intro">
          Practice with a simple interviewer that asks follow-up questions.
        </p>
        <button
          className="interviewer-panel__primary-btn"
          onClick={startSession}
        >
          Start Interview
        </button>
      </div>
    )
  }

  return (
    <div className="interviewer-panel">
      {status && (
        <div className="interviewer-panel__status">
          <span className="interviewer-panel__status-dot" />
          {status}
        </div>
      )}
      <div className="interviewer-panel__messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`interviewer-panel__message interviewer-panel__message--${msg.role}`}
          >
            <div className="interviewer-panel__message-label">
              {msg.role === 'user' ? 'YOU' : msg.role === 'hint' ? 'HINT' : 'INTERVIEWER'}
            </div>
            <div className="interviewer-panel__message-text">{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="interviewer-panel__composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Type your response..."
          className="interviewer-panel__input"
        />
        <div className="interviewer-panel__actions">
          <button
            onClick={sendMessage}
            className="interviewer-panel__send-btn"
          >
            Send
          </button>
          <button
            onClick={requestHint}
            disabled={hintsUsed >= 3}
            className="interviewer-panel__hint-btn"
          >
            Hint ({hintsUsed}/3)
          </button>
          <button
            onClick={endSession}
            className="interviewer-panel__end-btn"
          >
            End
          </button>
        </div>
      </div>
    </div>
  )
}
