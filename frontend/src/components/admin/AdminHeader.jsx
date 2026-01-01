function AdminHeader({ showDbDropdown, setShowDbDropdown, onRefresh, navigate, onLogout }) {
  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowDbDropdown(!showDbDropdown)}>
            View ▼
          </button>
          {showDbDropdown && (
            <div className="dropdown-menu">
              <div
                className="dropdown-item"
                onClick={() => {
                  navigate('/admin/analytics')
                  setShowDbDropdown(false)
                }}
              >
                📊 Performance Analytics
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  navigate('/admin/metrics-database')
                  setShowDbDropdown(false)
                }}
              >
                📈 Metrics Database
              </div>
              <div
                className="dropdown-item"
                onClick={() => {
                  navigate('/admin/cache-database')
                  setShowDbDropdown(false)
                }}
              >
                💾 Cache Database
              </div>
            </div>
          )}
        </div>
        <button onClick={onRefresh}>Refresh</button>
        <button onClick={() => navigate('/')} style={{ background: '#555' }}>
          Back to Code Runner
        </button>
        <button onClick={handleLogout} style={{ background: '#d32f2f' }}>
          Logout
        </button>
      </div>
    </div>
  )
}

export default AdminHeader
