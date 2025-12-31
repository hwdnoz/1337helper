function LeetCodeInput({ leetcodeNumber, setLeetcodeNumber, onSolve }) {
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #3e3e42',
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '2px',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>LeetCode Problem:</div>
      <input
        type="number"
        value={leetcodeNumber}
        onChange={e => setLeetcodeNumber(e.target.value)}
        placeholder="e.g., 70"
        style={{
          width: '100px',
          background: '#2d2d2d',
          color: '#d4d4d4',
          border: '1px solid #3e3e42',
          borderRadius: '2px',
          padding: '0.5rem',
          fontFamily: 'monospace',
          fontSize: '0.9rem'
        }}
      />
      <button onClick={onSolve}>Solve</button>
    </div>
  )
}

export default LeetCodeInput
