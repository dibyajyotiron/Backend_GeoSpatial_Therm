const Table = require("../models/table"),
  Issue = require("../models/issue"),
  { View } = require("../models/view"),
  { Project } = require("../models/project"),
  { hasAccess } = require("../utils/lib"),
  { CustomError } = require("../utils/errors"),
  { NotFound, Unauthorized } = require("../utils/errorMessages"),
  { TABLE_CLASSES, ISSUE_CLASSES } = require("../constants"),
  { includes } = require("lodash");

getProjectViews = async project => {
  const aggregatedViews = await View.aggregate([
    {
      $lookup: {
        from: "projects",
        localField: "projects",
        foreignField: "_id",
        as: "projects"
      }
    },
    {
      $match: { projects: { $elemMatch: { uid: project.uid } } }
    }
  ]);

  let viewUids = aggregatedViews.map(view => view.uid);
  return await View.find({ uid: { $in: viewUids } });
};

addProjectFeatures = async (project, geoJson) => {
  const features = geoJson.features || [];
  const tableObjs = [];
  const issueObjs = [];
  for (let feature of features) {
    let featureObj = {};
    featureObj.uid = feature.properties.uid;
    featureObj.polygon = feature;
    featureObj.class_id = feature.properties.class_id;
    featureObj.class_name = feature.properties.class_name;
    featureObj.project = project;
    featureObj.raw_images = feature.properties.raw_images || [];
    featureObj.temperature_difference =
      feature.properties.temperature_difference;

    if (includes(TABLE_CLASSES, featureObj.class_name)) {
      featureObj.num_modules_horizontal =
        feature.properties.num_modules_horizontal;
      featureObj.num_modules_vertical = feature.properties.num_modules_vertical;
      tableObjs.push(featureObj);
    } else if (includes(ISSUE_CLASSES, featureObj.class_name)) {
      featureObj.location = feature.properties.location;
      issueObjs.push(featureObj);
    }
  }
  await Table.deleteMany({ project });
  await Table.insertMany(tableObjs);

  for (let issueObj of issueObjs) {
    let issueTable = await Table.findOne({
      uid: issueObj.polygon.properties.parent_uid
    });
    if (issueTable) issueObj.table = issueTable;
  }

  await Issue.deleteMany({ project });
  await Issue.insertMany(issueObjs);

  const views = await getProjectViews(project);
  for (let view of views) view.save();
  return true;
};
module.exports = {
  addProjectFeaturesView: async (req, res) => {
    const { projectUid } = req.params;
    console.log(typeof uid);
    const project = await Project.findOne({ uid: projectUid });

    console.log(project);

    if (!project) throw new CustomError(404, NotFound);

    const hasProjectReadAccess = hasAccess(
      project,
      "readUsers",
      req.user.email
    );
    const hasProjectWriteAccess = hasAccess(
      project,
      "writeUsers",
      req.user.email
    );

    if (hasProjectReadAccess || hasProjectWriteAccess) {
      await addProjectFeatures(project, req.body);
      return res.json({
        success: true,
        message: "Successfully added features to the project"
      });
    }

    throw new CustomError(403, Unauthorized);
  }
};
