const { Organization } = require("../models/organization"),
  express = require("express"),
  asyncMiddleware = require("../middleware/async"),
  auth = require("../middleware/auth"),
  router = express.Router();
router.get(
  "/",
  auth,
  asyncMiddleware(async (req, res, next) => {
    const found = await Organization.find({});
    if (!found) return next();
    return res.json({ organization: found });
  })
);

router.get(
  "/:uid",
  asyncMiddleware(async (req, res, next) => {
    const { uid } = req.params;
    const found = await Organization.find({ uid });
    if (!found)
      return res.status(404).json({ error: false, organization: "Not found" });
    return res.json({ organization: found });
  })
);

router.post(
  "/",
  asyncMiddleware(async (req, res) => {
    const organization = {
      uid: "ORG1",
      name: "ORGName",
      active: true
    };
    const orgaNew = new Organization(organization);
    await orgaNew.save();
    return res.json({ organization: orgaNew });
  })
);

module.exports = router;
