// แผนงาน app shell: routes Home and Workspace without changing the planner internals.
(function bootstrapBuildPlanAppShell(global) {
  const routes = ['home', 'login', 'programs', 'billing', 'user-dashboard', 'admin-dashboard', 'workspace'];
  let currentRoute = 'home';

  function getRoute() {
    return currentRoute;
  }

  function normalizeRoute(route) {
    return routes.includes(route) ? route : 'home';
  }

  function setMessage(message) {
    const output = global.document?.getElementById('login-status-message');
    if (output) output.textContent = message || '';
  }

  function setText(id, value) {
    const element = global.document?.getElementById(id);
    if (element) element.textContent = value || '';
  }

  function setDataset(id, name, value) {
    const element = global.document?.getElementById(id);
    if (element?.dataset) element.dataset[name] = value || '';
  }

  function describeReadiness(readiness) {
    if (readiness?.betaConfigured || readiness?.configured) {
      return {
        status: readiness?.paidConfigured ? 'พร้อมใช้งานจริง' : 'พร้อมใช้ Public Beta',
        tone: 'ready',
        detail: readiness?.paidConfigured ? 'เชื่อมต่อ Supabase / Stripe แล้ว สามารถเปิดใช้ Login, Cloud Save และ Subscription ได้' : 'เชื่อมต่อ Supabase แล้ว สามารถเปิดสมัครสมาชิก Public Beta และ Cloud Save ได้',
        loginHint: 'ระบบพร้อมส่ง Email OTP ผ่าน Supabase Auth',
      };
    }
    const missingCount = Array.isArray(readiness?.missing) ? readiness.missing.length : 0;
    const supabaseMissing = readiness?.envStatus?.supabase?.missing?.length || 0;
    const stripeMissing = readiness?.envStatus?.stripe?.missing?.length || 0;
    const appMissing = readiness?.envStatus?.app?.missing?.length || 0;
    const groupText = missingCount
      ? 'ขาด Supabase ' + supabaseMissing + ', Stripe ' + stripeMissing + ', App ' + appMissing + ' รายการ'
      : 'ยังไม่เชื่อมต่อ Env สำหรับระบบขายจริง';
    return {
      status: 'โหมดทดลอง',
      tone: 'demo',
      detail: groupText + ' แต่เปิดทดลองและจัดทำแผนงานได้',
      loginHint: 'ยังไม่เปิดใช้ Email OTP จริง ให้กดปุ่ม Demo เพื่อเข้า Workspace ระหว่างทดสอบ',
    };
  }

  function renderSetupPanel(readiness) {
    const summary = global.document?.getElementById('app-shell-setup-summary');
    const groups = global.document?.getElementById('app-shell-setup-groups');
    const actions = global.document?.getElementById('app-shell-setup-actions');
    if (!summary || !groups || !actions) return;

    const envStatus = readiness?.envStatus || {};
    const missingCount = Array.isArray(readiness?.missing) ? readiness.missing.length : 0;
    summary.textContent = readiness?.configured
      ? 'พร้อมเปิดระบบสมาชิกและชำระเงินจริง'
      : 'ยังขาด Env ' + missingCount + ' รายการก่อนเปิดขายจริง';

    const labels = {
      app: 'App URL',
      supabase: 'Supabase',
      stripe: 'Stripe',
    };
    groups.innerHTML = ['app', 'supabase', 'stripe'].map((key) => {
      const group = envStatus[key] || { readyCount: 0, totalCount: key === 'stripe' ? 4 : key === 'supabase' ? 3 : 1, missing: [] };
      const complete = group.readyCount === group.totalCount;
      const missing = Array.isArray(group.missing) && group.missing.length ? group.missing.join(', ') : 'ครบแล้ว';
      return [
        '<div class="app-shell-setup-group" data-ready="' + (complete ? 'true' : 'false') + '">',
        '<div class="app-shell-setup-group-top">',
        '<span>' + labels[key] + '</span>',
        '<strong>' + (group.readyCount || 0) + '/' + (group.totalCount || 0) + '</strong>',
        '</div>',
        '<div class="app-shell-setup-missing">' + missing + '</div>',
        '</div>',
      ].join('');
    }).join('');

    const nextActions = Array.isArray(readiness?.nextActions) ? readiness.nextActions : [];
    actions.innerHTML = nextActions.length
      ? nextActions.map((item) => '<li>' + item + '</li>').join('')
      : '<li>ระบบพร้อมแล้ว ให้ทดสอบบัญชีจริงและเปิดรับชำระเงิน</li>';
  }

  function toggleSetupPanel(force) {
    const panel = global.document?.getElementById('app-shell-setup-panel');
    if (!panel) return;
    const shouldShow = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !shouldShow);
    if (shouldShow) renderSetupPanel(global.BuildPlanSaaS?.getReadinessState?.());
  }

  function applyReadiness(readiness) {
    const info = describeReadiness(readiness || global.BuildPlanSaaS?.getReadinessState?.());
    setText('app-shell-saas-status', info.status);
    setText('app-shell-saas-detail', info.detail);
    setText('login-readiness-hint', info.loginHint);
    setDataset('app-shell-saas-card', 'tone', info.tone);
    setDataset('login-demo-notice', 'tone', info.tone);
    renderSetupPanel(readiness || global.BuildPlanSaaS?.getReadinessState?.());
    if (global.document?.body?.dataset) {
      global.document.body.dataset.saasMode = info.tone;
    }
  }

  async function refreshShellReadiness() {
    if (global.BuildPlanSaaS?.shouldUseAutomaticApiChecks?.() !== true) {
      const cached = global.BuildPlanSaaS?.getReadinessState?.() || {};
      const fallback = {
        configured: false,
        mode: 'api-checks-paused',
        missing: [],
        message: 'Automatic backend readiness checks are paused to reduce Vercel Function Invocations.',
        checkedAt: new Date().toISOString(),
        ...cached,
      };
      applyReadiness(fallback);
      return fallback;
    }
    try {
      const readiness = await global.BuildPlanSaaS?.refreshReadiness?.();
      applyReadiness(readiness);
      return readiness;
    } catch (error) {
      applyReadiness({ configured: false, missing: [], message: error.message });
      return null;
    }
  }

  const workspaceElementIds = [
    'top-ribbon',
    'project-info-header',
    'gantt-page',
    'dashboard-page',
    'actual-page',
    'cost-page',
    'duration-page',
    'signature-section',
  ];

  function setDisplay(id, display) {
    const element = global.document?.getElementById(id);
    if (element?.style) element.style.display = display;
  }

  function setClassDisplay(selector, display) {
    const elements = global.document?.querySelectorAll?.(selector) || [];
    for (const element of elements) {
      if (element?.style) element.style.display = display;
    }
  }

  function applyRouteVisibility(route) {
    setDisplay('app-home-page', route === 'home' ? 'flex' : 'none');
    setDisplay('app-login-page', route === 'login' ? 'flex' : 'none');
    setDisplay('ct-program-selector', ['programs', 'billing'].includes(route) ? 'flex' : 'none');
    setDisplay('ct-user-dashboard', route === 'user-dashboard' ? 'flex' : 'none');
    setDisplay('ct-admin-dashboard', route === 'admin-dashboard' ? 'flex' : 'none');
    const workspaceDisplay = route === 'workspace' ? '' : 'none';
    for (const id of workspaceElementIds) setDisplay(id, workspaceDisplay);
    setClassDisplay('.sig-toggle-wrapper', workspaceDisplay);
  }

  function syncRouteButtons() {
    const activeRoute = getRoute();
    for (const id of ['btn-home-open-workspace', 'btn-home-login', 'btn-login-back-home', 'btn-login-open-workspace', 'btn-workspace-back-home']) {
      const button = global.document?.getElementById(id);
      if (button) button.dataset.activeRoute = activeRoute;
    }
  }

  function navigateTo(route) {
    currentRoute = normalizeRoute(route);
    if (global.document?.body) {
      global.document.body.dataset.appRoute = currentRoute;
    }
    applyRouteVisibility(currentRoute);
    if (global.location && global.location.hash !== '#' + currentRoute) {
      try {
        global.history?.replaceState?.(null, '', '#' + currentRoute);
      } catch (error) {
        global.location.hash = currentRoute;
      }
    }
    syncRouteButtons();
    const chatbot = global.document?.getElementById('ct-help-chatbot');
    if (chatbot?.style) chatbot.style.display = ['programs', 'billing', 'user-dashboard', 'admin-dashboard'].includes(currentRoute) ? 'block' : 'none';
    const billingModal = global.document?.getElementById('ct-billing-modal');
    if (billingModal) billingModal.hidden = currentRoute !== 'billing';
    global.dispatchEvent?.(new CustomEvent('buildplan:app-route', { detail: { route: currentRoute } }));
    return currentRoute;
  }

  function navigateHome() {
    return navigateTo('home');
  }

  function navigateLogin() {
    return navigateTo('login');
  }

  function setFieldValue(id, value) {
    const element = global.document?.getElementById(id);
    if (!element) return;
    element.value = value || '';
    element.dispatchEvent?.(new Event('input', { bubbles: true }));
    element.dispatchEvent?.(new Event('change', { bubbles: true }));
  }

  function getFieldValue(id) {
    return global.document?.getElementById(id)?.value || '';
  }

  function fillProjectStartPopup() {
    setFieldValue('project-popup-name', getFieldValue('proj-name'));
    setFieldValue('project-popup-contract-no', getFieldValue('proj-contract-no'));
    setFieldValue('project-popup-owner', getFieldValue('proj-owner'));
    setFieldValue('project-popup-duration', getFieldValue('header-duration-input'));
    setFieldValue('project-popup-location', getFieldValue('proj-location'));
    setFieldValue('project-popup-value', getFieldValue('project-value'));
    setFieldValue('project-popup-contractor', getFieldValue('proj-contractor'));
    setFieldValue('project-popup-supervisor', getFieldValue('proj-supervisor'));
    const status = global.document?.getElementById('project-popup-user-status');
    if (status) status.textContent = 'Signed in / Active subscription';
  }

  function openProjectStartPopup() {
    const popup = global.document?.getElementById('project-start-popup');
    if (!popup) return navigateTo('workspace');
    fillProjectStartPopup();
    popup.hidden = false;
    popup.setAttribute('aria-hidden', 'false');
    global.document?.body?.classList?.add('project-start-open');
    global.document?.getElementById('project-popup-name')?.focus?.();
    return 'project-popup';
  }

  function closeProjectStartPopup() {
    const popup = global.document?.getElementById('project-start-popup');
    if (!popup) return;
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    global.document?.body?.classList?.remove('project-start-open');
  }

  function showWorkspaceWelcomeAlert() {
    const payload = { icon: 'success', title: 'ยินดีต้อนรับเข้าสู่ BuildPlan Pro', text: '', timer: 1500 };
    if (typeof global.showAppAlert === 'function') {
      global.showAppAlert(payload);
      return;
    }
    if (global.Swal?.fire) {
      global.Swal.fire({ ...payload, showConfirmButton: false, timerProgressBar: true });
    }
  }

  function applyProjectStartForm() {
    setFieldValue('proj-name', getFieldValue('project-popup-name'));
    setFieldValue('proj-contract-no', getFieldValue('project-popup-contract-no'));
    setFieldValue('proj-owner', getFieldValue('project-popup-owner'));
    setFieldValue('header-duration-input', getFieldValue('project-popup-duration'));
    setFieldValue('proj-location', getFieldValue('project-popup-location'));
    setFieldValue('project-value', getFieldValue('project-popup-value'));
    setFieldValue('proj-contractor', getFieldValue('project-popup-contractor'));
    setFieldValue('proj-supervisor', getFieldValue('project-popup-supervisor'));
    closeProjectStartPopup();
    const route = navigateTo('workspace');
    global.renderUI?.();
    global.scheduleAutoSave?.();
    showWorkspaceWelcomeAlert();
    setMessage('');
    return route;
  }

  function navigateWorkspace(options = {}) {
    if (!options.skipProjectPopup) return openProjectStartPopup();
    const route = navigateTo('workspace');
    setMessage('');
    return route;
  }

  function getLoginValues() {
    return {
      email: global.document?.getElementById('login-email')?.value?.trim() || '',
      code: global.document?.getElementById('login-code')?.value?.trim() || '',
    };
  }

  function setSignupMessage(message) {
    const output = global.document?.getElementById('signup-status-message');
    if (output) output.textContent = message || '';
  }

  function isMemberSignupEnabled() {
    const readiness = global.BuildPlanSaaS?.getReadinessState?.();
    if (readiness?.betaConfigured || readiness?.configured) return true;
    const supabase = readiness?.envStatus?.supabase;
    if (supabase?.complete === true || readiness?.supabase?.url === true) return true;
    const config = global.BuildPlanConfig || {};
    return config.licensing?.mode === 'public-beta'
      && !!config.auth?.endpoints?.startOtp
      && !!config.auth?.endpoints?.verifyOtp;
  }

  function getSignupProfile() {
    const email = global.document?.getElementById('signup-email')?.value?.trim() || '';
    return {
      email,
      fullName: global.document?.getElementById('signup-full-name')?.value?.trim() || '',
      phone: global.document?.getElementById('signup-phone')?.value?.trim() || '',
      organization: global.document?.getElementById('signup-organization')?.value?.trim() || '',
      role: global.document?.getElementById('signup-role')?.value || 'engineer',
      betaSource: 'public-signup',
    };
  }

  function openSignup() {
    const modal = global.document?.getElementById('member-signup-modal');
    if (!modal) return navigateLogin();
    modal.classList.replace('hidden', 'flex');
    modal.setAttribute('aria-hidden', 'false');
    setSignupMessage(isMemberSignupEnabled() ? 'กรอกข้อมูลสมาชิก แล้วกดส่งรหัส OTP ไปยังอีเมล' : 'ระบบสมาชิกยังไม่เปิดใช้งาน');
    global.document?.getElementById('signup-full-name')?.focus?.();
    return 'signup';
  }

  function closeSignup() {
    const modal = global.document?.getElementById('member-signup-modal');
    if (!modal) return;
    modal.classList.replace('flex', 'hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function submitSignupProfile() {
    if (!isMemberSignupEnabled()) {
      setSignupMessage('ระบบสมาชิกยังไม่เปิดใช้งาน');
      return { ok: false, message: 'ระบบสมาชิกยังไม่เปิดใช้งาน' };
    }
    const memberProfile = getSignupProfile();
    if (!memberProfile.email || !memberProfile.fullName) {
      setSignupMessage('กรุณากรอกชื่อ-นามสกุลและอีเมล');
      return { ok: false, message: 'Missing member profile' };
    }
    setSignupMessage('กำลังส่งรหัส OTP...');
    try {
      const result = await global.BuildPlanAuth?.requestEmailOtp?.(memberProfile.email, memberProfile, true);
      setSignupMessage(result?.message || 'ส่งรหัส OTP แล้ว กรุณาตรวจอีเมล');
      return result;
    } catch (error) {
      setSignupMessage(error.message || 'ไม่สามารถส่งรหัส OTP ได้');
      return { ok: false, message: error.message };
    }
  }

  async function verifySignupCode() {
    if (!isMemberSignupEnabled()) {
      setSignupMessage('ระบบสมาชิกยังไม่เปิดใช้งาน');
      return { authenticated: false, message: 'ระบบสมาชิกยังไม่เปิดใช้งาน' };
    }
    const memberProfile = getSignupProfile();
    const code = global.document?.getElementById('signup-otp-code')?.value?.trim() || '';
    setSignupMessage('กำลังยืนยันสมาชิก...');
    try {
      const session = await global.BuildPlanAuth?.verifyEmailOtp?.(memberProfile.email, code, memberProfile);
      if (session?.authenticated) {
        setSignupMessage('สมัครสมาชิกสำเร็จ กำลังเปิดแผนงาน...');
        closeSignup();
        navigateWorkspace();
      } else {
        setSignupMessage(session?.message || 'ยืนยันสมาชิกแล้ว');
      }
      return session;
    } catch (error) {
      setSignupMessage(error.message || 'ไม่สามารถยืนยันรหัส OTP ได้');
      return { authenticated: false, message: error.message };
    }
  }

  async function sendLoginCode() {
    const { email } = getLoginValues();
    setMessage('Sending login code...');
    try {
      const result = await global.BuildPlanAuth?.requestEmailOtp?.(email);
      setMessage(result?.message || 'Login code sent. Check your email.');
      return result;
    } catch (error) {
      setMessage(error.message || 'Unable to send login code.');
      return { ok: false, message: error.message };
    }
  }

  function setCheckoutMessage(message) {
    const output = global.document?.getElementById('checkout-status-message');
    if (output) output.textContent = message || '';
  }

  function formatCheckoutError(error) {
    const payload = error?.payload || {};
    if (Array.isArray(payload.missing) && payload.missing.length) {
      return (payload.area || 'Checkout') + ': ขาด ' + payload.missing.join(', ');
    }
    return error?.message || 'Checkout request failed';
  }

  async function startCheckout(plan) {
    setCheckoutMessage('กำลังเตรียมหน้า checkout...');
    try {
      const result = await global.BuildPlanLicense?.startCheckout?.(plan);
      if (result?.checkoutUrl) {
        setCheckoutMessage('กำลังเปิด Stripe Checkout...');
        global.location.href = result.checkoutUrl;
      } else {
        setCheckoutMessage(result?.message || 'Checkout ยังไม่พร้อมใช้งาน');
      }
      return result;
    } catch (error) {
      const message = formatCheckoutError(error);
      setCheckoutMessage(message);
      return { ok: false, message, payload: error?.payload || null };
    }
  }

  async function verifyLoginCode() {
    const { email, code } = getLoginValues();
    setMessage('Verifying login code...');
    try {
      const session = await global.BuildPlanAuth?.verifyEmailOtp?.(email, code);
      if (session?.authenticated) {
        setMessage('Signed in. Opening workspace...');
        navigateWorkspace();
      } else {
        setMessage(session?.message || 'Verification completed.');
      }
      return session;
    } catch (error) {
      setMessage(error.message || 'Unable to verify login code.');
      return { authenticated: false, message: error.message };
    }
  }

  function bindButton(id, handler) {
    const button = global.document?.getElementById(id);
    if (button) button.addEventListener('click', handler);
  }

  function initializeAppShell() {
    bindButton('btn-home-open-workspace', navigateWorkspace);
    bindButton('btn-home-login', navigateWorkspace);
    bindButton('btn-home-signup', openSignup);
    bindButton('btn-hero-signup', openSignup);
    bindButton('btn-login-panel-signup', openSignup);
    bindButton('member-signup-close', closeSignup);
    bindButton('btn-signup-send-code', submitSignupProfile);
    bindButton('btn-signup-verify-code', verifySignupCode);
    bindButton('btn-signup-go-login', () => {
      closeSignup();
      navigateLogin();
    });
    bindButton('btn-home-open-setup', () => toggleSetupPanel(true));
    bindButton('btn-home-close-setup', () => toggleSetupPanel(false));
    bindButton('btn-login-back-home', navigateHome);
    bindButton('btn-workspace-back-home', navigateHome);
    bindButton('btn-login-open-workspace', navigateWorkspace);
    bindButton('btn-login-send-code', sendLoginCode);
    bindButton('btn-login-verify-code', verifyLoginCode);
    bindButton('btn-checkout-monthly', () => startCheckout('monthly'));
    bindButton('btn-checkout-yearly', () => startCheckout('yearly'));
    const projectForm = global.document?.getElementById('project-start-form');
    if (projectForm && projectForm.dataset.bound !== '1') {
      projectForm.dataset.bound = '1';
      projectForm.addEventListener('submit', (event) => {
        event.preventDefault();
        applyProjectStartForm();
      });
    }
    const closeButtons = global.document?.querySelectorAll?.('[data-project-popup-close]') || [];
    closeButtons.forEach((button) => button.addEventListener('click', closeProjectStartPopup));
    global.addEventListener?.('buildplan:saas-readiness', (event) => applyReadiness(event.detail));
    applyReadiness(global.BuildPlanSaaS?.getReadinessState?.());
    refreshShellReadiness();
    const initialHash = String(global.location?.hash || '').replace(/^#/, '');
    navigateTo(normalizeRoute(initialHash || 'home'));
  }

  global.BuildPlanAppShell = {
    getRoute,
    navigateTo,
    navigateHome,
    navigateLogin,
    navigateWorkspace,
    openProjectStartPopup,
    applyProjectStartForm,
    closeProjectStartPopup,
    sendLoginCode,
    verifyLoginCode,
    openSignup,
    submitSignupProfile,
    verifySignupCode,
    startCheckout,
    applyReadiness,
    refreshShellReadiness,
    toggleSetupPanel,
    initializeAppShell,
  };

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initializeAppShell);
  } else {
    initializeAppShell();
  }
})(window);
