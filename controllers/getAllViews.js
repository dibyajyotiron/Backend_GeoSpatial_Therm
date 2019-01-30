const { CustomError } = require("../utils/errors"),
  { NotFound, Unauthorized } = require("../utils/errorMessages"),
  { hasAccess } = require("../utils/lib"),
  { parseViews } = require("./viewController"),
  { pick, uniqBy } = require("lodash");

function getAllViews(views, email, query) {
  let hasViewReadAccess;
  let hasViewWriteAccess;
  let isViewOwner;
  let hasAccessToViews = [];
  let outputView;
  let filteredView;

  const finalResult = views.map(async view => {
    hasViewReadAccess = hasAccess(view, "readUsers", email);
    hasViewWriteAccess = hasAccess(view, "writeUsers", email);
    isViewOwner = view.owner.email === email;

    if (hasViewReadAccess || hasViewWriteAccess || isViewOwner) {
      hasAccessToViews.push(view);

      outputView = await parseViews(hasAccessToViews, query);
      filteredView = pick(outputView[0], [
        "name",
        "uid",
        "groups",
        "metrics",
        "users",
        "temperatureMin",
        "temperatureMax"
      ]);
      return filteredView;
    }
    // throw new CustomError(404, NotFound);
  });
  return finalResult;
}
module.exports = {
  getAllViews
};
