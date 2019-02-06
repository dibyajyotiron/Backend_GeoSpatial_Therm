const { Group, validateGroup } = require("../models/group"),
  express = require("express"),
  { CustomError } = require("../utils/errors"),
  {
    NotFound,
    Unauthorized,
    InvalidUser,
    BadRequest
  } = require("../utils/errorMessages"),
  { hasAccess } = require("../utils/lib"),
  asyncMiddleware = require("../middleware/async"),
  auth = require("../middleware/auth"),
  router = express.Router();
router.get(
  "/:uid",
  auth,
  asyncMiddleware(async (req, res) => {
    const foundGroup = await Group.findOne({ uid: req.params.uid });
    if (!foundGroup) throw new CustomError(404, NotFound);
    const { email } = req.user;
    const isGroupOwner = foundGroup.owner.email === email;
    if (isGroupOwner) return res.json({ success: true, group: foundGroup });

    const hasGroupWriteAccess = hasAccess(foundGroup, "writeUsers", email);
    const hasGroupReadAccess = hasAccess(foundGroup, "readUsers", email);

    if (hasGroupReadAccess || hasGroupWriteAccess) {
      return res.json({ group: foundGroup });
    }

    throw new CustomError(403, Unauthorized);
  })
);

router.get(
  "/access/read",
  auth,
  asyncMiddleware(async (req, res) => {
    const foundGroups = await Group.find({}).lean();
    let readAccessGroups = foundGroups.filter(el => {
      for (let i of el.readUsers) {
        if (i.email === req.user.email) return i;
      }
    });
    console.log(readAccessGroups);
    readAccessGroups =
      readAccessGroups.length > 0
        ? readAccessGroups
        : "You don't have access to any of the groups";
    console.log(req.user.email);
    return res.json({ groups: readAccessGroups });
  })
);

router.get(
  "/access/write",
  auth,
  asyncMiddleware(async (req, res) => {
    const foundGroups = await Group.find({}).lean();
    let writeAccessGroups;
    writeAccessGroups = foundGroups.filter(el => {
      if (el.owner.email === req.user.email) return el;
      for (let i of el.writeUsers) {
        if (i.email === req.user.email) return i;
      }
    });
    console.log(writeAccessGroups);
    writeAccessGroups =
      writeAccessGroups.length > 0
        ? writeAccessGroups
        : "You don't have write access to any of the groups";
    console.log(req.user.email);
    return res.json({ groups: writeAccessGroups });
  })
);

router.post(
  "/",
  asyncMiddleware(async (req, res) => {
    const { error } = validateGroup(req.body);
    if (error)
      return res.status(400).json({
        error: true,
        reason: error.details[0].message
      });
    const newGroup = new Group(req.body);
    const savedGroup = await newGroup.save();
    return res.json({
      group: savedGroup
    });
  })
);
module.exports = router;
