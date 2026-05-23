// BuildPlan Pro auth adapter.
// Keeps browser login/session state separate from scheduling logic.
(function bootstrapBuildPlanAuth(global) {
  const config = global.BuildPlanConfig || {};
  const authConfig = config.auth || {};
  const tokenStorageKey = authConfig.tokenStorageKey || 'buildplan_auth_token';
  const refreshStorageKey = authConfig.refreshStorageKey || 'buildplan_refresh_token';

  let sessionState = {
    authenticated: false,
    configured: false,
    user: null,
    checkedAt: null,
    message: '',
  };

  function getAccessToken() {
    try {
      return global.localStorage?.getItem(tokenStorageKey) || '';
    } catch (error) {
      return '';
    }
  }

  function setAccessToken(token) {
    if (!token) return clearAccessToken();
    global.localStorage?.setItem(tokenStorageKey, token);
    return token;
  }

  function setRefreshToken(token) {
    if (!token) return;
    global.localStorage?.setItem(refreshStorageKey, token);
  }

  function clearAccessToken() {
    global.localStorage?.removeItem(tokenStorageKey);
    global.localStorage?.removeItem(refreshStorageKey);
    sessionState = { ...sessionState, authenticated: false, user: null, message: 'Signed out' };
    publishSessionState();
  }

  function getSessionState() {
    return { ...sessionState, user: sessionState.user ? { ...sessionState.user } : null };
  }

  function publishSessionState() {
    global.dispatchEvent?.(new CustomEvent('buildplan:auth-state', { detail: getSessionState() }));
  }

  async function requestJson(url, options = {}) {
    const token = getAccessToken();
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || 'Auth request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function requestEmailOtp(email) {
    const endpoint = authConfig.endpoints?.startOtp || '';
    if (!endpoint) throw new Error('Login code endpoint is not configured');
    return requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async function verifyEmailOtp(email, token) {
    const endpoint = authConfig.endpoints?.verifyOtp || '';
    if (!endpoint) throw new Error('Login verify endpoint is not configured');
    const payload = await requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    });
    if (payload.accessToken) setAccessToken(payload.accessToken);
    if (payload.refreshToken) setRefreshToken(payload.refreshToken);
    sessionState = {
      authenticated: !!payload.authenticated,
      configured: payload.configured !== false,
      user: payload.user || null,
      checkedAt: new Date().toISOString(),
      message: payload.authenticated ? 'Signed in' : (payload.message || ''),
    };
    publishSessionState();
    return getSessionState();
  }

  async function refreshSession() {
    const endpoint = authConfig.endpoints?.session || config.licensing?.endpoints?.session || '';
    if (!endpoint) {
      sessionState = {
        authenticated: config.licensing?.loginRequired !== true,
        configured: false,
        user: null,
        checkedAt: new Date().toISOString(),
        message: 'Auth endpoint is not configured',
      };
      publishSessionState();
      return getSessionState();
    }
    try {
      const payload = await requestJson(endpoint);
      sessionState = {
        authenticated: !!payload.authenticated,
        configured: payload.configured !== false,
        user: payload.user || null,
        checkedAt: new Date().toISOString(),
        message: payload.message || '',
      };
    } catch (error) {
      sessionState = {
        authenticated: false,
        configured: error.status !== 501,
        user: null,
        checkedAt: new Date().toISOString(),
        message: error.message,
      };
    }
    publishSessionState();
    return getSessionState();
  }

  function getAuthorizationHeaders() {
    const token = getAccessToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  global.BuildPlanAuth = {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    getSessionState,
    requestEmailOtp,
    verifyEmailOtp,
    refreshSession,
    getAuthorizationHeaders,
  };
})(window);
