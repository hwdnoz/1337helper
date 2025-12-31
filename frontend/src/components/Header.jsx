function Header({ sidebarOpen, sidebarMode, toggleSidebar, navigate }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ margin: 0 }}>Code Runner</h1>

      {/* Sidebar Toggle Buttons */}
      <div className="sidebar-toggles">
        <button
          className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'test-case' ? 'active' : ''}`}
          onClick={() => toggleSidebar('test-case')}
        >
          Test Cases
        </button>
        <button
          className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'llm-prompt' ? 'active' : ''}`}
          onClick={() => toggleSidebar('llm-prompt')}
        >
          LLM Prompt
        </button>
        <button
          className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'solution-prompt' ? 'active' : ''}`}
          onClick={() => toggleSidebar('solution-prompt')}
        >
          Solution Prompt
        </button>
        <button
          className="sidebar-toggle-btn"
          onClick={() => navigate('/admin')}
        >
          Admin
        </button>
      </div>
    </div>
  )
}

export default Header
