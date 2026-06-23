const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employee.controller");

router.post("/", protect, adminOnly, createEmployee);
router.get("/", protect, adminOnly, getEmployees);
router.get("/:id", protect, getEmployeeById);
router.put("/:id", protect, adminOnly, updateEmployee);
router.delete("/:id", protect, adminOnly, deleteEmployee);

module.exports = router;
