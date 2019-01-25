module.exports = {
  ALLOWED_ROLES: ["hacker", "qc_team", "bot", "data_team"],
  TABLE_CLASSES: ["table"],
  ISSUE_CLASSES: [
    "hotspot",
    "diode_failure",
    "module_failure",
    "module_reverse_polarity",
    "string_failure",
    "string_reverse_polarity"
  ],

  ISSUE_TYPES: [
    { class_name: "hotspot", display_name: "Hotspot", class_id: 101 },
    {
      class_name: "diode_failure",
      display_name: "Diode Failure",
      class_id: 102
    },
    {
      class_name: "module_failure",
      display_name: "Module Failure",
      class_id: 103
    },
    {
      class_name: "module_reverse_polarity",
      display_name: "Module Reverse Polarity",
      class_id: 104
    },
    {
      class_name: "string_failure",
      display_name: "String Failure",
      class_id: 105
    },
    {
      class_name: "string_reverse_polarity",
      display_name: "String Reverse Polarity",
      class_id: 106
    }
  ]
};
