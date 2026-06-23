const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const { createLeavePolicy, getLeavePolicy, updateLeavePolicy } = require("../controllers/leavePolicy.controller");

router.post("/", protect, adminOnly, createLeavePolicy);
router.get("/:employmentTypeId", protect, getLeavePolicy);
router.put("/:id", protect, adminOnly, updateLeavePolicy);

module.exports = router;