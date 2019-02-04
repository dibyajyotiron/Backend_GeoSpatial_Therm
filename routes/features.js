const {
    addProjectFeaturesView,
    getProjectFeaturesView
  } = require("../controllers/featureController"),
  express = require("express"),
  {
    checkProjectPerm,
    validateProject
  } = require("../middleware/projectMiddleware"),
  { validateView, checkViewPerm } = require("../middleware/viewMiddleware"),
  auth = require("../middleware/auth"),
  asyncMiddleware = require("../middleware/async"),
  { hasRoles } = require("../middleware/userPerms"),
  { ALLOWED_ROLES } = require("../constants"),
  router = express.Router();

router.post(
  "/project/:projectUid",
  validateProject,
  [auth, hasRoles(ALLOWED_ROLES)],
  asyncMiddleware(addProjectFeaturesView)
);

router.get(
  "/project/:projectUid",
  [auth, validateProject, hasRoles(ALLOWED_ROLES)],
  getProjectFeaturesView
);

router.get(
  "/view/:viewUid/project/:projectUid",
  [
    auth,
    validateView,
    checkViewPerm("readUsers"),
    validateProject,
    checkProjectPerm("readUsers")
  ],
  getProjectFeaturesView
);

module.exports = router;
