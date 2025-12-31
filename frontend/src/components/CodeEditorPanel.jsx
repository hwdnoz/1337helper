import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import CacheIndicator from './CacheIndicator'

function CodeEditorPanel({
  code,
  setCode,
  vimEnabled,
  setVimEnabled,
  runCode,
  importTestCase,
  clearTestCases,
  lastUpdate,
  cacheHit,
  semanticCacheHit,
  similarityScore,
  cachedPrompt,
  currentPrompt,
  showPromptDiff,
  setShowPromptDiff
}) {
  return (
    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => setVimEnabled(!vimEnabled)}
          style={{
            background: vimEnabled ? '#0e639c' : '#555',
            opacity: vimEnabled ? 1 : 0.6
          }}
        >
          {vimEnabled ? '✓ ' : ''}Vim
        </button>
        <button onClick={runCode}>Run</button>
        <button onClick={importTestCase}>Import Test Cases</button>
        <button onClick={clearTestCases}>Clear Test Cases</button>
      </div>

      <CacheIndicator
        lastUpdate={lastUpdate}
        cacheHit={cacheHit}
        semanticCacheHit={semanticCacheHit}
        similarityScore={similarityScore}
        cachedPrompt={cachedPrompt}
        currentPrompt={currentPrompt}
        showPromptDiff={showPromptDiff}
        setShowPromptDiff={setShowPromptDiff}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={vimEnabled ? [python(), vim()] : [python()]}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true
          }}
          style={{ fontSize: 14, height: '100%', overflow: 'auto' }}
        />
      </div>
    </div>
  )
}

export default CodeEditorPanel
