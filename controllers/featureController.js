const Table = require("../models/table"),
  Issue = require("../models/issue"),
  { View } = require("../models/view"),
  { Project } = require("../models/project"),
  { hasAccess } = require("../utils/lib"),
  { CustomError } = require("../utils/errors"),
  { BadRequest, Unauthorized } = require("../utils/errorMessages"),
  { TABLE_CLASSES, ISSUE_CLASSES } = require("../constants"),
  { getViewQuery, parseViewQueryParams } = require("./viewQueryController"),
  { gzip } = require("node-gzip"),
  { includes, flatMap } = require("lodash");

const getProjectViews = async project => {
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

const getProjectFeatures = async (project, queryParams = {}) => {
  let { classNameFilter, temperatureFilter } = getViewQuery(queryParams);

  let tableObjs = Table.find({ project: project });
  let issueObjs = Issue.find({
    $and: [{ project: project }, ...classNameFilter, ...temperatureFilter]
  });
  let projectFeatures = await Promise.all([tableObjs, issueObjs]);
  return flatMap(projectFeatures);
};

const addProjectFeatures = async (project, geoJson) => {
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

const parseFeaturesToGeoJson = features => {
  return features.map(obj => obj.polygon);
};

module.exports = {
  addProjectFeaturesView: async (req, res) => {
    const project = res.locals.project;

    console.log(project);

    const addedFeatures = await addProjectFeatures(project, req.body);
    if (!addedFeatures) throw new CustomError(406, BadRequest);
    return res.json({
      success: true,
      message: "Successfully added features to the project"
    });
  },

  getProjectFeaturesView: async (req, res) => {
    let queryParams = res.locals.view;
    console.log(queryParams) ? parseViewQueryParams(res.locals.view) : {};
    let projectFeatures = await getProjectFeatures(
      res.locals.project,
      queryParams
    );
    projectFeatures = parseFeaturesToGeoJson(projectFeatures);
    let geoJson = { type: "FeatureCollection", features: projectFeatures };
    let compressedGeojson = await gzip(JSON.stringify(geoJson));
    res.setHeader("Content-Encoding", "gzip");
    return res.send(compressedGeojson);
  }
};
