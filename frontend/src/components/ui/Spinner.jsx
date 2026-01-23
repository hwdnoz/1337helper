import React from 'react'

/**
 * Reusable spinner/loading indicator component
 * @param {string} message - Optional loading message to display below spinner
 * @param {string} size - Size of spinner: 'small' (30px), 'medium' (50px), 'large' (70px)
 * @param {boolean} overlay - Whether to show as overlay (positioned absolute with backdrop)
 */
function Spinner({ message = 'Loading...', size = 'medium', overlay = false }) {
  const sizeMap = {
    small: '30px',
    medium: '50px',
    large: '70px'
  }

  const spinnerStyle = {
    width: sizeMap[size] || sizeMap.medium,
    height: sizeMap[size] || sizeMap.medium,
    border: '4px solid #3e3e42',
    borderTop: '4px solid #0e639c',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  }

  const content = (
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={spinnerStyle}></div>
      {message && (
        <div style={{ color: '#888', marginTop: '1rem', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="loading-overlay">
        {content}
      </div>
    )
  }

  return content
}

export default Spinner
