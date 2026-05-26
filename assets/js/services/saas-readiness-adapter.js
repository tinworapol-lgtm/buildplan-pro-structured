// BuildPlan Pro SaaS readiness adapter.
// It exposes non-secret deployment status so the app can warn operators before selling access.
(function bootstrapBuildPlanSaaS(global) {
  const config = global.BuildPlanConfig || {};
  const endpoint = config.system?.endpoints?.readiness || '';
  const staticDemoMode = config.licensing?.mode === 'static-demo';
  const automaticApiChecks = config.featureFlags?.automaticApiChecks === true;

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
    if (staticDemoMode || !endpoint) {
      readinessState = {
        configured: false,
        mode: staticDemoMode ? 'static-demo' : 'readiness-endpoint-missing',
        missing: staticDemoMode ? [] : ['system.endpoints.readiness'],
        message: staticDemoMode ? 'Static demo mode: backend checks are disabled until cloud/subscription is activated.' : '',
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
        envStatus: payload.envStatus || {},
        nextActions: Array.isArray(payload.nextActions) ? payload.nextActions : [],
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

  function shouldUseAutomaticApiChecks() {
    return automaticApiChecks;
  }

  global.BuildPlanSaaS = {
    getReadinessState,
    refreshReadiness,
    canEnablePaidMode,
    shouldUseAutomaticApiChecks,
  };
})(window);
