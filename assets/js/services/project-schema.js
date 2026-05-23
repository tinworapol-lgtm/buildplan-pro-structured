// BuildPlan Pro project schema and migration adapter.
// Keep save/load versioning isolated from storage and rendering modules.
(function bootstrapBuildPlanSchema(global) {
  const config = global.BuildPlanConfig || {};
  const currentVersion = config.dataSchemaVersion || '2.0';
  const productName = config.productName || 'BuildPlan Pro';

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data || {}));
  }

  function getCurrentSchemaVersion() {
    return currentVersion;
  }

  function prepareForSave(projectData) {
    const nextData = cloneData(projectData);
    return {
      ...nextData,
      version: currentVersion,
      schemaVersion: currentVersion,
      savedAt: nextData.savedAt || new Date().toISOString(),
      app: nextData.app || productName,
      appVersion: config.version || global.BuildPlan?.version || '',
    };
  }

  function migrateProjectData(projectData) {
    const nextData = cloneData(projectData);
    const detectedVersion = String(nextData.schemaVersion || nextData.version || '1.0');

    if (!Array.isArray(nextData.tasks)) nextData.tasks = [];
    if (!nextData.info || typeof nextData.info !== 'object') nextData.info = {};
    if (!nextData.prefs || typeof nextData.prefs !== 'object') nextData.prefs = {};
    if (!nextData.costSettings || typeof nextData.costSettings !== 'object') nextData.costSettings = {};
    if (!nextData.installmentSettings || typeof nextData.installmentSettings !== 'object') nextData.installmentSettings = {};
    if (!nextData.durationPlanSettings || typeof nextData.durationPlanSettings !== 'object') nextData.durationPlanSettings = {};
    if (!nextData.actualSettings || typeof nextData.actualSettings !== 'object') nextData.actualSettings = {};
    if (!nextData.actualEntries || typeof nextData.actualEntries !== 'object') nextData.actualEntries = {};

    nextData.migratedFromVersion = detectedVersion === currentVersion ? nextData.migratedFromVersion || null : detectedVersion;
    nextData.version = currentVersion;
    nextData.schemaVersion = currentVersion;
    nextData.app = nextData.app || productName;
    return nextData;
  }

  function validateProjectData(projectData) {
    const errors = [];
    if (!projectData || typeof projectData !== 'object') errors.push('Project data must be an object');
    if (projectData && !Array.isArray(projectData.tasks)) errors.push('Project data requires a tasks array');
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  global.BuildPlanSchema = {
    getCurrentSchemaVersion,
    prepareForSave,
    migrateProjectData,
    validateProjectData,
  };
})(window);
