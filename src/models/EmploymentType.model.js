const mongoose = require("mongoose");

const employmentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmploymentType", employmentTypeSchema);
