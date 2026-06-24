const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  runPayroll,
  getPayrollHistory,
  downloadSalarySlip,
} = require("../controllers/payroll.controller");

router.post("/run", protect, adminOnly, runPayroll);
router.get("/history", protect, getPayrollHistory);
router.get("/:id/slip", protect, downloadSalarySlip);

module.exports = router;
