function AdminControls({
  currentModel,
  availableModels,
  cacheEnabled,
  modelAwareCache,
  onModelChange,
  onToggleCache,
  onToggleModelAwareCache
}) {
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #3e3e42',
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: '#888', minWidth: '50px' }}>Model:</label>
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            background: '#2d2d30',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            padding: '0.5rem 0.8rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            minWidth: '180px'
          }}
        >
          {availableModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onToggleCache}
        style={{
          background: cacheEnabled ? '#2e7d32' : '#c62828',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}
      >
        Cache: {cacheEnabled ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={onToggleModelAwareCache}
        style={{
          background: modelAwareCache ? '#1976d2' : '#616161',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}
        title={modelAwareCache ? 'Each model has separate cache' : 'All models share the same cache'}
      >
        Model-Aware: {modelAwareCache ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

export default AdminControls
