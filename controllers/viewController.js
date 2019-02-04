const { View, validateView } = require("../models/view"),
  { Project } = require("../models/project"),
  { Group } = require("../models/group"),
  { Organization } = require("../models/organization"),
  { CustomError } = require("../utils/errors"),
  { NotFound, Unauthorized } = require("../utils/errorMessages"),
  { hasAccess } = require("../utils/lib"),
  { getAllViews } = require("./baseViewController"),
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
    const update = includes(["/update", "/update/"], req.url);
    let foundView;

    const { read_users, write_users } = req.body;
    const { email } = req.user;
    const { orgUid } = req.params;
    const { projects } = req.body;

    if (
      (req.body.temperatures &&
        Object.keys(req.body.temperatures).length > 0) ||
      (req.body.issueTypes && req.body.issueTypes.length > 0)
    ) {
      if (req.body.write_users && req.body.write_users.length > 0)
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

    if (req.body.uid && update) {
      foundView = await View.findOne({ uid: req.body.uid });
      if (!foundView) throw new CustomError(404, NotFound);

      if (!foundView.checkPerm(req.user, "writeUsers"))
        throw new CustomError(403, Unauthorized);

      foundView.issueTypes = req.body.foundView
        ? req.body.foundView
        : foundView.issueTypes;

      foundView.temperatures =
        Object.keys(req.body.temperatures).length > 0
          ? { ...req.body.temperatures }
          : foundView.temperatures;

      foundView.writeUsers =
        write_users.length > 0 ? [...write_users] : foundView.writeUsers;

      foundView.readUsers =
        read_users.length > 0 ? [...read_users] : foundView.readUsers;

      foundView.name = req.body.name ? req.body.name : foundView.name;

      const foundProjects = await Project.find({
        uid: { $in: projects }
      });
      let projectsWithWriteAccess = [];
      for (let project of foundProjects) {
        const hasProjectWriteAccess = hasAccess(project, "writeUsers", email);
        const isProjectOwner = project.owner.email === email;

        if (hasProjectWriteAccess || isProjectOwner)
          projectsWithWriteAccess.push(project);
      }
      if (!projectsWithWriteAccess.length)
        throw new CustomError(
          400,
          "Provide projects where you've write access!"
        );
      foundView.projects = req.body.projects
        ? projectsWithWriteAccess
        : foundView.projects;

      foundView.polygon = req.body.polygon
        ? req.body.polygon
        : foundView.polygon;
    }

    const { error } = validateView(req.body);

    if (error) throw new CustomError(400, error.details[0].message);

    const foundProjects = await Project.find({ uid: { $in: projects } });
    let projectsWithWriteAccess = [];
    for (let project of foundProjects) {
      const hasProjectWriteAccess = hasAccess(project, "writeUsers", email);
      const isProjectOwner = project.owner.email === email;

      if (hasProjectWriteAccess || isProjectOwner)
        projectsWithWriteAccess.push(project);
    }
    if (!projectsWithWriteAccess.length)
      throw new CustomError(400, "Provide projects where you've write access!");
    const foundOrg = await Organization.findById(orgUid);
    if (!foundOrg) throw new CustomError(404, NotFound);

    const newView = new View(req.body);
    newView.uid = `${newView.name.split(" ").shift()}-UN_${Date.now()}`;
    newView.projects = projectsWithWriteAccess;
    newView.polygon = req.body.polygon;
    newView.owner = { ...req.user };
    // newView.read_users = [...req.body.read_users];
    // newView.write_users = req.body.write_users ? [...req.body.write_users] : [];
    newView.important = true;
    await newView.save();
    return res.json({ error: false, message: "Successfully added views" });
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
    return res.json({ error: false, view: filteredView });
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
    // return res.json({ error: false, views: removedNull });
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
