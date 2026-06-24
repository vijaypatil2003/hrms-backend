const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const employeeRoutes = require("./employee.routes");
const employmentTypeRoutes = require("./employmentType.routes");
const leavePolicyRoutes = require("./leavePolicy.routes");
const attendanceRoutes = require("./attendance.routes");
const leaveRequestRoutes = require("./leaveRequest.routes");
const holidayRoutes = require("./holiday.routes");
const payrollRoutes = require("./payroll.routes");

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/employment-types", employmentTypeRoutes);
router.use("/leave-policies", leavePolicyRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leaves", leaveRequestRoutes);
router.use("/holidays", holidayRoutes);
router.use("/payroll", payrollRoutes);

module.exports = router;
