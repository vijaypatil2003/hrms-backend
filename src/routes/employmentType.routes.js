const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const { createEmploymentType, getEmploymentTypes } = require("../controllers/employmentType.controller");

router.post("/", protect, adminOnly, createEmploymentType);
router.get("/", protect, getEmploymentTypes);

module.exports = router;