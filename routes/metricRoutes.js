const router = require("express").Router(),
  { ALLOWED_ROLES } = require("../constants"),
  { isActive, isBotOrAdmin, hasRoles } = require("../middleware/userPerms"),
  {
    validateProject,
    checkProjectPerm
  } = require("../middleware/projectMiddleware"),
  auth = require("../middleware/auth"),
  { validateView, checkViewPerm } = require("../middleware/viewMiddleware"),
  {
    getProjectIssueCountsView,
    getViewIssueCountsView,
    getProjectModuleCountsView,
    getViewModuleCountsView,
    getViewIssueCountsByProjectView,
    getProjectTemperaturesView,
    getViewTemperaturesView,
    getViewMetricsView
  } = require("../controllers/metricController");

router.get(
  "/project/:projectUid/counts/issues",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectIssueCountsView
);
router.get(
  "/project/:projectUid/counts/modules",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectModuleCountsView
);
router.get(
  "/project/:projectUid/issues/temperatures",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectTemperaturesView
);

router.get(
  "/view/:viewUid",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewMetricsView
);
router.get(
  "/view/:viewUid/counts/issues",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewIssueCountsView
);
router.get(
  "/view/:viewUid/counts/modules",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewModuleCountsView
);
router.get(
  "/view/:viewUid/counts/issues/project",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewIssueCountsByProjectView
);
router.get(
  "/view/:viewUid/issues/temperatures",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewTemperaturesView
);

router.get(
  "/view/:viewUid/project/:projectUid/counts/issues",
  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectIssueCountsView
);

router.get(
  "/view/:viewUid/project/:projectUid/counts/modules",

  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectModuleCountsView
);

router.get(
  "/view/:viewUid/project/:projectUid/issues/temperatures",
  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectTemperaturesView
);

module.exports = router;
