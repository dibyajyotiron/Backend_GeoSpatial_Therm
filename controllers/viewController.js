const { View, validateView } = require("../models/view"),
  { Project } = require("../models/project"),
  { Group } = require("../models/group"),
  { Organization } = require("../models/organization"),
  { CustomError } = require("../utils/errors"),
  { NotFound, Unauthorized } = require("../utils/errorMessages"),
  { hasAccess } = require("../utils/lib"),
  { getAllViews } = require("./baseViewController"),
  { updateView } = require("./viewSubcontroller/update"),
  { create } = require("./viewSubcontroller/create"),
  { validateBodyView } = require("./viewSubcontroller/checkViewFiltering"),
  { pick, uniqBy, includes, intersectionWith } = require("lodash");

function getViewProjects(view) {
  let viewProjects = uniqBy(view.projects || [], proj => proj.uid);
  return viewProjects.filter(proj => proj.active);
}

function parseViewProjects(view, queryParams, group = null) {
  let complete = JSON.parse(queryParams.complete || "false");
  let viewProjects = getViewProjects(view);
  let finalProjects = [];

  for (let project of viewProjects) {
    if (!project.active === true) continue;
    if (group && project.group.uid !== group.uid) continue;
    projectObj = pick(project, ["uid", "name", "description", "date"]);
    projectObj.date = project.date ? project.date.toDateString() : undefined;

    if (complete) {
      projectObj.orthoTiles = (project.data || {}).orthoTiles;
      projectObj.data = `${process.env["server"]}/projects/${project.uid}/data`;
      projectObj.vectors = `${process.env["server"]}/tables/view/${
        view.uid
      }/project/${project.uid}`;
      projectObj.report = (project.data || {}).report;
    }

    finalProjects.push(projectObj);
  }

  return finalProjects;
}
function getViewGroups(view) {
  let viewGroups = uniqBy(
    view.projects.map(proj => proj.group),
    grp => grp.uid
  );
  return viewGroups.filter(grp => grp.active);
}
function parseViewGroups(view, queryParams) {
  let projects = JSON.parse(queryParams.projects || "false");

  let viewGroups = getViewGroups(view);
  // console.log(viewGroups);
  let finalGroups = [];

  for (let group of viewGroups) {
    if (!group.active === true) continue;
    groupObj = pick(group, ["uid", "name", "description"]);
    if (projects) {
      groupObj.projects = parseViewProjects(view, queryParams, groupObj);
    } else
      groupObj.projects = `${process.env["server"]}/views/${view.uid}/groups/${
        group.uid
      }/projects`;
    finalGroups.push(groupObj);
  }

  return finalGroups;
}
async function parseViews(views, queryParams) {
  let complete = JSON.parse(queryParams.complete || "false");
  let metrics = JSON.parse(queryParams.metrics || "false");
  let groups = JSON.parse(queryParams.groups || "false");
  let projects = JSON.parse(queryParams.projects || "false");

  let outputJSON = [];
  for (let view of views) {
    let viewObj = pick(view, ["uid", "name", "description"]);
    if (complete) {
      viewObj.users = {};
      console.log(view.temperatures);
      // viewObj.users.owner = view.owner;
      // viewObj.users.readOnly = view.readUsers || [];
      // viewObj.users.readWrite = view.writeUsers || [];
      // viewObj.issueTypes = view.issueTypes || [];
      viewObj.users.owner = { ...view.owner };
      viewObj.users.readOnly = [...view.readUsers] || [];
      viewObj.users.readWrite = [...view.writeUsers] || [];
      viewObj.issueTypes = [...view.issueTypes] || [];
      viewObj.temperatureMin = view.temperatures ? view.temperatures.min : "";
      viewObj.temperatureMax = view.temperatures ? view.temperatures.max : "";
      viewObj.organization = {
        uid: (view.organization || {}).uid,
        name: (view.organization || {}).name
      };
    }
    // console.log(viewObj);

    if (groups || projects) {
      viewObj.groups = parseViewGroups(view, queryParams);
    } else viewObj.groups = `${process.env["server"]}/views/${view.uid}/groups`;
    outputJSON.push(viewObj);

    if (metrics) viewObj.metrics = view.metrics;
    else viewObj.metrics = `${process.env["server"]}/metrics/view/${view.uid}`;
  }
  return outputJSON;
}

module.exports = {
  createOrUpdate: async (req, res) => {
    const update = req.url.split("/").includes("update");
    validateBodyView(req);

    if (req.body.uid && update) {
      await updateView(req);
      return res.json({
        success: true,
        message: `Successfully updated view with uid ${req.body.uid}!`
      });
    }

    const { error } = validateView(req.body);
    if (error) throw new CustomError(400, error.details[0].message);

    await create(req);
    return res.json({ success: true, message: "Successfully added views" });
  },
  fetchView: async (req, res) => {
    const view = res.locals.view;
    const outputView = await parseViews([view], req.query);
    const filteredView = pick(outputView[0], [
      "name",
      "uid",
      "users",
      "groups",
      "metrics"
    ]);
    return res.json({ view: filteredView });
  },
  getAllViews: async (req, res) => {
    /**************Code below Works fine*********************/
    // let { pageSize, pageNumber } = req.query;
    // pageSize = pageSize > 0 ? JSON.parse(pageSize) : 10;
    // pageNumber = pageNumber > 0 ? JSON.parse(pageNumber) : 1;
    // console.log(pageNumber, pageSize);
    // const allViews = await View.find({})
    //   .lean()
    //   .skip(pageNumber > 0 ? (pageNumber - 1) * pageSize : 0)
    //   .limit(JSON.parse(pageSize));
    // const { email } = req.user;
    // let hasViewReadAccess;
    // let hasViewWriteAccess;
    // let isViewOwner;
    // let hasAccessToViews = [];
    // let outputView;
    // let filteredView;
    // const finalResult = allViews.map(async view => {
    //   hasViewReadAccess = hasAccess(view, "readUsers", email);
    //   hasViewWriteAccess = hasAccess(view, "writeUsers", email);
    //   isViewOwner = view.owner.email === email;
    //   if (hasViewReadAccess || hasViewWriteAccess || isViewOwner) {
    //     hasAccessToViews.push(view);
    //     outputView = await parseViews(hasAccessToViews, req.query);
    //     filteredView = pick(outputView[0], [
    //       "name",
    //       "uid",
    //       "groups",
    //       "metrics",
    //       "users",
    //       "temperatureMin",
    //       "temperatureMax"
    //     ]);
    //     return filteredView;
    //   }
    //   // throw new CustomError(404, NotFound);
    // });
    // const resolvedViews = await Promise.all(finalResult);
    // const removedNull = resolvedViews.filter(el => el);
    // return res.json({ views: removedNull });
    /************** Above code Works fine*********************/
    let views = await getAllViews(req.user, "read", req.query);
    views = views.filter(v => v.active);
    return res.json(await parseViews(views, req.query));
  },
  getViewGroupProjectsView: async (req, res) => {
    const view = res.locals.view;
    const group = await Group.findOne({
      uid: String(req.params.groupUid),
      active: true
    });

    if (!group) throw new CustomError(404, NotFound);
    let parsedProjects = parseViewProjects(view, req.query, group);
    return res.json(parsedProjects);
  },
  getViewGroupsView: async (req, res) => {
    const view = res.locals.view;
    let parsedGroups = parseViewGroups(view, req.query);
    return res.json(parsedGroups);
  }
};
