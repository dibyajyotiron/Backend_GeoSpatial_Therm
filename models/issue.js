"use strict";

const mongoose = require("mongoose"),
  { Schema } = mongoose;
require("mongoose-type-url");
const rawImage = new Schema(
  {
    location: [Number],
    src: [mongoose.SchemaTypes.Url]
  },
  { _id: false }
);

const polygonSchema = new Schema(
  {
    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true
      },
      coordinates: {
        type: [[[Number]]],
        required: true
      }
    },
    type: {
      type: String,
      enum: ["Feature"]
    },
    properties: Object
  },
  { _id: false }
);

const issueSchema = new Schema(
  {
    uid: {
      type: String,
      required: true
    },
    polygon: polygonSchema,
    class_id: {
      type: Number,
      required: true
    },
    class_name: {
      type: String,
      required: true
    },
    raw_images: [rawImage],
    temperature_difference: Number,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    table: {
      type: Schema.Types.ObjectId,
      ref: "Table"
    },
    location: [Number]
  },
  { timestamps: true }
);

issueSchema.pre("find", function(next) {
  this.populate({
    path: "project table"
  });
  next();
});

issueSchema.pre("findOne", function(next) {
  this.populate({
    path: "project table"
  });
  next();
});

module.exports = mongoose.model("Issue", issueSchema);
