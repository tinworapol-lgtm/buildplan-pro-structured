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
      provider: 'static-demo',
      tokenStorageKey: 'buildplan_auth_token',
      endpoints: {
        session: '',
        startOtp: '',
        verifyOtp: '',
      },
    },
    licensing: {
      mode: 'static-demo',
      loginRequired: false,
      plans: ['Free', '199', '599'],
      packages: ['Free', '199', '599'],
      billingCycles: ['monthly', 'yearly'],
      endpoints: {
        session: '',
        licenseStatus: '',
        checkout: '',
      },
    },
    cloud: {
      provider: 'static-demo',
      endpoints: {
        projects: '',
      },
    },
    system: {
      endpoints: {
        readiness: '',
      },
    },
  };

  global.BuildPlanConfig = Object.freeze(config);
})(window);
