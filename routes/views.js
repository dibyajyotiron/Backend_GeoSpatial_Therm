const {
    createOrUpdate,
    fetchView,
    getAllViews
  } = require("../controllers/viewController"),
  express = require("express"),
  auth = require("../middleware/auth"),
  asyncMiddleware = require("../middleware/async"),
  { isActive, isBotOrAdmin } = require("../middleware/userPerms"),
  { validateView, checkViewPerm } = require("../middleware/viewMiddleware"),
  router = express.Router();

router.post(
  "/org/:orgUid",
  [auth, isActive, isBotOrAdmin],
  asyncMiddleware(createOrUpdate)
);

router.get(
  "/:viewUid",
  [auth, isActive, isBotOrAdmin, validateView, checkViewPerm("readUsers")],
  asyncMiddleware(fetchView)
);
router.get("/", [auth, isActive, isBotOrAdmin], asyncMiddleware(getAllViews));

module.exports = router;
