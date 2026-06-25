  const mongoose = require("mongoose");

  const attendanceLogSchema = new mongoose.Schema(
    {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
      date: { type: Date, required: true },
      punches: [
        {
          inTime: { type: Date },
          outTime: { type: Date },
        },
      ],
      totalWorkHours: { type: Number, default: 0 },
      totalBreakMins: { type: Number, default: 0 },
      isLate: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  module.exports = mongoose.model("AttendanceLog", attendanceLogSchema);