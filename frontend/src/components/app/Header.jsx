function Header({ ui, toggleSidebar, navigate, onOpenSettings, hasApiKey }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ margin: 0 }}>Code Runner</h1>

      <div className="sidebar-toggles">
        <button
          className={`sidebar-toggle-btn ${ui.sidebarOpen && ui.sidebarMode === 'solution-prompt' ? 'active' : ''}`}
          onClick={() => toggleSidebar('solution-prompt')}
        >
          Solution Prompt
        </button>
        <button
          className={`sidebar-toggle-btn ${ui.sidebarOpen && ui.sidebarMode === 'llm-prompt' ? 'active' : ''}`}
          onClick={() => toggleSidebar('llm-prompt')}
        >
          LLM Prompt
        </button>
        <button
          className={`sidebar-toggle-btn ${ui.sidebarOpen && ui.sidebarMode === 'test-case' ? 'active' : ''}`}
          onClick={() => toggleSidebar('test-case')}
        >
          Test Cases
        </button>
        <button className="sidebar-toggle-btn" onClick={() => navigate('/admin')}>
          Admin
        </button>
        <button
          className={`sidebar-toggle-btn ${hasApiKey ? 'api-key-set' : 'api-key-missing'}`}
          onClick={onOpenSettings}
          title={hasApiKey ? 'API Key Set - Click to manage' : 'No API Key - Click to set'}
        >
          {hasApiKey ? '🔑' : '⚠️'} Settings
        </button>
      </div>
    </div>
  )
}

export default Header
