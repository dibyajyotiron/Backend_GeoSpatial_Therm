const { View } = require("../models/view"),
  { NotFound, Unauthorized } = require("../utils/errorMessages");

validateView = async (req, res, next) => {
  const view = await View.findOne({
    uid: req.params.viewUID,
    active: true
  });
  if (!view) return res.status(404).json({ error: true, message: NotFound });
  res.locals.view = view;
  return next();
};

checkViewPerm = (perm = "readUsers") => {
  return async (req, res, next) => {
    const view = res.locals.view;
    const user = req.user;
    if (view.checkPerm(user, perm)) return next();
    return res.status(403).json({
      error: true,
      message: Unauthorized
    });
  };
};

module.exports = {
  validateView,
  checkViewPerm
};
