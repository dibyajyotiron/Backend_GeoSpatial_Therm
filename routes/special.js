const { specialController } = require("../controllers/specialController"),
  express = require("express"),
  auth = require("../middleware/auth"),
  { isActive, isBotOrAdmin } = require("../middleware/userPerms"),
  router = express.Router();

router.post("/", [auth, isActive, isBotOrAdmin], specialController);

module.exports = router;
