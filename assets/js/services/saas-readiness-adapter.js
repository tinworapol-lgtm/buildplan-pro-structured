// BuildPlan Pro SaaS readiness adapter.
// It exposes non-secret deployment status so the app can warn operators before selling access.
(function bootstrapBuildPlanSaaS(global) {
  const config = global.BuildPlanConfig || {};
  const endpoint = config.system?.endpoints?.readiness || '';

  let readinessState = {
    configured: false,
    mode: 'unknown',
    missing: [],
    checkedAt: null,
  };

  function getReadinessState() {
    return {
      ...readinessState,
      missing: Array.isArray(readinessState.missing) ? [...readinessState.missing] : [],
    };
  }

  function publishReadinessState() {
    global.dispatchEvent?.(new CustomEvent('buildplan:saas-readiness', {
      detail: getReadinessState(),
    }));
  }

  async function refreshReadiness() {
    if (!endpoint) {
      readinessState = {
        configured: false,
        mode: 'readiness-endpoint-missing',
        missing: ['system.endpoints.readiness'],
        checkedAt: new Date().toISOString(),
      };
      publishReadinessState();
      return getReadinessState();
    }
    try {
      const response = await fetch(endpoint, { credentials: 'include', headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      readinessState = {
        configured: !!payload.configured,
        mode: payload.mode || (response.ok ? 'unknown' : 'unavailable'),
        missing: Array.isArray(payload.missing) ? payload.missing : [],
        supabase: payload.supabase || {},
        stripe: payload.stripe || {},
        app: payload.app || {},
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      readinessState = {
        configured: false,
        mode: 'readiness-request-failed',
        missing: [],
        message: error.message,
        checkedAt: new Date().toISOString(),
      };
    }
    publishReadinessState();
    return getReadinessState();
  }

  function canEnablePaidMode() {
    return readinessState.configured === true;
  }

  global.BuildPlanSaaS = {
    getReadinessState,
    refreshReadiness,
    canEnablePaidMode,
  };
})(window);
