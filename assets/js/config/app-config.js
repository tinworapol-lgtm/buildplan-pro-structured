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
      loginRequired: true,
      plans: ['Free', '199', '599'],
      packages: ['Free', '199', '599'],
      billingCycles: ['monthly', 'yearly'],
      endpoints: {
        session: '/api/session',
        licenseStatus: '/api/license/status',
        checkout: '/api/checkout',
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
