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
  "/project/:projectUID/counts/issues",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectIssueCountsView
);
router.get(
  "/project/:projectUID/counts/modules",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectModuleCountsView
);
router.get(
  "/project/:projectUID/issues/temperatures",
  auth,
  validateProject,
  hasRoles(ALLOWED_ROLES),
  getProjectTemperaturesView
);

router.get(
  "/view/:viewUID",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewMetricsView
);
router.get(
  "/view/:viewUID/counts/issues",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewIssueCountsView
);
router.get(
  "/view/:viewUID/counts/modules",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewModuleCountsView
);
router.get(
  "/view/:viewUID/counts/issues/project",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewIssueCountsByProjectView
);
router.get(
  "/view/:viewUID/issues/temperatures",
  auth,
  validateView,
  checkViewPerm("read"),
  getViewTemperaturesView
);

router.get(
  "/view/:viewUID/project/:projectUID/counts/issues",
  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectIssueCountsView
);

router.get(
  "/view/:viewUID/project/:projectUID/counts/modules",

  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectModuleCountsView
);

router.get(
  "/view/:viewUID/project/:projectUID/issues/temperatures",
  auth,
  validateView,
  checkViewPerm("read"),
  validateProject,
  checkProjectPerm("read"),
  getProjectTemperaturesView
);

module.exports = router;
