function TestCasePanel({
  content,
  setContent,
  metadata,
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
          {metadata.testCaseLastUpdate && (
            <div className={`response-metadata ${metadata.testCaseCacheHit ? 'cache-hit' : 'cache-miss'}`}>
              {metadata.testCaseCacheHit && <span className="cache-lightning">⚡</span>}
              Last updated: {metadata.testCaseLastUpdate.toLocaleTimeString()}
              {metadata.testCaseCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
            </div>
          )}
          <textarea
            className="sidebar-textarea"
            value={content.testCase}
            onChange={e => setContent(prev => ({ ...prev, testCase: e.target.value }))}
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
