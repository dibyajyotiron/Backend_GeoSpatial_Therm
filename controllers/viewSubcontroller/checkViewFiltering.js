const { CustomError } = require("../../utils/errors"),
  { intersectionWith } = require("lodash");
module.exports = {
  validateBodyView: function(req) {
    const { read_users, write_users, temperatures, issueTypes } = req.body;

    if (
      (temperatures && Object.keys(temperatures).length > 0) ||
      (issueTypes && issueTypes.length > 0)
    ) {
      if (write_users && write_users.length > 0)
        throw new CustomError(
          400,
          "Filtering is not allowed when write user access is being provided!"
        );
    }

    if (
      intersectionWith(
        read_users,
        write_users,
        (obj1, obj2) => obj1.email === obj2.email
      ).length
    )
      throw new CustomError(
        400,
        "One of the read users is also inside write users!"
      );
  }
};
