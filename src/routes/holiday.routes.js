const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holiday.controller");

router.post("/", protect, adminOnly, createHoliday);
router.get("/", protect, getHolidays);
router.put("/:id", protect, adminOnly, updateHoliday);
router.delete("/:id", protect, adminOnly, deleteHoliday);

module.exports = router;
