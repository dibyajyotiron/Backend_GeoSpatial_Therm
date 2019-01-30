const { View } = require("../models/view"),
  { ALLOWED_ROLES } = require("../constants"),
  { includes } = require("lodash");

async function getAllViews(user, perm = "read", query) {
  if (!query) query = {};
  important = query.important ? JSON.parse(query.important) : undefined;
  const pageSize = parseInt(query.pageSize) || 10;
  const pageNumber = parseInt(query.pageNumber) || 1;
  const queryString = query.q || "";

  const permissions = [];
  const perms = {
    read: ["readUsers", "writeUsers"],
    write: ["writeUsers"]
  };
  const permsToCheck = perms[perm];
  for (const i of permsToCheck) {
    let permission = {};
    permission[perm] = { $in: [user] };
    permissions.push(permission);
  }
  let queryImportant = includes([true, false], important)
    ? [{ important: important }]
    : [];

  userPermissions = [{ $or: [{ owner: user }, ...permissions] }];

  let organizationFilter;

  if (user.organization)
    organizationFilter = [{ "organization.uid": user.organization }];
  else organizationFilter = [];

  const baseQuery = [
    {
      $match: {
        $and: [
          { active: true },
          ...organizationFilter,
          ...queryImportant,
          {
            $or: [
              { uid: { $regex: `^${queryString}$` } },
              { name: { $regex: queryString, $options: "i" } },
              { description: { $regex: queryString, $options: "i" } },
              { "owner.email": { $regex: `^${queryString}$` } }
            ]
          }
        ]
      }
    }
  ];

  let extractOrganization = [
    {
      $lookup: {
        from: "organizations",
        localField: "organization",
        foreignField: "_id",
        as: "organization"
      }
    },
    {
      $unwind: {
        path: "$organization",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        organization: {
          $ifNull: [
            "$organization",
            {
              active: true,
              owner: {},
              readUsers: [],
              writeUsers: [],
              labelsRead: [],
              labelsWrite: []
            }
          ]
        }
      }
    },
    {
      $match: { "organization.active": true }
    }
  ];

  const limitFilter = pageSize > 0 ? [{ $limit: pageSize }] : [];
  let aggregatedViews = await View.aggregate([
    ...extractOrganization,
    ...baseQuery,
    {
      $skip: pageSize * (pageNumber - 1)
    },
    ...limitFilter
  ]);

  let viewUids = aggregatedViews.map(v => v.uid);
  return await View.find({ uid: { $in: viewUids } });
}
module.exports.getAllViews = getAllViews;
