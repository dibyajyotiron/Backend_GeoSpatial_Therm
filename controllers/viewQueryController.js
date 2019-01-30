getViewQuery = function(queryParams) {
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

parseViewQueryParams = view => {
  return {
    class_names: view.issueTypes || [],
    temperature_min: (view.temperatures || {}).min || null,
    temperature_max: (view.temperatures || {}).max || null
  };
};

module.exports = {
  getViewQuery,
  parseViewQueryParams
};
