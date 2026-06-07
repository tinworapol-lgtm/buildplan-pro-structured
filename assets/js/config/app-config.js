// BuildPlan Pro runtime configuration.
// Keep product metadata, storage keys, feature flags, and subscription/cloud endpoints in one place.
(function bootstrapBuildPlanConfig(global) {
  const config = {
    productName: 'BuildPlan Pro',
    version: 'structured-phase-24',
    dataSchemaVersion: '2.0',
    storage: {
      autosaveKey: 'buildplan_pro_autosave_v2',
    },
    featureFlags: {
      localAutosave: true,
      projectImportExport: true,
      cloudProjects: true,
      smoothSCurve: true,
      installmentLines: true,
      durationPlanning: true,
      actualProgressDashboard: true,
      automaticApiChecks: false,
      frontendErrorLogging: false,
    },
    auth: {
      provider: 'supabase-otp',
      tokenStorageKey: 'buildplan_auth_token',
      endpoints: {
        session: '/api/session',
        startOtp: '/api/auth/start',
        verifyOtp: '/api/auth/verify',
      },
    },
    licensing: {
      mode: 'public-beta',
      loginRequired: false,
      publicFreeAccess: true,
      plans: ['Free', '199', '599'],
      packages: ['Free', '199', '599'],
      billingCycles: ['monthly', 'yearly'],
      endpoints: {
        session: '/api/session',
        licenseStatus: '/api/license/status',
        checkout: '/api/checkout',
      },
    },
    support: {
      enabled: true,
      mode: 'voluntary',
      currency: 'THB',
      tiers: [
        { tier: 'Bronze', amount: 59 },
        { tier: 'Silver', amount: 99 },
        { tier: 'Gold', amount: 159 },
        { tier: 'Platinum', amount: 299 },
        { tier: 'Diamond', amount: 599 },
      ],
      endpoints: {
        checkout: '/api/support/checkout',
        status: '/api/support/status',
      },
    },



    cloud: {
      provider: 'supabase',
      endpoints: {
        projects: '/api/projects',
        feedback: '/api/feedback',
      },
    },
    system: {
      endpoints: {
        readiness: '/api/system/readiness',
      },
    },
  };

  global.BuildPlanConfig = Object.freeze(config);
})(window);
