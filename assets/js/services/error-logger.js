// BuildPlan Pro public beta frontend error logger.
(function bootstrapBuildPlanErrorLogger(global) {
  const endpoint = '/api/errors';
  let lastSentAt = 0;

  function serializeError(error) {
    if (!error) return { message: 'Unknown error' };
    if (typeof error === 'string') return { message: error };
    return {
      message: error.message || String(error),
      stack: error.stack || '',
      name: error.name || '',
    };
  }

  async function reportError(error, metadata = {}) {
    const now = Date.now();
    if (now - lastSentAt < 1000) return { skipped: true };
    lastSentAt = now;
    const info = serializeError(error);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...global.BuildPlanAuth?.getAuthorizationHeaders?.(),
        },
        body: JSON.stringify({
          message: info.message,
          stack: info.stack,
          source: metadata.source || info.name || 'frontend',
          route: global.location?.href || '',
          user_agent: global.navigator?.userAgent || '',
          metadata,
        }),
      });
      return response.json().catch(() => ({ ok: response.ok }));
    } catch (_ignored) {
      return { logged: false };
    }
  }

  function initialize() {
    window.addEventListener('error', (event) => {
      reportError(event.error || event.message, {
        source: 'window.error',
        filename: event.filename || '',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
      });
    });
    window.addEventListener('unhandledrejection', (event) => {
      reportError(event.reason, { source: 'unhandledrejection' });
    });
  }

  global.BuildPlanErrorLogger = {
    reportError,
    initialize,
  };

  initialize();
})(window);
