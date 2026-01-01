/**
 * Performance Monitoring
 * Tracks Core Web Vitals and custom performance metrics
 */

import { onCLS, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';
import { analytics } from './analytics';

/**
 * Initialize Core Web Vitals tracking
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance (< 2.5s is good)
 * - INP (Interaction to Next Paint): Responsiveness (< 200ms is good)
 * - CLS (Cumulative Layout Shift): Visual stability (< 0.1 is good)
 * - FCP (First Contentful Paint): First render (< 1.8s is good)
 * - TTFB (Time to First Byte): Server response (< 800ms is good)
 *
 * Note: FID was deprecated in favor of INP in web-vitals v3+
 */
export function initPerformanceMonitoring() {
  // Core Web Vitals
  onLCP((metric) => {
    analytics.trackWebVital(metric);
    logMetric('LCP', metric);
  });

  onINP((metric) => {
    analytics.trackWebVital(metric);
    logMetric('INP', metric);
  });

  onCLS((metric) => {
    analytics.trackWebVital(metric);
    logMetric('CLS', metric);
  });

  onFCP((metric) => {
    analytics.trackWebVital(metric);
    logMetric('FCP', metric);
  });

  onTTFB((metric) => {
    analytics.trackWebVital(metric);
    logMetric('TTFB', metric);
  });

  // Track additional browser metrics
  trackNavigationTiming();
  trackResourceTiming();
  trackMemoryUsage();
}

/**
 * Log metric to console in development
 */
function logMetric(name, metric) {
  if (import.meta.env.DEV) {
    const rating = metric.rating || 'unknown';
    const value = Math.round(metric.value);
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';

    console.log(`${emoji} ${name}: ${value}ms (${rating})`);
  }
}

/**
 * Track Navigation Timing API metrics
 */
function trackNavigationTiming() {
  if (!window.performance || !window.performance.timing) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const timing = performance.timing;
      const navigation = performance.navigation;

      // Calculate key metrics
      const metrics = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        dom: timing.domComplete - timing.domLoading,
        load: timing.loadEventEnd - timing.loadEventStart,
        total: timing.loadEventEnd - timing.navigationStart,
      };

      // Track each metric
      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          analytics.trackMetric(`navigation_${name}`, value, {
            navigationType: getNavigationType(navigation.type),
          });
        }
      });
    }, 0);
  });
}

/**
 * Track resource loading performance
 */
function trackResourceTiming() {
  if (!window.performance || !window.performance.getEntriesByType) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const resources = performance.getEntriesByType('resource');

      // Group by type
      const resourcesByType = {};
      let totalSize = 0;
      let totalDuration = 0;

      resources.forEach((resource) => {
        const type = getResourceType(resource.name);

        if (!resourcesByType[type]) {
          resourcesByType[type] = {
            count: 0,
            size: 0,
            duration: 0,
          };
        }

        resourcesByType[type].count++;
        resourcesByType[type].duration += resource.duration;

        if (resource.transferSize) {
          resourcesByType[type].size += resource.transferSize;
          totalSize += resource.transferSize;
        }

        totalDuration += resource.duration;
      });

      // Track summary metrics
      analytics.trackMetric('resources_total_count', resources.length);
      analytics.trackMetric('resources_total_size', totalSize);
      analytics.trackMetric('resources_total_duration', totalDuration);

      // Track by type
      Object.entries(resourcesByType).forEach(([type, stats]) => {
        analytics.trackMetric(`resources_${type}_count`, stats.count);
        analytics.trackMetric(`resources_${type}_size`, stats.size);
        analytics.trackMetric(`resources_${type}_duration`, stats.duration);
      });

      if (import.meta.env.DEV) {
        console.log('📦 Resources loaded:', resourcesByType);
      }
    }, 1000);
  });
}

/**
 * Track memory usage (Chrome only)
 */
function trackMemoryUsage() {
  if (!performance.memory) return;

  // Track initial memory
  const trackMemory = () => {
    const memory = performance.memory;
    analytics.trackMetric('memory_used', memory.usedJSHeapSize);
    analytics.trackMetric('memory_total', memory.totalJSHeapSize);
    analytics.trackMetric('memory_limit', memory.jsHeapSizeLimit);

    if (import.meta.env.DEV) {
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
      console.log(`💾 Memory: ${usedMB} MB / ${totalMB} MB`);
    }
  };

  // Track on load
  window.addEventListener('load', trackMemory);

  // Track periodically
  setInterval(trackMemory, 60000); // Every minute
}

/**
 * Get navigation type name
 */
function getNavigationType(type) {
  const types = {
    0: 'navigate',
    1: 'reload',
    2: 'back_forward',
    255: 'reserved',
  };
  return types[type] || 'unknown';
}

/**
 * Determine resource type from URL
 */
function getResourceType(url) {
  if (url.match(/\.(js)$/)) return 'script';
  if (url.match(/\.(css)$/)) return 'stylesheet';
  if (url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) return 'image';
  if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
  if (url.match(/\.(mp4|webm|ogg)$/)) return 'video';
  if (url.match(/\.(json)$/)) return 'json';
  return 'other';
}

/**
 * Manually track a custom metric
 */
export function trackCustomMetric(name, value, metadata = {}) {
  analytics.trackMetric(name, value, metadata);
}

/**
 * Track long tasks (tasks > 50ms that block the main thread)
 */
export function trackLongTasks() {
  if (!window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        analytics.trackMetric('long_task', entry.duration, {
          name: entry.name,
          startTime: entry.startTime,
        });

        if (import.meta.env.DEV && entry.duration > 100) {
          console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Long tasks API not supported
  }
}

/**
 * Create a performance mark
 */
export function mark(name) {
  if (performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measure(name, startMark, endMark) {
  if (!performance.measure) return;

  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];

    if (measure) {
      analytics.trackMetric(name, measure.duration);

      if (import.meta.env.DEV) {
        console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
      }
    }
  } catch (e) {
    console.warn('Performance measurement failed:', e);
  }
}

/**
 * Track API request performance
 */
export function trackApiCall(endpoint, duration, status) {
  analytics.trackMetric('api_call', duration, {
    endpoint,
    status,
    success: status >= 200 && status < 300,
  });
}
