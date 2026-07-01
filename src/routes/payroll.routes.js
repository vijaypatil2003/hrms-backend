const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  runPayroll,
  getPayrollHistory,
  downloadSalarySlip,
  resetPayroll,
} = require("../controllers/payroll.controller");

router.post("/run", protect, adminOnly, runPayroll);
router.get("/history", protect, getPayrollHistory);
router.get("/:id/slip", protect, downloadSalarySlip);
router.delete("/reset", protect, adminOnly, resetPayroll);

module.exports = router;
