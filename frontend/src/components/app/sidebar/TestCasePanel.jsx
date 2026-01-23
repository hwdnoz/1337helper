import Spinner from '../../ui/Spinner'

function TestCasePanel({
  content,
  setContent,
  metadata,
  generateTestCases,
  importTestCase,
  clearTestCases,
  isLoading = false
}) {
  return (
    <>
      <div className="sidebar-content">
        <div className="sidebar-info">
          Generate or write test cases for your code. Click "Import Test Cases" to add them to your code.
        </div>
        <div className="sidebar-section" style={{ position: 'relative' }}>
          <label>Test Cases</label>
          {metadata.testCaseLastUpdate && (
            <div className={`response-metadata ${metadata.testCaseCacheHit ? 'cache-hit' : 'cache-miss'}`}>
              {metadata.testCaseCacheHit && <span className="cache-lightning">⚡</span>}
              Last updated: {metadata.testCaseLastUpdate.toLocaleTimeString()}
              {metadata.testCaseCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
            </div>
          )}
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              background: 'rgba(30, 30, 30, 0.95)',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #3e3e42'
            }}>
              <Spinner message="Generating test cases..." size="medium" />
            </div>
          )}
          <textarea
            className="sidebar-textarea"
            value={content.testCase}
            onChange={e => setContent(prev => ({ ...prev, testCase: e.target.value }))}
            placeholder="Enter test cases or generate them..."
            style={{ minHeight: '400px', opacity: isLoading ? 0.3 : 1 }}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="sidebar-footer">
        <button onClick={generateTestCases} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Test Cases'}
        </button>
        <button onClick={importTestCase} disabled={isLoading}>Import Test Cases</button>
        <button onClick={clearTestCases} style={{ background: '#555' }} disabled={isLoading}>Clear Test Cases</button>
      </div>
    </>
  )
}

export default TestCasePanel
