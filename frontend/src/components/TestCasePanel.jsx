function TestCasePanel({
  testCase,
  setTestCase,
  lastTestCaseUpdate,
  testCaseCacheHit,
  generateTestCases,
  importTestCase,
  clearTestCases
}) {
  return (
    <>
      <div className="sidebar-content">
        <div className="sidebar-info">
          Generate or write test cases for your code. Click "Import Test Cases" to add them to your code.
        </div>
        <div className="sidebar-section">
          <label>Test Cases</label>
          {lastTestCaseUpdate && (
            <div style={{
              fontSize: '0.85rem',
              color: testCaseCacheHit ? '#4caf50' : '#888',
              padding: '0.25rem 0.5rem',
              background: testCaseCacheHit ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              borderRadius: '2px',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {testCaseCacheHit && <span style={{ fontSize: '1rem' }}>⚡</span>}
              Last updated: {lastTestCaseUpdate.toLocaleTimeString()}
              {testCaseCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
            </div>
          )}
          <textarea
            className="sidebar-textarea"
            value={testCase}
            onChange={e => setTestCase(e.target.value)}
            placeholder="Enter test cases or generate them..."
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>
      <div className="sidebar-footer">
        <button onClick={generateTestCases}>
          Generate Test Cases
        </button>
        <button onClick={importTestCase}>
          Import Test Cases
        </button>
        <button onClick={clearTestCases} style={{ background: '#555' }}>
          Clear Test Cases
        </button>
      </div>
    </>
  )
}

export default TestCasePanel
