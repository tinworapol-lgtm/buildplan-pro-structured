// BuildPlan Pro auth adapter.
// Keeps browser login/session state separate from scheduling logic.
(function bootstrapBuildPlanAuth(global) {
  const config = global.BuildPlanConfig || {};
  const authConfig = config.auth || {};
  const staticDemoMode = config.licensing?.mode === 'static-demo' || authConfig.provider === 'static-demo';
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

  function formatAuthError(payload = {}, status = 0) {
    const rawMessage = String(payload.message || payload.msg || payload.error_description || 'Auth request failed');
    const code = String(payload.code || payload.error_code || '');
    if (status === 429 || code === 'email_rate_limit_exceeded' || /rate limit/i.test(rawMessage)) {
      return 'ส่งอีเมลยืนยันถี่เกินไป กรุณารอประมาณ 5-10 นาที แล้วค่อยกดส่งใหม่';
    }
    if (/otp_expired|expired|invalid/i.test(code + ' ' + rawMessage)) {
      return 'ลิงก์หรือรหัสหมดอายุแล้ว กรุณากดส่งอีเมลใหม่อีกครั้ง';
    }
    return rawMessage;
  }

  function parseUrlParams(rawValue) {
    const raw = String(rawValue || '').replace(/^[#?]/, '');
    const params = {};
    if (!raw) return { get() { return ''; } };
    for (const pair of raw.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (!key) continue;
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
    return {
      get(name) {
        return params[name] || '';
      },
    };
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
      const error = new Error(formatAuthError(payload, response.status));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function requestEmailOtp(email, memberProfile = null, signupMode = false) {
    const endpoint = authConfig.endpoints?.startOtp || '';
    if (!endpoint) throw new Error('Login code endpoint is not configured');
    return requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, memberProfile, signupMode }),
    });
  }

  async function verifyEmailOtp(email, token, memberProfile = null) {
    const endpoint = authConfig.endpoints?.verifyOtp || '';
    if (!endpoint) throw new Error('Login verify endpoint is not configured');
    const payload = await requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, memberProfile }),
    });
    if (payload.accessToken) setAccessToken(payload.accessToken);
    if (payload.refreshToken) setRefreshToken(payload.refreshToken);
    sessionState = {
      authenticated: !!payload.authenticated,
      configured: payload.configured !== false,
      user: payload.user || null,
      memberProfile: payload.memberProfile || null,
      checkedAt: new Date().toISOString(),
      message: payload.authenticated ? 'Signed in' : (payload.message || ''),
    };
    publishSessionState();
    return getSessionState();
  }

  function acceptAuthCallback() {
    const hashParams = parseUrlParams(global.location?.hash || '');
    const searchParams = parseUrlParams(global.location?.search || '');
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code') || '';
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description') || '';
    if (errorCode || errorDescription) {
      sessionState = {
        authenticated: false,
        configured: true,
        user: null,
        memberProfile: null,
        checkedAt: new Date().toISOString(),
        message: formatAuthError({ error_code: errorCode, error_description: errorDescription }, 400),
      };
      publishSessionState();
      return getSessionState();
    }

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || '';
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';
    if (!accessToken) return null;

    setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    try {
      global.history?.replaceState?.(null, '', global.location.origin + global.location.pathname + '#workspace');
    } catch (error) {
      // Best effort only. Token storage already succeeded.
    }
    return refreshSession();
  }

  async function refreshSession() {
    const endpoint = authConfig.endpoints?.session || config.licensing?.endpoints?.session || '';
    if (staticDemoMode || !endpoint) {
      sessionState = {
        authenticated: config.licensing?.loginRequired !== true,
        configured: !staticDemoMode,
        user: null,
        memberProfile: null,
        checkedAt: new Date().toISOString(),
        message: staticDemoMode ? 'Static demo mode' : 'Auth endpoint is not configured',
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
        memberProfile: payload.memberProfile || null,
        checkedAt: new Date().toISOString(),
        message: payload.message || '',
      };
    } catch (error) {
      sessionState = {
        authenticated: false,
        configured: error.status !== 501,
        user: null,
        memberProfile: null,
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
    acceptAuthCallback,
    requestEmailOtp,
    verifyEmailOtp,
    refreshSession,
    getAuthorizationHeaders,
  };
})(window);
