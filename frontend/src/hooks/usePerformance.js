import { useEffect, useRef, useCallback } from 'react';
import { analytics } from '../utils/analytics';
import { mark, measure } from '../utils/performanceMonitoring';

/**
 * Hook to track component render performance
 *
 * @example
 * function MyComponent() {
 *   usePerformance('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function usePerformance(componentName) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;

    // Track mount time on first render
    if (renderCount.current === 1) {
      const duration = Date.now() - mountTime.current;
      analytics.trackComponentRender(componentName, duration);

      if (import.meta.env.DEV) {
        console.log(`⚡ ${componentName} mounted in ${duration}ms`);
      }
    }

    return () => {
      // Track unmount
      if (import.meta.env.DEV) {
        console.log(`👋 ${componentName} unmounted after ${renderCount.current} renders`);
      }
    };
  }, [componentName]);
}

/**
 * Hook to measure time between events
 *
 * @example
 * function DataLoader() {
 *   const { start, end } = usePerformanceMark();
 *
 *   const loadData = async () => {
 *     start('data-load');
 *     await fetchData();
 *     end('data-load');
 *   };
 * }
 */
export function usePerformanceMark() {
  const startMark = useCallback((name) => {
    mark(`${name}-start`);
  }, []);

  const endMark = useCallback((name) => {
    mark(`${name}-end`);
    measure(name, `${name}-start`, `${name}-end`);
  }, []);

  return {
    start: startMark,
    end: endMark,
  };
}

/**
 * Hook to track API call performance
 * Returns a wrapped fetch function that automatically tracks metrics
 *
 * @example
 * function DataComponent() {
 *   const trackedFetch = useApiTracking();
 *
 *   const loadData = async () => {
 *     const response = await trackedFetch('/api/data');
 *     return response.json();
 *   };
 * }
 */
export function useApiTracking() {
  const trackedFetch = useCallback(async (url, options = {}) => {
    const startTime = performance.now();

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      analytics.trackMetric('api_call', duration, {
        endpoint: url,
        method: options.method || 'GET',
        status: response.status,
        success: response.ok,
      });

      if (import.meta.env.DEV) {
        console.log(`🌐 API ${url}: ${duration.toFixed(2)}ms (${response.status})`);
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      analytics.trackMetric('api_call', duration, {
        endpoint: url,
        method: options.method || 'GET',
        status: 0,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }, []);

  return trackedFetch;
}

/**
 * Hook to track user interactions
 *
 * @example
 * function Button() {
 *   const trackClick = useInteractionTracking('button-click');
 *
 *   return <button onClick={trackClick}>Click me</button>;
 * }
 */
export function useInteractionTracking(eventName) {
  const trackInteraction = useCallback(
    (event) => {
      analytics.trackEvent(eventName, {
        timestamp: Date.now(),
        target: event?.target?.tagName,
        text: event?.target?.textContent?.slice(0, 50),
      });
    },
    [eventName]
  );

  return trackInteraction;
}

/**
 * Hook to track page view on mount
 *
 * @example
 * function HomePage() {
 *   usePageTracking('/home');
 *   return <div>...</div>;
 * }
 */
export function usePageTracking(pageName) {
  useEffect(() => {
    analytics.trackPageView(pageName || window.location.pathname);
  }, [pageName]);
}

/**
 * Hook to track errors within a component
 *
 * @example
 * function DataComponent() {
 *   const trackError = useErrorTracking('DataComponent');
 *
 *   const loadData = async () => {
 *     try {
 *       await fetchData();
 *     } catch (error) {
 *       trackError(error);
 *     }
 *   };
 * }
 */
export function useErrorTracking(componentName) {
  const trackError = useCallback(
    (error, additionalInfo = {}) => {
      analytics.trackError(error, {
        component: componentName,
        ...additionalInfo,
      });

      if (import.meta.env.DEV) {
        console.error(`❌ Error in ${componentName}:`, error);
      }
    },
    [componentName]
  );

  return trackError;
}

/**
 * Hook to measure expensive operations
 *
 * @example
 * function HeavyComponent() {
 *   const measure = useMeasure();
 *
 *   const processData = () => {
 *     return measure('data-processing', () => {
 *       // Expensive operation
 *       return heavyCalculation();
 *     });
 *   };
 * }
 */
export function useMeasure() {
  const measureOperation = useCallback((operationName, operation) => {
    const startTime = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - startTime;

      analytics.trackMetric(operationName, duration);

      if (import.meta.env.DEV && duration > 16) {
        console.warn(`⚠️ ${operationName} took ${duration.toFixed(2)}ms (> 16ms frame budget)`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      analytics.trackMetric(operationName, duration, { error: true });
      throw error;
    }
  }, []);

  return measureOperation;
}
