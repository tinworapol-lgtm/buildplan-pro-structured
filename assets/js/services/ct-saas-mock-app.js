// Mock Construction Tech SaaS flow for frontend-only subscription, role, and module permission demos.
(function bootstrapConstructionSaaSMock(global) {
  const storageKey = 'buildplan.ctSaasMockState.v1';
  const publicFreeAccess = global.BuildPlanConfig?.licensing?.publicFreeAccess === true;
  const unlockedPlan = publicFreeAccess ? '599' : null;

  const plans = {
    Free: { users: 1, storage: '50 MB', price: 0, label: 'Free' },
    199: { users: 3, storage: '2 GB', price: 199, label: '199' },
    599: { users: 10, storage: '100 GB', price: 599, label: '599' },
  };

  const planOrder = ['Free', '199', '599'];

  const modulePermissions = {
    'construction-control': ['Free', '199', '599'],
    boq: ['199', '599'],
    'daily-report': ['199', '599'],
    'executive-dashboard': ['599'],
    'ai-assistant': ['599'],
  };

  const workspaceFeatureRules = {
    dashboard: { minPlan: '599', label: 'Executive Dashboard' },
    'actual-progress': { minPlan: '599', label: 'Actual Progress Tracking' },
    'cost-scurve': { minPlan: '199', label: 'มูลค่าโครงการ / S-Curve' },
    'duration-planning': { minPlan: '599', label: 'การคำนวณระยะเวลางาน' },
    gantt: { minPlan: 'Free', label: 'แผนงาน Gantt' },
    'new-plan': { minPlan: 'Free', label: 'สร้างแผนงานใหม่' },
  };

  const modules = [
    {
      id: 'construction-control',
      title: 'ควบคุมงานก่อสร้าง',
      icon: 'fa-building-shield',
      description: 'ติดตามความคืบหน้า งาน ปริมาณงาน และงบประมาณแบบเรียลไทม์',
      accent: 'green',
    },
    {
      id: 'boq',
      title: 'ราคากลาง / BOQ',
      icon: 'fa-calculator',
      description: 'จัดทำ BOQ และราคากลาง คำนวณต้นทุนและประมาณการอย่างแม่นยำ',
      accent: 'green',
    },
    {
      id: 'daily-report',
      title: 'รายงานหน้างาน',
      icon: 'fa-clock-rotate-left',
      description: 'บันทึกรายงานประจำวัน ปัญหา อุปสรรค และรูปภาพจากหน้างาน',
      accent: 'green',
    },
    {
      id: 'executive-dashboard',
      title: 'Dashboard ผู้บริหาร',
      icon: 'fa-chart-pie',
      description: 'ภาพรวมผู้บริหาร วิเคราะห์โครงการ และ KPI สำคัญ',
      accent: 'locked',
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      icon: 'fa-robot',
      description: 'ผู้ช่วยอัจฉริยะ แนะนำงาน ค้นหาข้อมูล และสรุปรายงานอย่างรวดเร็ว',
      accent: 'orange',
    },
  ];

  const state = {
    user: null,
    role: 'guest',
    plan: '599',
    selectedModule: 'construction-control',
    billingCycle: 'monthly',
    subscription: {
      scenario: 'active',
      cycle: 'monthly',
      expiresAt: '2026-06-22',
      locked: false,
    },
  };

  function qs(selector, root = global.document) {
    return root?.querySelector?.(selector) || null;
  }

  function qsa(selector, root = global.document) {
    return Array.from(root?.querySelectorAll?.(selector) || []);
  }

  function persist() {
    try {
      global.localStorage?.setItem(storageKey, JSON.stringify({
        plan: state.plan,
        billingCycle: state.billingCycle,
        subscription: state.subscription,
      }));
    } catch (_error) {}
  }

  function restore() {
    try {
      const saved = JSON.parse(global.localStorage?.getItem(storageKey) || '{}');
      if (saved.plan && plans[saved.plan]) state.plan = saved.plan;
      if (saved.billingCycle) state.billingCycle = saved.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      if (saved.subscription) state.subscription = { ...state.subscription, ...saved.subscription };
    } catch (_error) {}
    if (publicFreeAccess) {
      state.plan = unlockedPlan;
      state.subscription = {
        ...state.subscription,
        scenario: 'active',
        expiresAt: '2026-08-30',
        locked: false,
      };
    }
  }

  function navigate(route) {
    global.BuildPlanAppShell?.navigateTo?.(route);
  }

  function getToday() {
    return new Date('2026-05-22T00:00:00+07:00');
  }

  function daysLeft() {
    const end = new Date(state.subscription.expiresAt + 'T00:00:00+07:00');
    return Math.ceil((end - getToday()) / 86400000);
  }

  function subscriptionTone() {
    const days = daysLeft();
    if (state.subscription.locked || days < 0) return 'expired';
    if (days <= 7) return 'warning';
    return 'active';
  }

  function isSubscriptionActive() {
    if (publicFreeAccess) return true;
    return subscriptionTone() !== 'expired';
  }

  function canUse(module) {
    if (publicFreeAccess) return true;
    return isSubscriptionActive() && (modulePermissions[module.id] || []).includes(state.plan);
  }

  function planRank(plan) {
    const index = planOrder.indexOf(plan);
    return index < 0 ? 0 : index;
  }

  function isFeatureAllowedForPlan(feature, plan = state.plan) {
    if (publicFreeAccess) return true;
    const rule = workspaceFeatureRules[feature];
    if (!rule) return isSubscriptionActive();
    return isSubscriptionActive() && planRank(plan) >= planRank(rule.minPlan);
  }

  function showPackageUpgradeAlert(feature) {
    const rule = workspaceFeatureRules[feature] || { minPlan: '599', label: feature };
    const message = isSubscriptionActive()
      ? `${rule.label} ต้องใช้แพ็กเกจ ${rule.minPlan} ขึ้นไป`
      : 'สมาชิกหมดอายุ กรุณาต่ออายุก่อนใช้งาน';
    showBlocked(message, isSubscriptionActive() ? 'ต้องอัปเกรดแพ็กเกจ' : 'สมาชิกหมดอายุ');
    if (!isFeatureAllowedForPlan(feature)) openBilling();
  }

  function formatThaiDate(isoDate) {
    const date = new Date(isoDate + 'T00:00:00+07:00');
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function setSubscriptionScenario(scenario) {
    if (publicFreeAccess) {
      state.plan = unlockedPlan;
      state.subscription.scenario = 'active';
      state.subscription.expiresAt = '2026-08-30';
      state.subscription.locked = false;
      persist();
      renderAll();
      return;
    }
    state.subscription.scenario = scenario;
    if (scenario === 'active') {
      state.subscription.expiresAt = '2026-06-22';
      state.subscription.locked = false;
    } else if (scenario === 'warning') {
      state.subscription.expiresAt = '2026-05-27';
      state.subscription.locked = false;
    } else {
      state.subscription.expiresAt = '2026-05-18';
      state.subscription.locked = true;
    }
    persist();
    renderAll();
  }

  function renewSubscription(options = {}) {
    state.subscription.scenario = 'active';
    state.subscription.expiresAt = '2026-06-22';
    state.subscription.locked = false;
    persist();
    renderAll();
    if (!options.silent && global.Swal?.fire) {
      global.Swal.fire({
        icon: 'success',
        title: 'ต่ออายุสำเร็จในโหมด Demo',
        text: 'เมื่อเชื่อม Stripe จริง ปุ่มนี้จะพาไป Checkout หรือ Customer Portal',
        confirmButtonText: 'รับทราบ',
      });
    }
  }

  function renderPlanLabels() {
    qsa('[data-ct-current-plan]').forEach((item) => {
      item.textContent = state.plan;
    });
    qsa('[data-ct-plan-select]').forEach((select) => {
      select.value = state.plan;
    });
    qsa('[data-ct-plan-users]').forEach((item) => {
      item.textContent = String(plans[state.plan]?.users || '');
    });
    qsa('[data-ct-plan-storage]').forEach((item) => {
      item.textContent = plans[state.plan]?.storage || '';
    });
  }

  function renderSubscription() {
    const tone = publicFreeAccess ? 'active' : subscriptionTone();
    const labels = {
      active: { text: 'ใช้งานได้', badge: 'Active' },
      warning: { text: 'ใกล้หมดอายุ', badge: 'Due soon' },
      expired: { text: 'หมดอายุ / ถูกล็อก', badge: 'Locked' },
    };
    if (publicFreeAccess) labels.active = { text: 'ทดลองใช้ฟรีเต็มฟังก์ชัน 599', badge: 'Full 599 Free' };
    qsa('[data-ct-subscription-status]').forEach((item) => {
      item.textContent = labels[tone].text;
    });
    qsa('[data-ct-subscription-expires]').forEach((item) => {
      item.textContent = formatThaiDate(state.subscription.expiresAt);
    });
    qsa('[data-ct-subscription-days]').forEach((item) => {
      item.textContent = publicFreeAccess ? 'ไม่จำกัด' : String(Math.max(daysLeft(), 0));
    });
    qsa('[data-ct-subscription-tone]').forEach((item) => {
      item.textContent = labels[tone].badge;
      item.dataset.ctSubscriptionTone = tone;
    });
    qsa('[data-ct-subscription-scenario]').forEach((button) => {
      button.dataset.active = button.dataset.ctSubscriptionScenario === state.subscription.scenario ? 'true' : 'false';
    });
    if (global.document?.body?.dataset) {
      global.document.body.dataset.ctSubscriptionTone = tone;
    }
  }

  function renderModules() {
    const grid = qs('#ct-module-grid');
    if (!grid) return;
    const tone = subscriptionTone();
    grid.innerHTML = modules.map((module) => {
      const planEnabled = publicFreeAccess || (modulePermissions[module.id] || []).includes(state.plan);
      const enabled = canUse(module);
      const lockText = tone === 'expired' ? 'สมาชิกหมดอายุ ต่ออายุก่อนใช้งาน' : 'ต้องใช้แพ็กเกจ ' + requiredPlanText(module.id);
      return [
        '<article class="ct-module-card" data-module-id="' + module.id + '" data-enabled="' + enabled + '" data-plan-enabled="' + planEnabled + '" data-accent="' + module.accent + '">',
        '<div class="ct-module-icon"><i class="fa-solid ' + module.icon + '"></i></div>',
        '<h3>' + module.title + '</h3>',
        '<p>' + module.description + '</p>',
        '<button type="button">' + (enabled ? '<i class="fa-solid fa-circle-check"></i> พร้อมใช้งาน' : '<i class="fa-solid fa-lock"></i> ' + lockText) + '</button>',
        '</article>',
      ].join('');
    }).join('');
  }

  function requiredPlanText(moduleId) {
    const allowed = modulePermissions[moduleId] || [];
    if (allowed.includes(state.plan)) return state.plan;
    if (allowed.includes('599')) return '599';
    if (allowed.includes('199')) return '199';
    return 'Free';
  }

  function renderAdminPermissions() {
    const body = qs('#ct-admin-permission-rows');
    if (!body) return;
    const planNames = planOrder;
    body.innerHTML = modules.map((module) => {
      const cells = planNames.map((plan) => {
        const ok = publicFreeAccess || (modulePermissions[module.id] || []).includes(plan);
        return '<td class="' + (ok ? 'ok' : 'locked') + '">' + (ok ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-lock"></i>') + '</td>';
      }).join('');
      return '<tr><td>' + module.title + '</td>' + cells + '</tr>';
    }).join('');
  }

  function applyWorkspaceFeatureLocks() {
    qsa('[data-plan-feature]').forEach((item) => {
      const feature = item.dataset.planFeature;
      const rule = workspaceFeatureRules[feature];
      const allowed = isFeatureAllowedForPlan(feature);
      item.dataset.planLocked = allowed ? 'false' : 'true';
      item.setAttribute('aria-disabled', allowed ? 'false' : 'true');
      if (rule) {
        item.title = allowed ? rule.label : `${rule.label} - ต้องใช้แพ็กเกจ ${rule.minPlan} ขึ้นไป`;
      }
    });
  }

  function renderAll() {
    renderPlanLabels();
    renderSubscription();
    renderModules();
    renderAdminPermissions();
    renderBilling();
    applyWorkspaceFeatureLocks();
  }

  function signIn(role) {
    state.role = role;
    state.user = {
      name: role === 'admin' ? 'กมลวรรณ ผู้ดูแลระบบ' : 'วิศวกร ธนวัฒน์',
      organization: 'บริษัท สร้างดี จำกัด',
    };
    persist();
    if (role === 'admin') navigate('admin-dashboard');
    else global.BuildPlanAppShell?.openProjectStartPopup?.();
  }

  function signOut() {
    state.user = null;
    state.role = 'guest';
    navigate('home');
  }

  function openBilling() {
    const modal = qs('#ct-billing-modal');
    if (!modal) return;
    renderBilling();
    modal.hidden = false;
    global.document?.body?.classList?.add('ct-billing-open');
  }

  function closeBilling() {
    const modal = qs('#ct-billing-modal');
    if (!modal) return;
    modal.hidden = true;
    global.document?.body?.classList?.remove('ct-billing-open');
  }

  function openSupport() {
    const modal = qs('#ct-support-modal');
    if (!modal) return;
    modal.hidden = false;
    global.document?.body?.classList?.add('ct-support-open');
  }

  function closeSupport() {
    const modal = qs('#ct-support-modal');
    if (!modal) return;
    modal.hidden = true;
    global.document?.body?.classList?.remove('ct-support-open');
  }

  function chooseSupportTier(button) {
    const amount = button?.dataset?.ctSupportAmount || '';
    const tier = button?.dataset?.ctSupportTier || 'Supporter';
    closeSupport();
    if (global.Swal?.fire) {
      global.Swal.fire({
        icon: 'info',
        title: `ขอบคุณสำหรับ ${tier} Supporter`,
        text: amount ? `รอบนี้เป็นตัวอย่าง ยังไม่ตัดเงินจริง ยอดสนับสนุน ${Number(amount).toLocaleString('th-TH')} บาทจะพร้อมใช้งานเมื่อเชื่อมระบบชำระเงินจริง` : 'รอบนี้เป็นตัวอย่าง ยังไม่ตัดเงินจริง',
        confirmButtonText: 'รับทราบ',
      });
    } else {
      global.alert?.('Supporter demo: ' + tier + (amount ? ' ' + amount + ' บาท' : ''));
    }
  }

  function setBillingCycle(cycle) {
    state.billingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
    persist();
    renderBilling();
  }

  function formatPrice(value) {
    return Number(value).toLocaleString('th-TH') + ' บาท';
  }

  function renderBilling() {
    qsa('[data-ct-billing-cycle]').forEach((button) => {
      button.dataset.active = button.dataset.ctBillingCycle === state.billingCycle ? 'true' : 'false';
    });
    qsa('.ct-billing-plan').forEach((card) => {
      card.dataset.current = card.dataset.plan === state.plan ? 'true' : 'false';
      const price = qs('strong', card);
      if (price?.dataset?.priceMonthly) {
        const amount = state.billingCycle === 'yearly' ? price.dataset.priceYearly : price.dataset.priceMonthly;
        price.textContent = formatPrice(amount);
      }
      const button = qs('[data-ct-choose-plan]', card);
      if (button) button.textContent = card.dataset.plan === state.plan ? 'แพ็กเกจปัจจุบัน' : 'เลือก ' + card.dataset.plan;
    });
  }

  function choosePlan(plan) {
    if (!plans[plan]) return;
    state.plan = publicFreeAccess ? unlockedPlan : plan;
    renewSubscription({ silent: true });
    closeBilling();
    if (global.Swal?.fire) {
      global.Swal.fire({
        icon: 'success',
        title: 'อัปเดตแพ็กเกจแล้ว',
        text: 'เปลี่ยนเป็นแพ็กเกจ ' + plan + ' แบบ ' + (state.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน') + ' ในโหมด Demo',
        confirmButtonText: 'รับทราบ',
      });
    }
  }

  function showBlocked(message, title = 'ยังเปิดใช้งานไม่ได้') {
    if (global.Swal?.fire) {
      global.Swal.fire({ icon: 'info', title, text: message, confirmButtonText: 'รับทราบ' });
    } else {
      global.alert?.(message);
    }
  }

  function openModule(moduleId) {
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;
    if (!isSubscriptionActive()) {
      showBlocked('สมาชิกหมดอายุแล้ว กรุณาต่ออายุก่อนใช้งานโมดูลนี้', 'สมาชิกหมดอายุ');
      openBilling();
      return;
    }
    if (!canUse(module)) {
      showBlocked(module.title + ' ต้องใช้แพ็กเกจ ' + requiredPlanText(module.id), 'ต้องอัปเกรดแพ็กเกจ');
      openBilling();
      return;
    }
    state.selectedModule = moduleId;
    persist();
    navigate('user-dashboard');
  }

  function toggleChat(force) {
    const panel = qs('#ct-help-chatbot .ct-chat-panel');
    if (!panel) return;
    const open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
  }

  function bind() {
    global.document?.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-plan-feature]');
      if (!target) return;
      const feature = target.dataset.planFeature;
      if (isFeatureAllowedForPlan(feature)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showPackageUpgradeAlert(feature);
    }, true);
    qsa('[data-ct-login-user]').forEach((button) => button.addEventListener('click', () => signIn('user')));
    qsa('[data-ct-login-admin]').forEach((button) => button.addEventListener('click', () => signIn('admin')));
    qsa('[data-ct-logout]').forEach((button) => button.addEventListener('click', signOut));
    qsa('[data-ct-programs]').forEach((button) => button.addEventListener('click', () => navigate('programs')));
    qsa('[data-ct-home]').forEach((button) => button.addEventListener('click', () => navigate('home')));
    qsa('[data-ct-back-login]').forEach((button) => button.addEventListener('click', () => navigate('login')));
    qsa('[data-ct-open-gantt]').forEach((button) => button.addEventListener('click', () => {
      if (!isSubscriptionActive()) {
        showBlocked('สมาชิกหมดอายุแล้ว กรุณาต่ออายุเพื่อเปิดแผนงาน Gantt', 'สมาชิกหมดอายุ');
        openBilling();
        return;
      }
      global.BuildPlanAppShell?.navigateWorkspace?.();
    }));
    qsa('[data-ct-trial]').forEach((button) => button.addEventListener('click', () => {
      setSubscriptionScenario('active');
      state.plan = publicFreeAccess ? unlockedPlan : 'Free';
      persist();
      global.BuildPlanAppShell?.navigateWorkspace?.();
    }));
    qsa('[data-ct-plan-select]').forEach((select) => select.addEventListener('change', () => {
      if (plans[select.value]) state.plan = publicFreeAccess ? unlockedPlan : select.value;
      persist();
      renderAll();
    }));
    qsa('[data-ct-subscription-scenario]').forEach((button) => {
      button.addEventListener('click', () => setSubscriptionScenario(button.dataset.ctSubscriptionScenario));
    });
    qsa('[data-ct-renew-subscription]').forEach((button) => button.addEventListener('click', renewSubscription));
    qsa('[data-ct-open-billing]').forEach((button) => button.addEventListener('click', openBilling));
    qsa('[data-ct-close-billing]').forEach((button) => button.addEventListener('click', closeBilling));
    qsa('[data-ct-open-support]').forEach((button) => button.addEventListener('click', openSupport));
    qsa('[data-ct-close-support]').forEach((button) => button.addEventListener('click', closeSupport));
    qsa('[data-ct-support-amount]').forEach((button) => button.addEventListener('click', () => chooseSupportTier(button)));
    qsa('[data-ct-billing-cycle]').forEach((button) => button.addEventListener('click', () => setBillingCycle(button.dataset.ctBillingCycle)));
    qsa('[data-ct-choose-plan]').forEach((button) => button.addEventListener('click', () => choosePlan(button.dataset.ctChoosePlan)));
    qs('#ct-module-grid')?.addEventListener('click', (event) => {
      const card = event.target.closest?.('.ct-module-card');
      if (card?.dataset?.moduleId) openModule(card.dataset.moduleId);
    });
    qs('[data-ct-chat-toggle]')?.addEventListener('click', () => toggleChat());
    qs('[data-ct-chat-close]')?.addEventListener('click', () => toggleChat(false));
  }

  function initialize() {
    restore();
    renderAll();
    bind();
    try {
      const search = new URLSearchParams(global.location?.search || '');
      const hashText = String(global.location?.hash || '');
      if (search.get('ctBilling') === 'open' || hashText.includes('ctBilling=open') || hashText.includes('billing')) {
        setTimeout(openBilling, 80);
      }
    } catch (_error) {}
  }

  global.BuildPlanCTSaaS = {
    state,
    plans,
    modules,
    modulePermissions,
    workspaceFeatureRules,
    signIn,
    signOut,
    openModule,
    renderAll,
    renderModules,
    renderAdminPermissions,
    setSubscriptionScenario,
    renewSubscription,
    openBilling,
    closeBilling,
    openSupport,
    closeSupport,
    choosePlan,
    isSubscriptionActive,
    isFeatureAllowedForPlan,
    applyWorkspaceFeatureLocks,
    showPackageUpgradeAlert,
    toggleChat,
  };

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window);
