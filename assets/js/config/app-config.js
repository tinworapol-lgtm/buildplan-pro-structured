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
    },
    auth: {
      provider: 'supabase',
      tokenStorageKey: 'buildplan_auth_token',
      endpoints: {
        session: '/api/session',
        startOtp: '/api/auth/start',
        verifyOtp: '/api/auth/verify',
      },
    },
    licensing: {
      mode: 'serverless-saas-demo-access',
      loginRequired: false,
      plans: ['monthly', 'yearly'],
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
