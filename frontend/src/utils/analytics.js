/**
 * Analytics Service
 * Handles sending performance metrics and events to backend/analytics platform
 */

import { API_URL } from '../config';

class Analytics {
  constructor() {
    this.endpoint = `${API_URL}/api/analytics`;
    this.sessionId = this.generateSessionId();
    this.isEnabled = true;
    this.queue = [];
    this.maxQueueSize = 50;
    this.flushInterval = 10000; // Flush every 10 seconds

    // Start auto-flush
    this.startAutoFlush();
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
   * Flush queued metrics to server
   */
  async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      // Use sendBeacon for reliability (works even during page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events: batch })], {
          type: 'application/json',
        });
        navigator.sendBeacon(this.endpoint, blob);
      } else {
        // Fallback to fetch
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
          keepalive: true,
        }).catch((err) => {
          console.warn('Failed to send analytics:', err);
          // Re-queue failed items (up to limit)
          if (this.queue.length < this.maxQueueSize) {
            this.queue.push(...batch.slice(0, this.maxQueueSize - this.queue.length));
          }
        });
      }
    } catch (error) {
      console.warn('Analytics flush failed:', error);
    }
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
