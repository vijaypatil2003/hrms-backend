const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  punchIn,
  punchOut,
  getMyAttendance,
  getAllAttendance,
} = require("../controllers/attendance.controller");

router.post("/punch-in", protect, punchIn);
router.post("/punch-out", protect, punchOut);
router.get("/me", protect, getMyAttendance);
router.get("/", protect, adminOnly, getAllAttendance);

module.exports = router;
