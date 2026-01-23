import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import ResponseMetadata from './ResponseMetadata'
import Spinner from '../ui/Spinner'

function CodeEditorPanel({
  content,
  setContent,
  ui,
  setUi,
  metadata,
  setMetadata,
  runCode,
  importTestCase,
  clearTestCases,
  isLoading = false,
  loadingMessage = 'Processing request...'
}) {
  return (
    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => setUi(prev => ({ ...prev, vimEnabled: !prev.vimEnabled }))}
          style={{
            background: ui.vimEnabled ? '#0e639c' : '#555',
            opacity: ui.vimEnabled ? 1 : 0.6
          }}
        >
          {ui.vimEnabled ? '✓ ' : ''}Vim
        </button>
        <button onClick={runCode}>Run</button>
        <button onClick={importTestCase}>Import Test Cases</button>
        <button onClick={clearTestCases}>Clear Test Cases</button>
      </div>

      <ResponseMetadata
        metadata={metadata}
        setMetadata={setMetadata}
        ui={ui}
        setUi={setUi}
      />

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {isLoading && <Spinner message={loadingMessage} overlay={true} />}
        <CodeMirror
          value={content.code}
          onChange={(val) => setContent(prev => ({ ...prev, code: val }))}
          extensions={ui.vimEnabled ? [python(), vim()] : [python()]}
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
