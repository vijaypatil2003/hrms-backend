const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    paidLeaveUsed: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    lateMarkDeductionDays: { type: Number, default: 0 },
    leaveBreakdown: [
      {
        leaveType: { type: String },
        days: { type: Number },
      },
    ],
    paidDays: { type: Number, default: 0 },
    salaryDeductionDays: { type: Number, default: 0 },
    leaveBalanceCovered: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
  },
  { timestamps: true },
);

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", payrollSchema);
