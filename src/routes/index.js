const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const employeeRoutes = require("./employee.routes");
const employmentTypeRoutes = require("./employmentType.routes");
const leavePolicyRoutes = require("./leavePolicy.routes");
const attendanceRoutes = require("./attendance.routes");

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/employment-types", employmentTypeRoutes);
router.use("/leave-policies", leavePolicyRoutes);
router.use("/attendance", attendanceRoutes);

module.exports = router;
