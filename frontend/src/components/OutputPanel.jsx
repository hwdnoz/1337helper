function OutputPanel({ output, outputRef }) {
  return (
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ marginBottom: '0.5rem', color: '#d4d4d4', flexShrink: 0 }}>Output</div>
      <pre ref={outputRef} style={{ flex: 1, minHeight: 0 }}>{output}</pre>
    </div>
  )
}

export default OutputPanel
