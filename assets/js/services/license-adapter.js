// BuildPlan Pro license/session adapter.
// This keeps subscription logic isolated from Gantt, storage, and editing features.
(function bootstrapBuildPlanLicense(global) {
  const config = global.BuildPlanConfig || {};
  const licensing = config.licensing || {};
  const automaticApiChecks = config.featureFlags?.automaticApiChecks === true;

  let licenseState = {
    mode: licensing.mode || 'local-demo',
    status: 'active',
    plan: licensing.publicFreeAccess ? '599' : 'local-demo',
    expiresAt: null,
    checkedAt: null,
    loginRequired: !!licensing.loginRequired,
    message: licensing.mode === 'static-demo' ? 'Static demo mode' : 'Local demo mode',
  };

  function publishLicenseState() {
    if (global.document?.body) {
      global.document.body.dataset.licenseMode = licenseState.mode;
      global.document.body.dataset.licenseStatus = licenseState.status;
    }
    global.dispatchEvent?.(new CustomEvent('buildplan:license-state', {
      detail: getLicenseState(),
    }));
  }

  function setLicenseState(nextState) {
    licenseState = {
      ...licenseState,
      ...nextState,
      checkedAt: new Date().toISOString(),
    };
    publishLicenseState();
    return getLicenseState();
  }

  function getLicenseConfig() {
    return {
      mode: licensing.mode || 'local-demo',
      loginRequired: !!licensing.loginRequired,
      publicFreeAccess: !!licensing.publicFreeAccess,
      defaultPlan: licensing.publicFreeAccess ? '599' : null,
      plans: Array.isArray(licensing.plans) ? [...licensing.plans] : [],
      endpoints: { ...(licensing.endpoints || {}) },
    };
  }

  function getLicenseState() {
    return { ...licenseState };
  }

  function isLicenseActive() {
    return licenseState.status === 'active' || !licenseState.loginRequired;
  }

  function isFeatureEnabled(featureName) {
    const flags = config.featureFlags || {};
    return flags[featureName] !== false;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || options.errorMessage || 'Request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function getSessionStatus() {
    const licenseConfig = getLicenseConfig();
    if (licenseConfig.publicFreeAccess) {
      return {
        authenticated: true,
        user: null,
        mode: 'public-free-access',
        plan: '599',
      };
    }
    if (licenseConfig.mode === 'local-demo' || licenseConfig.mode === 'static-demo' || !licenseConfig.endpoints.session) {
      return {
        authenticated: true,
        user: null,
        mode: 'local-demo',
      };
    }
    return requestJson(licenseConfig.endpoints.session, {
      errorMessage: 'Session request failed',
    });
  }

  async function startCheckout(plan) {
    const licenseConfig = getLicenseConfig();
    if (!licenseConfig.plans.includes(plan)) {
      throw new Error('Unsupported subscription plan');
    }
    if (licenseConfig.mode === 'local-demo' || licenseConfig.mode === 'static-demo' || !licenseConfig.endpoints.checkout) {
      return {
        mode: 'local-demo',
        plan,
        checkoutUrl: '',
        message: 'Checkout is not configured in local demo mode',
      };
    }
    return requestJson(licenseConfig.endpoints.checkout, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
      errorMessage: 'Checkout request failed',
    });
  }

  async function refreshLicenseStatus() {
    const licenseConfig = getLicenseConfig();
    if (licenseConfig.publicFreeAccess) {
      return setLicenseState({
        mode: 'public-free-access',
        status: 'active',
        plan: '599',
        expiresAt: null,
        loginRequired: false,
        message: 'Public beta free access: all 599 features unlocked.',
      });
    }
    if (licenseConfig.mode === 'local-demo' || licenseConfig.mode === 'static-demo' || !licenseConfig.endpoints.licenseStatus) {
      return setLicenseState({
        mode: licenseConfig.mode === 'static-demo' ? 'static-demo' : 'local-demo',
        status: 'active',
        plan: licenseConfig.mode === 'static-demo' ? 'static-demo' : 'local-demo',
        expiresAt: null,
        loginRequired: false,
        message: 'Local demo mode',
      });
    }

    try {
      const payload = await requestJson(licenseConfig.endpoints.licenseStatus, {
        errorMessage: 'License status request failed',
      });
      return setLicenseState({
        mode: licenseConfig.mode,
        status: payload.status || 'inactive',
        plan: payload.plan || null,
        expiresAt: payload.expiresAt || null,
        loginRequired: licenseConfig.loginRequired,
        message: payload.message || '',
      });
    } catch (error) {
      return setLicenseState({
        mode: licenseConfig.mode,
        status: licenseConfig.loginRequired ? 'unavailable' : 'active',
        loginRequired: licenseConfig.loginRequired,
        message: error.message || 'License check unavailable',
      });
    }
  }

  function initializeLicenseGate() {
    publishLicenseState();
    if (licensing.publicFreeAccess) {
      return setLicenseState({
        mode: 'public-free-access',
        status: 'active',
        plan: '599',
        expiresAt: null,
        loginRequired: false,
        message: 'Public beta free access: all 599 features unlocked.',
      });
    }
    if (!automaticApiChecks && licensing.mode !== 'local-demo' && licensing.mode !== 'static-demo') {
      return setLicenseState({
        mode: licensing.mode || 'public-beta',
        status: 'active',
        plan: '599',
        expiresAt: null,
        loginRequired: !!licensing.loginRequired,
        message: 'Automatic license checks are paused to reduce Vercel Function Invocations.',
      });
    }
    return refreshLicenseStatus();
  }

  global.BuildPlanLicense = {
    getLicenseConfig,
    getLicenseState,
    isLicenseActive,
    isFeatureEnabled,
    getSessionStatus,
    startCheckout,
    refreshLicenseStatus,
    initializeLicenseGate,
  };
})(window);
