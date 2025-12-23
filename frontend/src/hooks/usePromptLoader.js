import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import { PROMPT_MODIFIERS } from '../promptPresets'

/**
 * Custom hook for managing prompt loading and customization
 * Handles base prompt template loading, placeholder replacement, and preset modifiers
 */
export function usePromptLoader(problemNumber) {
  const [basePrompt, setBasePrompt] = useState('')
  const [basePromptTemplate, setBasePromptTemplate] = useState('')
  const [promptModifier, setPromptModifier] = useState('')
  const [activePreset, setActivePreset] = useState('default')
  const [loadingBasePrompt, setLoadingBasePrompt] = useState(false)

  // Load base prompt template from admin defaults on mount
  useEffect(() => {
    const loadBasePrompt = async () => {
      setLoadingBasePrompt(true)
      try {
        const res = await fetch(`${API_URL}/api/prompts/leetcode_solve`)
        const data = await res.json()
        if (data.success) {
          setBasePromptTemplate(data.prompt.content)
        }
      } catch (error) {
        console.error('Failed to load base prompt:', error)
      } finally {
        setLoadingBasePrompt(false)
      }
    }
    loadBasePrompt()
  }, [])

  // Update base prompt when template or problem number changes
  // Replaces placeholders: {problem_number} and #{problem_number}
  useEffect(() => {
    if (basePromptTemplate) {
      const replaced = basePromptTemplate
        .replace(/\{problem_number\}/g, problemNumber || '{problem_number}')
        .replace(/#\{problem_number\}/g, problemNumber || '#{problem_number}')
      setBasePrompt(replaced)
    }
  }, [basePromptTemplate, problemNumber])

  // Apply a preset modifier to the prompt
  const applyPreset = (preset) => {
    const modifier = PROMPT_MODIFIERS[preset] || ''
    setPromptModifier(modifier)
    setActivePreset(preset)
  }

  // Reset prompt modifier to default (empty)
  const resetPromptToDefault = () => {
    setPromptModifier('')
    setActivePreset('default')
  }

  // Get the final prompt by combining base + modifier
  const getFinalPrompt = () => {
    return basePrompt + promptModifier
  }

  return {
    basePrompt,
    basePromptTemplate,
    promptModifier,
    activePreset,
    loadingBasePrompt,
    applyPreset,
    resetPromptToDefault,
    getFinalPrompt,
    setPromptModifier // Allow manual editing
  }
}
