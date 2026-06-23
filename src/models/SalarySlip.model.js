const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filePath: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SalarySlip", salarySlipSchema);
