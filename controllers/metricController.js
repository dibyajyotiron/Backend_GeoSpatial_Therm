const _ = require("lodash"),
  Table = require("../models/table"),
  { getViewQuery, parseViewQueryParams } = require("./viewQueryController"),
  Issue = require("../models/issue"),
  { fromPairs, sum, values } = require("lodash");

const getBaseQuery = (projectUids, queryParams = {}) => {
  let { classNameFilter, temperatureFilter } = getViewQuery(queryParams);

  return [
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project"
      }
    },
    {
      $lookup: {
        from: "groups",
        localField: "project.group",
        foreignField: "_id",
        as: "group"
      }
    },
    {
      $match: {
        $and: [
          { "project.uid": { $in: projectUids } },
          { "project.active": true },
          { "group.active": true },
          ...classNameFilter,
          ...temperatureFilter
        ]
      }
    }
  ];
};

const getProjectsIssueCounts = async (projectUids, queryParams = {}) => {
  return await Issue.aggregate([
    ...getBaseQuery(projectUids, queryParams),
    {
      $group: { _id: "$class_name", count: { $sum: 1 } }
    }
  ]);
};

const getProjectsModuleCounts = async (projectUids, queryParams = {}) => {
  return await Table.aggregate([
    ...getBaseQuery(projectUids),
    {
      $group: {
        _id: null,
        modules: {
          $sum: {
            $multiply: ["$num_modules_horizontal", "$num_modules_vertical"]
          }
        }
      }
    }
  ]);
};

const getIssueCountsByProject = async (projectUids, queryParams = {}) => {
  return await Issue.aggregate([
    ...getBaseQuery(projectUids, queryParams),
    {
      $group: {
        _id: { class_name: "$class_name", project: "$project" },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.project",
        issues: { $push: { type: "$_id.class_name", count: "$count" } }
      }
    },
    {
      $project: {
        _id: 0,
        uid: "$_id.uid",
        name: "$_id.name",
        issues: 1
      }
    },
    {
      $unwind: "$uid"
    },
    {
      $unwind: "$name"
    }
  ]);
};

const getProjectsIssueTemperatures = async (projectUids, queryParams = {}) => {
  return await Issue.aggregate([
    ...getBaseQuery(projectUids, queryParams),
    {
      $project: { temperature_difference: 1, _id: 0 }
    }
  ]);
};

const getProjectsIssueTemperatureStats = async (
  projectUids,
  queryParams = {}
) => {
  return await Issue.aggregate([
    ...getBaseQuery(projectUids, queryParams),
    {
      $group: {
        _id: 0,
        mean: { $avg: "$temperature_difference" },
        min: { $min: "$temperature_difference" },
        max: { $max: "$temperature_difference" },
        std: { $stdDevPop: "$temperature_difference" }
      }
    },
    {
      $project: { _id: 0 }
    }
  ]);
};

const parseIssueCounts = issueCounts => {
  return fromPairs(issueCounts.map(obj => [obj._id, obj.count]));
};

const getViewMetrics = async view => {
  let projectUids = view.projects.map(proj => proj.uid);
  console.log(projectUids);
  let queryParams = parseViewQueryParams(view);
  let metrics = {};

  metrics.modules = {};
  metrics.temperature_difference = {};
  let issueCounts = getProjectsIssueCounts(projectUids, queryParams);
  let moduleCounts = getProjectsModuleCounts(projectUids, queryParams);
  let temperatures = getProjectsIssueTemperatureStats(projectUids, queryParams);

  [issueCounts, moduleCounts, temperatures] = await Promise.all([
    issueCounts,
    moduleCounts,
    temperatures
  ]);
  metrics.issues = parseIssueCounts(issueCounts);
  metrics.modules.total = moduleCounts.length
    ? moduleCounts[0]["modules"]
    : undefined;

  metrics.modules.affected = sum(values(metrics.issues));
  metrics.temperature_difference = temperatures[0];
  return metrics;
};

module.exports = {
  getViewMetrics,
  getProjectIssueCountsView: async (req, res) => {
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};
    console.log("QP", queryParams);

    let issueCounts = await getProjectsIssueCounts(
      [res.locals.project.uid],
      queryParams
    );
    console.log("IC", issueCounts);
    let metrics = parseIssueCounts(issueCounts);
    return res.json(metrics);
  },

  getViewIssueCountsView: async (req, res) => {
    let projectUids = res.locals.view.projects.map(proj => proj.uid);
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};

    let issueCounts = await getProjectsIssueCounts(projectUids, queryParams);
    let metrics = parseIssueCounts(issueCounts);
    return res.json(metrics);
  },

  getProjectModuleCountsView: async (req, res) => {
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};

    let moduleCounts = await getProjectsModuleCounts(
      [res.locals.project.uid],
      queryParams
    );
    console.log(res.locals);
    return res.json(moduleCounts[0]["modules"]);
  },

  getViewModuleCountsView: async (req, res) => {
    let projectUids = res.locals.view.projects.map(proj => proj.uid);
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};
    let moduleCounts = await getProjectsModuleCounts(projectUids, queryParams);
    return res.json(moduleCounts[0]["modules"]);
  },

  getViewIssueCountsByProjectView: async (req, res) => {
    let projectUids = res.locals.view.projects.map(proj => proj.uid);
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};

    let issueCountsByProject = await getIssueCountsByProject(
      projectUids,
      queryParams
    );
    return res.json(issueCountsByProject);
  },

  getProjectTemperaturesView: async (req, res) => {
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};

    let temperatures = await getProjectsIssueTemperatures(
      [res.locals.project.uid],
      queryParams
    );
    temperatures = temperatures.map(t => t.temperature_difference);
    return res.json(temperatures);
  },

  getViewTemperaturesView: async (req, res) => {
    let projectUids = res.locals.view.projects.map(proj => proj.uid);
    let queryParams = res.locals.view
      ? parseViewQueryParams(res.locals.view)
      : {};

    let temperatures = await getProjectsIssueTemperatures(
      projectUids,
      queryParams
    );
    temperatures = temperatures.map(t => t.temperature_difference);
    return res.json(temperatures);
  },

  getViewMetricsView: async (req, res) => {
    let view = res.locals.view;
    if (JSON.parse(req.query.update || "false")) view.save();
    return res.json(await getViewMetrics(view));
  }
};
