const { addProjectFeaturesView } = require("../controllers/featureController"),
  express = require("express"),
  auth = require("../middleware/auth"),
  asyncMiddleware = require("../middleware/async"),
  { isActive, isBotOrAdmin } = require("../middleware/userPerms"),
  router = express.Router();

router.post(
  "/project/:projectUid",
  [auth, isActive, isBotOrAdmin],
  asyncMiddleware(addProjectFeaturesView)
);

module.exports = router;
