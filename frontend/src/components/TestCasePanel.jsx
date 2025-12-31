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
            <div className={`cache-indicator ${testCaseCacheHit ? 'hit' : 'miss'}`}>
              {testCaseCacheHit && <span className="cache-lightning">⚡</span>}
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
        <button onClick={generateTestCases}>Generate Test Cases</button>
        <button onClick={importTestCase}>Import Test Cases</button>
        <button onClick={clearTestCases} style={{ background: '#555' }}>Clear Test Cases</button>
      </div>
    </>
  )
}

export default TestCasePanel
