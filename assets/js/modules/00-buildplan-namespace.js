// BuildPlan Pro - namespace bootstrap
// This file creates stable feature namespaces without changing existing globals.
(function bootstrapBuildPlanNamespace(global) {
  const BuildPlan = global.BuildPlan || {};
  const config = global.BuildPlanConfig || {};
  BuildPlan.config = BuildPlan.config || config;
  BuildPlan.productName = BuildPlan.productName || config.productName || 'BuildPlan Pro';
  BuildPlan.version = BuildPlan.version || config.version || 'structured-phase-6';
  BuildPlan.modules = BuildPlan.modules || {};
  BuildPlan.features = BuildPlan.features || {};
  BuildPlan.register = function registerBuildPlanModule(name, api) {
    BuildPlan.modules[name] = api || {};
    return BuildPlan.modules[name];
  };
  global.BuildPlan = BuildPlan;
})(window);
