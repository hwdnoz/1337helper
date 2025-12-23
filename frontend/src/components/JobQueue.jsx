/**
 * JobQueue component displays background job status
 * Shows all active and completed jobs with real-time status updates
 */
function JobQueue({ jobs, currentJobId, onClearCompleted }) {
  if (!jobs || jobs.length === 0) {
    return null
  }

  const activeJobCount = jobs.filter(
    j => j.status !== 'SUCCESS' && j.status !== 'FAILURE'
  ).length

  return (
    <div style={{
      background: '#1e1e1e',
      border: '2px solid #0e639c',
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '4px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1177bb' }}>
          Background Jobs ({activeJobCount} active)
        </div>
        <button
          onClick={onClearCompleted}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.8rem',
            background: '#555',
            border: '1px solid #777'
          }}
        >
          Clear Completed
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {jobs.map((job) => (
          <div key={job.id} style={{
            background: '#2d2d2d',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            borderRadius: '4px',
            border: job.id === currentJobId ? '1px solid #1177bb' : '1px solid #3e3e42'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '0.5rem',
              fontSize: '0.85rem',
              alignItems: 'center'
            }}>
              <div style={{ color: '#888' }}>
                Problem #{job.problemNumber}:
              </div>
              <div style={{ fontFamily: 'monospace', color: '#4caf50', fontSize: '0.75rem' }}>
                {job.id.substring(0, 8)}...
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '2px',
                  background: job.status === 'SUCCESS' ? '#4caf50' :
                             job.status === 'FAILURE' ? '#f44336' :
                             job.status === 'STARTED' ? '#ff9800' :
                             '#888',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}>
                  {job.status}
                </span>
                {(job.status === 'PENDING' || job.status === 'STARTED') && (
                  <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>
              {job.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default JobQueue
