import { useState, useEffect } from 'react';
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from '../../utils/apiKeyManager';
import './SettingsModal.css';

/**
 * Settings Modal Component
 *
 * Allows users to input and manage their Google API key.
 * The key is stored only in sessionStorage and cleared when the browser tab closes.
 */
function SettingsModal({ isOpen, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const currentKey = getApiKey();
      setSavedKey(currentKey);
      setApiKeyInput(currentKey || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput);
      setSavedKey(apiKeyInput);
      alert('API key saved successfully! It will be cleared when you close this browser tab.');
      onClose();
    } else {
      alert('Please enter a valid API key');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your API key? You will need to re-enter it to use AI features.')) {
      clearApiKey();
      setApiKeyInput('');
      setSavedKey(null);
      alert('API key cleared');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>Google API Key</h3>
            <p className="settings-description">
              Your API key is required for all AI features. It is stored only in your browser's
              sessionStorage and will be cleared when you close this tab.
            </p>

            <div className="api-key-status">
              {hasApiKey() ? (
                <span className="status-indicator status-active">✓ API Key Set</span>
              ) : (
                <span className="status-indicator status-inactive">⚠ No API Key</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="api-key-input">API Key</label>
              <div className="api-key-input-wrapper">
                <input
                  id="api-key-input"
                  type={showKey ? 'text' : 'password'}
                  className="api-key-input"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Google API key"
                />
                <button
                  className="toggle-visibility-button"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={handleSave}>
                Save API Key
              </button>
              {hasApiKey() && (
                <button className="btn btn-danger" onClick={handleClear}>
                  Clear API Key
                </button>
              )}
            </div>

            <div className="settings-help">
              <h4>How to get a Google API Key:</h4>
              <ol>
                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Get API Key" or "Create API Key"</li>
                <li>Copy your API key and paste it above</li>
              </ol>

              <h4>Security Notes:</h4>
              <ul>
                <li>Your API key is stored only in your browser's sessionStorage</li>
                <li>It is never sent to or stored on the server</li>
                <li>It will be automatically cleared when you close this browser tab</li>
                <li>Each API request includes your key, which is used only for that request</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
