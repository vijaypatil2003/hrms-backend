const mongoose = require("mongoose");

const leavePolicySchema = new mongoose.Schema(
  {
    employmentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmploymentType",
      required: true,
    },
    leaveType: { type: String, required: true },
    annualDays: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeavePolicy", leavePolicySchema);
