const mongoose = require("mongoose"),
  { fromPairs, sum, values } = require("lodash"),
  { polygonSchema } = require("./misc"),
  Issue = require("./issue"),
  Table = require("./table"),
  plugins = require("./plugins"),
  Joi = require("joi");
const userObj = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    }
  },
  { _id: false }
);

const parseViewQueryParams = view => {
  return {
    class_names: view.issueTypes || [],
    temperature_min: (view.temperatures || {}).min || null,
    temperature_max: (view.temperatures || {}).max || null
  };
};
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
const getViewQuery = function(queryParams) {
  filter_class_names = queryParams.class_names || [];
  temperature_minimum = queryParams.temperature_min || -1e6;
  temperature_maximum = queryParams.temperature_max || 1e6;

  classNameFilter = filter_class_names.length
    ? [{ class_name: { $in: filter_class_names } }]
    : [];
  temperatureFilter = [
    { temperature_difference: { $gte: temperature_minimum } },
    { temperature_difference: { $lte: temperature_maximum } }
  ];

  return { classNameFilter, temperatureFilter };
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

const viewSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      unique: true
    },
    active: {
      type: Boolean,
      default: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    // read_users: [userObj],
    // write_users: [userObj],
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    owner: {
      type: userObj
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization"
    },
    important: {
      type: Boolean
    },
    temperatures: {
      min: Number,
      max: Number
    },
    fromProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    },
    polygon: polygonSchema,
    tableNames: [String],
    metrics: {
      type: Object
    },
    issueTypes: [
      {
        type: String,
        enum: [
          "hotspot",
          "diode_failure",
          "module_failure",
          "module_reverse_polarity",
          "string_failure",
          "string_reverse_polarity"
        ]
      }
    ]
  },
  { timestamps: true }
);

viewSchema.index({
  name: "text",
  description: "text",
  "owner.email": "text",
  uid: "text"
});

viewSchema.pre("save", async function(next) {
  this.metrics = await getViewMetrics(this);
  next();
});

viewSchema.pre("find", function(next) {
  this.populate({
    path: "projects organization",
    populate: { path: "group" }
  });
  next();
});

viewSchema.pre("findOne", function(next) {
  this.populate({
    path: "projects organization",
    populate: { path: "group" }
  });
  next();
});

viewSchema.plugin(plugins.userPermissions);

function validateView(view) {
  const schema = {
    name: Joi.string().required(),
    description: Joi.string(),
    read_users: Joi.array().items(
      Joi.object({
        uid: Joi.string().required(),
        email: Joi.string()
          .required()
          .lowercase()
          .email()
      })
    ),
    write_users: Joi.array().items(
      Joi.object({
        uid: Joi.string().required(),
        email: Joi.string()
          .required()
          .lowercase()
          .email()
      })
    ),
    polygon: Joi.object({
      type: Joi.string()
        .required()
        .label("Polygon type")
        .valid(["Feature"]),
      geometry: Joi.object({
        type: Joi.string().valid(["Polygon"]),
        coordinates: Joi.array()
          .items(
            Joi.array()
              .items(
                Joi.array()
                  .min(2)
                  .label("Co-ordinates")
              )
              .min(4)
              .label("Co-ordinates")
          )
          .required()
          .label("Polygon co-ordinates")
      }),
      properties: Joi.object({
        uid: Joi.string(),
        class_name: Joi.string(),
        class_id: Joi.string(),
        raw_images: Joi.array().items(
          Joi.object({
            src: Joi.string().required(),
            location: Joi.array()
              .min(2)
              .max(2)
          })
        ),
        center: Joi.array().items(
          Joi.array()
            .min(2)
            .max(2)
        ),
        temperature_difference: Joi.number()
      })
    }).required(),
    projects: Joi.array().min(1),
    organization: Joi.string()
      .min(24)
      .max(24),
    important: Joi.boolean(),
    temperatures: Joi.object({
      min: Joi.number(),
      max: Joi.number()
    }),
    issueTypes: Joi.array().items(
      Joi.string().valid(
        "hotspot",
        "diode_failure",
        "module_failure",
        "module_reverse_polarity",
        "string_failure",
        "string_reverse_polarity"
      )
    )
  };
  return Joi.validate(view, schema);
}

module.exports.View = mongoose.model("View", viewSchema);
module.exports.validateView = validateView;
module.exports.userObj = userObj;
module.exports.getViewMetrics = getViewMetrics;
