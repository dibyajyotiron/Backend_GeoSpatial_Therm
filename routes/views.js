const {
    createOrUpdate,
    fetchView,
    getAllViews,
    getViewGroupsView,
    getViewGroupProjectsView
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
router.post(
  "/update/org/:orgUid",
  [auth, isActive, isBotOrAdmin],
  asyncMiddleware(createOrUpdate)
);

router.get("/", [auth, isActive, isBotOrAdmin], asyncMiddleware(getAllViews));

router.get(
  "/:viewUid",
  [auth, isActive, isBotOrAdmin, validateView, checkViewPerm("readUsers")],
  asyncMiddleware(fetchView)
);
router.get(
  "/:viewUid/groups",
  [auth, isActive, isBotOrAdmin, validateView, checkViewPerm("readUsers")],
  asyncMiddleware(getViewGroupsView)
);
router.get(
  "/:viewUid/groups/:groupUid/projects",
  [auth, isActive, isBotOrAdmin, validateView, checkViewPerm("readUsers")],
  asyncMiddleware(getViewGroupProjectsView)
);

module.exports = router;
