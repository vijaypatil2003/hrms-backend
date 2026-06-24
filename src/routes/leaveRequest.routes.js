const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
} = require("../controllers/leaveRequest.controller");

router.post("/", protect, applyLeave);
router.get("/me", protect, getMyLeaves);
router.get("/balance", protect, getLeaveBalance);
router.get("/", protect, adminOnly, getAllLeaves);
router.put("/:id/approve", protect, adminOnly, approveLeave);
router.put("/:id/reject", protect, adminOnly, rejectLeave);

module.exports = router;
