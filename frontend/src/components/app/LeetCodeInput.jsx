function LeetCodeInput({ leetcodeNumber, setLeetcodeNumber, onSolve }) {
  return (
    <div className="leetcode-input-container">
      <div className="leetcode-label">LeetCode Problem:</div>
      <input
        type="number"
        value={leetcodeNumber}
        onChange={e => setLeetcodeNumber(e.target.value)}
        placeholder="e.g., 70"
        className="leetcode-input"
      />
      <button onClick={onSolve}>Solve</button>
    </div>
  )
}

export default LeetCodeInput
