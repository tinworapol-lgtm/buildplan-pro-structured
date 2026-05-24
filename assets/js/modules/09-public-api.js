// BuildPlan Pro - public feature API
// Keeps existing global functions available while exposing grouped namespaces for the next refactor phase.
(function registerBuildPlanPublicApi(global) {
  const BuildPlan = global.BuildPlan;
  if (!BuildPlan || typeof BuildPlan.register !== 'function') {
    throw new Error('BuildPlan namespace must be loaded before public API registration');
  }

  BuildPlan.register('config', {
    getConfig: () => BuildPlan.config || global.BuildPlanConfig || {},
    productName: BuildPlan.productName,
    version: BuildPlan.version
  });

  BuildPlan.register('schema', {
    getCurrentSchemaVersion: () => global.BuildPlanSchema?.getCurrentSchemaVersion?.(),
    prepareForSave: (projectData) => global.BuildPlanSchema?.prepareForSave?.(projectData),
    migrateProjectData: (projectData) => global.BuildPlanSchema?.migrateProjectData?.(projectData),
    validateProjectData: (projectData) => global.BuildPlanSchema?.validateProjectData?.(projectData)
  });

  BuildPlan.register('license', {
    getLicenseConfig: () => global.BuildPlanLicense?.getLicenseConfig?.(),
    getLicenseState: () => global.BuildPlanLicense?.getLicenseState?.(),
    isLicenseActive: () => global.BuildPlanLicense?.isLicenseActive?.(),
    isFeatureEnabled: (featureName) => global.BuildPlanLicense?.isFeatureEnabled?.(featureName),
    getSessionStatus: () => global.BuildPlanLicense?.getSessionStatus?.(),
    startCheckout: (plan) => global.BuildPlanLicense?.startCheckout?.(plan),
    refreshLicenseStatus: () => global.BuildPlanLicense?.refreshLicenseStatus?.(),
    initializeLicenseGate: () => global.BuildPlanLicense?.initializeLicenseGate?.()
  });

  BuildPlan.register('auth', {
    getAccessToken: () => global.BuildPlanAuth?.getAccessToken?.(),
    setAccessToken: (token) => global.BuildPlanAuth?.setAccessToken?.(token),
    clearAccessToken: () => global.BuildPlanAuth?.clearAccessToken?.(),
    getSessionState: () => global.BuildPlanAuth?.getSessionState?.(),
    refreshSession: () => global.BuildPlanAuth?.refreshSession?.(),
    getAuthorizationHeaders: () => global.BuildPlanAuth?.getAuthorizationHeaders?.()
  });

  BuildPlan.register('cloud', {
    isCloudConfigured: () => global.BuildPlanCloud?.isCloudConfigured?.(),
    listProjects: () => global.BuildPlanCloud?.listProjects?.(),
    saveProject: (projectData, options) => global.BuildPlanCloud?.saveProject?.(projectData, options),
    loadProject: (projectId) => global.BuildPlanCloud?.loadProject?.(projectId),
    applyCloudProject: (projectId) => global.BuildPlanCloud?.applyCloudProject?.(projectId)
  });

  BuildPlan.register('saas', {
    getReadinessState: () => global.BuildPlanSaaS?.getReadinessState?.(),
    refreshReadiness: () => global.BuildPlanSaaS?.refreshReadiness?.(),
    canEnablePaidMode: () => global.BuildPlanSaaS?.canEnablePaidMode?.()
  });

  BuildPlan.register('accountCloud', {
    initializeAccountCloudUi: () => global.BuildPlanAccountCloud?.initializeAccountCloudUi?.(),
    openPanel: () => global.BuildPlanAccountCloud?.openPanel?.(),
    closePanel: () => global.BuildPlanAccountCloud?.closePanel?.(),
    refreshStatus: () => global.BuildPlanAccountCloud?.refreshStatus?.(),
    saveCloud: () => global.BuildPlanAccountCloud?.saveCloud?.(),
    loadCloudList: () => global.BuildPlanAccountCloud?.loadCloudList?.()
  });

  BuildPlan.register('appShell', {
    getRoute: () => global.BuildPlanAppShell?.getRoute?.(),
    navigateTo: (route) => global.BuildPlanAppShell?.navigateTo?.(route),
    navigateHome: () => global.BuildPlanAppShell?.navigateHome?.(),
    navigateLogin: () => global.BuildPlanAppShell?.navigateLogin?.(),
    navigateWorkspace: () => global.BuildPlanAppShell?.navigateWorkspace?.(),
    sendLoginCode: () => global.BuildPlanAppShell?.sendLoginCode?.(),
    verifyLoginCode: () => global.BuildPlanAppShell?.verifyLoginCode?.()
  });

  BuildPlan.register('core', {
    safeFormatDate,
    formatDateToThai,
    formatDateDisplay,
    clampNumber,
    showAppAlert,
    showProcessingAlert,
    finishProcessingAlert,
    updateSidebarOffset
  });

  BuildPlan.register('storage', {
    collectProjectData,
    applyProjectData,
    saveProjectToFile,
    handleFileLoad,
    scheduleAutoSave,
    saveProjectToLocal,
    getAutoSavedProject,
    restoreAutoSavedProject,
    clearAutoSavedProject,
    updateAutoSaveStatus,
    initializeAutoSave,




    loadDefaultSampleProjectIfNeeded
  });

  BuildPlan.register('duration', {
    normalizeInstallmentSettings,
    getInstallmentSchedule,
    renderInstallmentPanel,
    createInstallmentSchedule,
    updateInstallmentDuration,
    clearInstallmentSchedule,
    toggleInstallmentLines,
    normalizeDurationPlanSettings,
    renderDurationPlanTable,
    applyDurationPlanToTask,
    applyDurationPlanToAll,
    autoDistributeDurationPlan
  });

  BuildPlan.register('gantt', {
    calculateDates,
    renderUI,
    renderTable,
    renderTimeline,
    renderGanttBars,
    renderGanttSCurveOverlay,
    togglePredColumn,
    toggleGanttBarStyle,
    changeScale,
    toggleTodayLine,

    changeScale,
    resetBuildPlanWorkspace
  });

  BuildPlan.register('actual', {
    normalizeActualSettings,
    normalizeActualEntries,
    setActualFrequency,
    updateActualTaskProgress,
    saveActualSnapshot,
    renderActualProgressPage,
    renderActualSummary,
    renderActualCurveChart,
    getActualProgressAtDate,
    getTaskCompletionRecord,
    computeActualVariance
  });

  BuildPlan.register('dashboard', {
    computeProjectMetrics,
    renderDashboard,
    renderDashboardBar,
    renderDashboardList
  });

  BuildPlan.register('cost', {
    formatMoneyDisplay,
    formatFactorDisplay,
    numberToThaiText,
    computeCostSummaryData,
    renderCostSummary,




    syncProjectHeaderValue,
    renderCostTable,
    renderSCurveChart,
    getSCurveData,
    toggleSCurveSmoothMode,
    toggleSCurveFill
  });

  BuildPlan.register('editing', {
    updateData,
    addMainTask,
    addSubTask,
    insertTaskRow,
    moveTaskUp,
    moveTaskDown,
    deleteRow,
    openMilestoneModal,
    closeMilestoneModal,
    confirmMilestone,
    scrollToBottom
  });
})(window);
