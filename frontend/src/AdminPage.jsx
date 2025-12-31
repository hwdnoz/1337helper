import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminControls from './components/admin/AdminControls'
import SummaryStats from './components/admin/SummaryStats'
import PerformanceChart from './components/admin/PerformanceChart'
import CacheChart from './components/admin/CacheChart'
import AdminHeader from './components/admin/AdminHeader'
import RecentCallsList from './components/admin/RecentCallsList'
import CallDetailsModal from './components/admin/CallDetailsModal'
import PromptEditorModal from './components/admin/PromptEditorModal'
import './App.css'
import { API_URL } from './config'

const AVAILABLE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

function AdminPage({ onLogout }) {
  const navigate = useNavigate()

  // Data state (metrics, stats, prompts)
  const [data, setData] = useState({
    metrics: [],
    summary: null,
    cacheStats: null,
    prompts: []
  })

  // Settings state (cache, model configuration)
  const [settings, setSettings] = useState({
    cacheEnabled: true,
    modelAwareCache: true,
    semanticCacheEnabled: false,
    currentModel: 'gemini-2.5-flash'
  })

  // UI state (modals, dropdowns, loading)
  const [ui, setUi] = useState({
    selectedCall: null,
    loadingCall: false,
    loadingMetrics: true,
    showDbDropdown: false,
    selectedPrompt: null,
    editedPromptContent: '',
    savingPrompt: false
  })

  useEffect(() => {
    loadMetrics()
    loadCacheStats()
    loadCacheEnabled()
    loadModelAwareCache()
    loadSemanticCacheEnabled()
    loadCurrentModel()
    loadPrompts()
  }, [])

  const loadMetrics = async () => {
    setUi(prev => ({ ...prev, loadingMetrics: true }))
    try {
      const [metricsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/observability/metrics?limit=1000`),
        fetch(`${API_URL}/api/observability/summary`)
      ])

      const metricsData = await metricsRes.json()
      const summaryData = await summaryRes.json()

      if (metricsData.success) {
        setData(prev => ({ ...prev, metrics: metricsData.metrics }))
      }
      if (summaryData.success) {
        setData(prev => ({ ...prev, summary: summaryData.summary }))
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setUi(prev => ({ ...prev, loadingMetrics: false }))
    }
  }

  const loadCallDetails = async (callId) => {
    setUi(prev => ({ ...prev, loadingCall: true }))
    try {
      const res = await fetch(`${API_URL}/api/observability/call/${callId}`)
      const responseData = await res.json()

      if (responseData.success) {
        setUi(prev => ({ ...prev, selectedCall: responseData.call }))
      }
    } catch (error) {
      console.error('Failed to load call details:', error)
    } finally {
      setUi(prev => ({ ...prev, loadingCall: false }))
    }
  }

  const closeCallModal = () => {
    setUi(prev => ({ ...prev, selectedCall: null }))
  }

  const loadCacheStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/stats`)
      const responseData = await res.json()

      if (responseData.success) {
        setData(prev => ({ ...prev, cacheStats: responseData.stats }))
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    }
  }

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all cache entries?')) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/cache/clear`, { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(`Cleared ${data.deleted_count} cache entries`)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache')
    }
  }

  const clearExpiredCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/clear-expired`, { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(`Cleared ${data.deleted_count} expired cache entries`)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to clear expired cache:', error)
      alert('Failed to clear expired cache')
    }
  }

  const loadCacheEnabled = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/enabled`)
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, cacheEnabled: responseData.enabled }))
      }
    } catch (error) {
      console.error('Failed to load cache enabled status:', error)
    }
  }

  const toggleCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !settings.cacheEnabled })
      })
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, cacheEnabled: responseData.enabled }))
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to toggle cache:', error)
      alert('Failed to toggle cache')
    }
  }

  const loadModelAwareCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/model-aware`)
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, modelAwareCache: responseData.model_aware }))
      }
    } catch (error) {
      console.error('Failed to load model-aware cache status:', error)
    }
  }

  const toggleModelAwareCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/model-aware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_aware: !settings.modelAwareCache })
      })
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, modelAwareCache: responseData.model_aware }))
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to toggle model-aware cache:', error)
      alert('Failed to toggle model-aware cache')
    }
  }

  const loadSemanticCacheEnabled = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/semantic-enabled`)
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, semanticCacheEnabled: responseData.semantic_enabled }))
      }
    } catch (error) {
      console.error('Failed to load semantic cache enabled status:', error)
    }
  }

  const toggleSemanticCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/semantic-enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semantic_enabled: !settings.semanticCacheEnabled })
      })
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, semanticCacheEnabled: responseData.semantic_enabled }))
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to toggle semantic cache:', error)
      alert('Failed to toggle semantic cache')
    }
  }

  const loadCurrentModel = async () => {
    try {
      const res = await fetch(`${API_URL}/api/current-model`)
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, currentModel: responseData.model }))
      }
    } catch (error) {
      console.error('Failed to load current model:', error)
    }
  }

  const changeModel = async (model) => {
    try {
      const res = await fetch(`${API_URL}/api/current-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      })
      const responseData = await res.json()

      if (responseData.success) {
        setSettings(prev => ({ ...prev, currentModel: responseData.model }))
        alert(`Model changed to ${responseData.model}`)
      }
    } catch (error) {
      console.error('Failed to change model:', error)
      alert('Failed to change model')
    }
  }

  const loadPrompts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prompts`)
      const responseData = await res.json()
      if (responseData.success) {
        setData(prev => ({ ...prev, prompts: responseData.prompts }))
      }
    } catch (error) {
      console.error('Failed to load prompts:', error)
    }
  }

  const openPromptEditor = async (promptName) => {
    try {
      const res = await fetch(`${API_URL}/api/prompts/${promptName}`)
      const responseData = await res.json()
      if (responseData.success) {
        setUi(prev => ({
          ...prev,
          selectedPrompt: { name: promptName, ...responseData.prompt },
          editedPromptContent: responseData.prompt.content
        }))
      }
    } catch (error) {
      console.error('Failed to load prompt:', error)
    }
  }

  const savePrompt = async () => {
    if (!ui.selectedPrompt) return
    setUi(prev => ({ ...prev, savingPrompt: true }))
    try {
      const res = await fetch(`${API_URL}/api/prompts/${ui.selectedPrompt.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ui.editedPromptContent })
      })
      const responseData = await res.json()
      if (responseData.success) {
        alert('Prompt saved!')
        setUi(prev => ({
          ...prev,
          selectedPrompt: { ...ui.selectedPrompt, ...responseData.prompt }
        }))
        loadPrompts()
      } else {
        alert('Failed to save: ' + responseData.error)
      }
    } catch (error) {
      console.error('Failed to save prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setUi(prev => ({ ...prev, savingPrompt: false }))
    }
  }

  const resetPrompt = async () => {
    if (!ui.selectedPrompt || !confirm('Reset to default?')) return
    try {
      const res = await fetch(`${API_URL}/api/prompts/${ui.selectedPrompt.name}/reset`, {
        method: 'POST'
      })
      const responseData = await res.json()
      if (responseData.success) {
        alert('Reset to default!')
        setUi(prev => ({
          ...prev,
          selectedPrompt: { name: ui.selectedPrompt.name, ...responseData.prompt },
          editedPromptContent: responseData.prompt.content
        }))
        loadPrompts()
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error)
    }
  }

  const closePromptEditor = () => {
    setUi(prev => ({ ...prev, selectedPrompt: null, editedPromptContent: '' }))
  }

  return (
    <div className="app">
      <AdminHeader
        showDbDropdown={ui.showDbDropdown}
        setShowDbDropdown={(val) => setUi(prev => ({ ...prev, showDbDropdown: val }))}
        onRefresh={loadMetrics}
        navigate={navigate}
        onLogout={onLogout}
      />

      <AdminControls
        currentModel={settings.currentModel}
        availableModels={AVAILABLE_MODELS}
        cacheEnabled={settings.cacheEnabled}
        modelAwareCache={settings.modelAwareCache}
        semanticCacheEnabled={settings.semanticCacheEnabled}
        prompts={data.prompts}
        onModelChange={changeModel}
        onToggleCache={toggleCache}
        onToggleModelAwareCache={toggleModelAwareCache}
        onToggleSemanticCache={toggleSemanticCache}
        onPromptSelect={openPromptEditor}
      />

      {ui.loadingMetrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="admin-container">
          <SummaryStats
            summary={data.summary}
            cacheStats={data.cacheStats}
            cacheEnabled={settings.cacheEnabled}
            onToggleCache={toggleCache}
            onClearExpiredCache={clearExpiredCache}
            onClearCache={clearCache}
          />

          <PerformanceChart metrics={data.metrics} />

          <CacheChart metrics={data.metrics} />

          <RecentCallsList metrics={data.metrics} onCallClick={loadCallDetails} />
        </div>
      )}

      {ui.selectedCall && (
        <CallDetailsModal
          call={ui.selectedCall}
          loading={ui.loadingCall}
          onClose={closeCallModal}
        />
      )}

      {ui.selectedPrompt && (
        <PromptEditorModal
          prompt={ui.selectedPrompt}
          editedContent={ui.editedPromptContent}
          saving={ui.savingPrompt}
          onContentChange={(val) => setUi(prev => ({ ...prev, editedPromptContent: val }))}
          onSave={savePrompt}
          onReset={resetPrompt}
          onClose={closePromptEditor}
        />
      )}
    </div>
  )
}

export default AdminPage
