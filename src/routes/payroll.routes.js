const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  runPayroll,
  getPayrollHistory,
} = require("../controllers/payroll.controller");

router.post("/run", protect, adminOnly, runPayroll);
router.get("/history", protect, getPayrollHistory);

module.exports = router;
