import { useState, useEffect, useRef, useCallback } from 'react'
import { API_URL } from '../config'

/**
 * Custom hook for managing async job polling and status tracking
 * Handles job lifecycle, localStorage persistence, and automatic polling
 */
export function useJobManager() {
  const [jobs, setJobs] = useState([])
  const [currentJobId, setCurrentJobId] = useState(null)
  const [currentJobStatus, setCurrentJobStatus] = useState(null)
  const [currentJobMessage, setCurrentJobMessage] = useState('')
  const jobPollingIntervals = useRef({})

  // Update localStorage when jobs change
  const updateJobsInLocalStorage = useCallback(() => {
    setJobs(prevJobs => {
      const activeJobs = prevJobs.filter(
        job => job.status !== 'SUCCESS' && job.status !== 'FAILURE'
      )
      localStorage.setItem('activeJobs', JSON.stringify(activeJobs))
      return prevJobs
    })
  }, [])

  // Poll individual job status
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}`)
      const data = await res.json()

      const isTerminal = data.state === 'SUCCESS' || data.state === 'FAILURE'

      // Stop polling if job is done
      if (isTerminal) {
        if (jobPollingIntervals.current[jobId]) {
          clearInterval(jobPollingIntervals.current[jobId])
          delete jobPollingIntervals.current[jobId]
        }
      }

      // Update jobs list
      setJobs(prevJobs => {
        const existingIndex = prevJobs.findIndex(j => j.id === jobId)

        if (existingIndex >= 0) {
          const updated = [...prevJobs]
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: data.state,
            message: data.status || data.result || '',
            result: data.result // Store full result data for UI updates
          }
          return updated
        } else {
          return [...prevJobs, {
            id: jobId,
            status: data.state,
            message: data.status || data.result || '',
            problemNumber: data.problem_number || '',
            timestamp: Date.now(),
            result: data.result
          }]
        }
      })

      // Update current job if it matches
      if (jobId === currentJobId) {
        setCurrentJobStatus(data.state)

        if (data.state === 'SUCCESS') {
          setCurrentJobMessage(data.result || 'Success')
        } else if (data.state === 'FAILURE') {
          setCurrentJobMessage(`Error: ${data.result || 'Unknown error'}`)
        } else {
          setCurrentJobMessage(data.status || '')
        }
      }

      // Update localStorage if terminal
      if (isTerminal) {
        updateJobsInLocalStorage()
      }
    } catch (error) {
      console.error('Polling Error:', error)
    }
  }, [currentJobId, updateJobsInLocalStorage])

  // Start tracking a new job
  const startJob = useCallback((jobId, problemNumber = '') => {
    const newJob = {
      id: jobId,
      status: 'PENDING',
      message: 'Starting...',
      problemNumber,
      timestamp: Date.now()
    }

    setJobs(prev => [...prev, newJob])
    setCurrentJobId(jobId)
    setCurrentJobStatus('PENDING')
    setCurrentJobMessage('Starting...')

    // Save to localStorage
    localStorage.setItem('activeJobs', JSON.stringify([...jobs, newJob]))

    // Start polling
    jobPollingIntervals.current[jobId] = setInterval(() => {
      pollJobStatus(jobId)
    }, 2000)
  }, [jobs, pollJobStatus])

  // Clear completed jobs
  const clearCompletedJobs = useCallback(() => {
    setJobs(prevJobs =>
      prevJobs.filter(j => j.status !== 'SUCCESS' && j.status !== 'FAILURE')
    )
    updateJobsInLocalStorage()
  }, [updateJobsInLocalStorage])

  // Load saved jobs from localStorage on mount
  useEffect(() => {
    const savedJobsStr = localStorage.getItem('activeJobs')

    if (savedJobsStr) {
      try {
        const savedJobs = JSON.parse(savedJobsStr)
        const now = Date.now()

        // Filter jobs that are less than 10 minutes old
        const validJobs = savedJobs.filter(job => {
          const elapsed = now - job.timestamp
          return elapsed < 600000 // 10 minutes
        })

        if (validJobs.length > 0) {
          setJobs(validJobs)

          // Start polling for each job
          validJobs.forEach(job => {
            jobPollingIntervals.current[job.id] = setInterval(() => {
              pollJobStatus(job.id)
            }, 2000)
            // Poll immediately
            pollJobStatus(job.id)
          })

          // Set the most recent job as the "current" job
          const mostRecent = validJobs[validJobs.length - 1]
          setCurrentJobId(mostRecent.id)
          setCurrentJobStatus(mostRecent.status)
          setCurrentJobMessage(mostRecent.message)
        } else {
          localStorage.removeItem('activeJobs')
        }
      } catch (error) {
        console.error('Error loading jobs from localStorage:', error)
        localStorage.removeItem('activeJobs')
      }
    }

    // Cleanup on unmount
    return () => {
      Object.values(jobPollingIntervals.current).forEach(interval =>
        clearInterval(interval)
      )
    }
  }, [pollJobStatus])

  return {
    jobs,
    currentJobId,
    currentJobStatus,
    currentJobMessage,
    startJob,
    clearCompletedJobs,
    setCurrentJobMessage // For custom message updates
  }
}
