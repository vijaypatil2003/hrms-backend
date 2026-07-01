const employeeService = require("../services/employee.service");

const createEmployee = async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json(employee);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const employees = await employeeService.getEmployees(req.query);
    res.json(employees);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== req.params.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.json(employee);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await employeeService.updateEmployee(
      req.params.id,
      req.body,
    );
    res.json(employee);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    await employeeService.deleteEmployee(req.params.id);
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
