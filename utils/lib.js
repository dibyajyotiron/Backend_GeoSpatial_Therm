module.exports.hasAccess = function(property, type, email) {
  return property[type].length > 0
    ? property[type]
        .map(user => {
          if (user.email === email) return true;
        })
        .toString()
    : false;
};

// foundGroup[readUsers]length > 0
// 	? JSON.parse(
// 			foundGroup.readUsers
// 				.map(user => user.email === req.user.email)
// 				.toString(),
// 	  )
// 	: false;
