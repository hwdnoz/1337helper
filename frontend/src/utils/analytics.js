/**
 * Analytics Service
 * Stores performance metrics and events in localStorage (no backend required)
 */

class Analytics {
  constructor() {
    this.storageKey = 'app_analytics';
    this.sessionId = this.generateSessionId();
    this.isEnabled = true;
    this.queue = [];
    this.maxQueueSize = 50;
    this.flushInterval = 10000; // Flush every 10 seconds
    this.maxStorageDays = 7; // Keep last 7 days

    // Initialize storage
    this.initStorage();

    // Start auto-flush
    this.startAutoFlush();
  }

  /**
   * Initialize localStorage structure
   */
  initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify({
        events: [],
        sessions: {},
        metadata: {
          version: '1.0',
          createdAt: Date.now(),
        }
      }));
    }

    // Cleanup old data
    this.cleanupOldData();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a performance metric
   */
  trackMetric(name, value, metadata = {}) {
    if (!this.isEnabled) return;

    const metric = {
      type: 'metric',
      name,
      value,
      metadata: {
        ...metadata,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    };

    this.addToQueue(metric);
  }

  /**
   * Track Web Vitals (LCP, FID, CLS, etc.)
   */
  trackWebVital(metric) {
    if (!this.isEnabled) return;

    const vital = {
      type: 'web-vital',
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      metadata: {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        navigationType: metric.navigationType,
      },
    };

    this.addToQueue(vital);

    // Web vitals are important - flush immediately if queue is getting full
    if (this.queue.length > this.maxQueueSize / 2) {
      this.flush();
    }
  }

  /**
   * Track errors
   */
  trackError(error, errorInfo = {}) {
    if (!this.isEnabled) return;

    const errorData = {
      type: 'error',
      message: error.message || String(error),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      metadata: {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    };

    this.addToQueue(errorData);

    // Errors are critical - flush immediately
    this.flush();
  }

  /**
   * Track custom events
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      type: 'event',
      name: eventName,
      properties,
      metadata: {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
      },
    };

    this.addToQueue(event);
  }

  /**
   * Track page views
   */
  trackPageView(path) {
    this.trackEvent('page_view', {
      path: path || window.location.pathname,
      referrer: document.referrer,
      title: document.title,
    });
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName, duration) {
    this.trackMetric('component_render', duration, {
      component: componentName,
    });
  }

  /**
   * Add metric to queue
   */
  addToQueue(data) {
    this.queue.push(data);

    // Prevent queue from growing too large
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Flush queued metrics to localStorage
   */
  async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const data = this.getStorageData();

      // Add events to storage
      data.events.push(...batch);

      // Update session info
      if (!data.sessions[this.sessionId]) {
        data.sessions[this.sessionId] = {
          startedAt: Date.now(),
          eventCount: 0,
        };
      }
      data.sessions[this.sessionId].eventCount += batch.length;
      data.sessions[this.sessionId].lastActivity = Date.now();

      // Save to localStorage
      this.saveStorageData(data);

      if (import.meta.env.DEV) {
        console.log(`💾 Saved ${batch.length} analytics events to localStorage`);
      }
    } catch (error) {
      console.warn('Analytics flush failed:', error);

      // Re-queue failed items if storage is not full
      if (this.queue.length < this.maxQueueSize) {
        this.queue.push(...batch.slice(0, this.maxQueueSize - this.queue.length));
      }
    }
  }

  /**
   * Get data from localStorage
   */
  getStorageData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : this.getDefaultStorage();
    } catch (error) {
      console.warn('Failed to read analytics storage:', error);
      return this.getDefaultStorage();
    }
  }

  /**
   * Save data to localStorage
   */
  saveStorageData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      // Storage quota exceeded
      console.warn('localStorage quota exceeded, cleaning up old data...');
      this.cleanupOldData(true);

      // Try again after cleanup
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save analytics after cleanup:', e);
      }
    }
  }

  /**
   * Get default storage structure
   */
  getDefaultStorage() {
    return {
      events: [],
      sessions: {},
      metadata: {
        version: '1.0',
        createdAt: Date.now(),
      }
    };
  }

  /**
   * Cleanup old data (keep last N days)
   */
  cleanupOldData(aggressive = false) {
    try {
      const data = this.getStorageData();
      const cutoffTime = Date.now() - (this.maxStorageDays * 24 * 60 * 60 * 1000);

      // If aggressive, keep only last 3 days
      const actualCutoff = aggressive
        ? Date.now() - (3 * 24 * 60 * 60 * 1000)
        : cutoffTime;

      // Filter events
      const originalCount = data.events.length;
      data.events = data.events.filter(event =>
        event.metadata.timestamp > actualCutoff
      );

      // Filter sessions
      Object.keys(data.sessions).forEach(sessionId => {
        if (data.sessions[sessionId].lastActivity < actualCutoff) {
          delete data.sessions[sessionId];
        }
      });

      this.saveStorageData(data);

      if (import.meta.env.DEV && originalCount > data.events.length) {
        console.log(`🗑️ Cleaned up ${originalCount - data.events.length} old analytics events`);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  /**
   * Get all events from storage
   */
  getAllEvents() {
    return this.getStorageData().events;
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.getAllEvents().filter(event => event.type === type);
  }

  /**
   * Get events by name
   */
  getEventsByName(name) {
    return this.getAllEvents().filter(event => event.name === name);
  }

  /**
   * Get events within time range
   */
  getEventsByTimeRange(startTime, endTime) {
    return this.getAllEvents().filter(event => {
      const timestamp = event.metadata.timestamp;
      return timestamp >= startTime && timestamp <= endTime;
    });
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return this.getStorageData().sessions;
  }

  /**
   * Clear all analytics data
   */
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    this.initStorage();
    if (import.meta.env.DEV) {
      console.log('🗑️ Cleared all analytics data');
    }
  }

  /**
   * Export data as JSON
   */
  exportData() {
    const data = this.getStorageData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get storage size in bytes
   */
  getStorageSize() {
    const data = localStorage.getItem(this.storageKey);
    return data ? new Blob([data]).size : 0;
  }

  /**
   * Start automatic flush interval
   */
  startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  /**
   * Stop analytics tracking
   */
  disable() {
    this.isEnabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  /**
   * Enable analytics tracking
   */
  enable() {
    this.isEnabled = true;
    if (!this.flushTimer) {
      this.startAutoFlush();
    }
  }
}

// Singleton instance
export const analytics = new Analytics();

// Convenience methods
export const trackMetric = (name, value, metadata) =>
  analytics.trackMetric(name, value, metadata);

export const trackError = (error, errorInfo) =>
  analytics.trackError(error, errorInfo);

export const trackEvent = (eventName, properties) =>
  analytics.trackEvent(eventName, properties);

export const trackPageView = (path) =>
  analytics.trackPageView(path);
