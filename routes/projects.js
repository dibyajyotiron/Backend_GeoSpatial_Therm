const { Project, validateProject } = require("../models/project"),
	{ Group } = require("../models/group"),
	express = require("express"),
	{ CustomError } = require("../utils/errors"),
	{ hasAccess } = require("../utils/lib"),
	asyncMiddleware = require("../middleware/async"),
	auth = require("../middleware/auth"),
	router = express.Router();
router.get(
	"/:puid",
	auth,
	asyncMiddleware(async (req, res) => {
		const { puid } = req.params;

		const foundProject = await Project.findOne({ uid: puid })
			.populate("group")
			.lean();
		// let foundProject = await Project.aggregate([
		// 	{
		// 		$match: {
		// 			uid: puid,
		// 		},
		// 	},
		// 	{
		// 		$lookup: {
		// 			from: "groups",
		// 			localField: "group",
		// 			foreignField: "_id",
		// 			as: "group",
		// 		},
		// 	},
		// ])[0];

		// console.log(foundProject);
		if (!foundProject)
			throw new CustomError(
				"Not found",
				404,
				"No project with the given id exists!",
			);

		const guid = foundProject.group.uid;

		const foundGroup = await Group.findOne({ uid: guid }).lean();
		if (!foundGroup)
			throw new CustomError(
				"Not found",
				404,
				"No group with the given id exists!",
			);

		const { email } = req.user;

		const isProjectOwner = foundProject.owner.email === email;
		if (isProjectOwner) return res.json({ err: false, project: foundProject });

		const hasProjectReadAccess = hasAccess(foundProject, "readUsers", email);
		const hasProjectWriteAccess = hasAccess(foundProject, "writeUsers", email);
		if (hasProjectReadAccess || hasProjectWriteAccess)
			return res.json({ err: false, project: foundProject });

		const hasGroupWriteAccess = hasAccess(foundGroup, "writeUsers", email);
		const hasGroupReadAccess = hasAccess(foundGroup, "readUsers", email);
		const isGroupOwner = foundGroup.owner.email === email;
		if (!hasProjectReadAccess && !hasProjectWriteAccess) {
			if (isGroupOwner) return res.json({ err: false, project: foundProject });
			if (hasGroupReadAccess || hasGroupWriteAccess) {
				return res.json({ err: false, project: foundProject });
			}
		}
		throw new CustomError(
			"Unauthorized",
			403,
			"You're not authorized to view this resource",
		);
	}),
);

router.get(
	"/",
	auth,
	asyncMiddleware(async (req, res) => {
		const found = await Project.find({});
		return res.json({ err: false, projects: found });
	}),
);

router.post(
	"/",
	auth,
	asyncMiddleware(async (req, res) => {
		const { error } = validateProject(req.body);
		if (error)
			return res.status(400).json({
				err: true,
				reason: error.details[0].message,
			});
		const newProject = new Project({
			...req.body,
			owner: {
				uid: req.user.uid,
				email: req.user.email,
			},
		});
		console.log(req.user);
		const savedProject = await newProject.save();
		return res.json({
			err: false,
			project: savedProject,
		});
	}),
);

module.exports = router;
