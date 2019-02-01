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
  [auth, hasRoles(ALLOWED_ROLES)],
  asyncMiddleware(addProjectFeaturesView)
);

router.get(
  "/project/:projectUID",
  [auth, validateProject, hasRoles(ALLOWED_ROLES)],
  getProjectFeaturesView
);

router.get(
  "/view/:viewUID/project/:projectUID",
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
