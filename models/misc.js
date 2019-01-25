const mongoose = require("mongoose"),
  { Schema } = mongoose,
  Joi = require("joi"),
  { isEqual } = require("lodash");
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
      enum: ["Feature"],
      required: true
    },
    properties: {
      uid: String,
      class_name: {
        type: String,
        enum: [
          "table",
          "hotspot",
          "diode_failure",
          "module_failure",
          "module_reverse_polarity",
          "string_failure",
          "string_reverse_polarity"
        ]
      },
      class_id: String,
      raw_images: [rawImage],
      center: [[Number]],
      temperature_difference: Number
    }
  },
  { _id: false }
);

function validateVector(polygonCoordinates) {
  let coordinate = polygonCoordinates.map(el => {
    let length = el.length;
    let first = el[0];
    let last = el[length - 1];
    if (first.length !== last.length)
      return "First and last co-ordinates should be equal";
    return JSON.stringify(first) === JSON.stringify(last);
  });
  return coordinate;
}

function validateFeature(feature) {
  const schema = {
    geometry: Joi.object({
      type: Joi.string()
        .required()
        .label("Location type")
        .valid(["Polygon"]),
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
        .label("Location co-ordinates")
    }).required(),
    type: Joi.string()
      .valid(["Feature"])
      .required(),
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
  };
  return Joi.validate(feature, schema);
}

module.exports = {
  rawImage,
  polygonSchema,
  validateVector,
  validateFeature
};
