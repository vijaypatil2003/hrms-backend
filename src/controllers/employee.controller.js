const User = require("../models/User.model");

const generateEmployeeId = async () => {
  const count = await User.countDocuments({ role: "employee" });
  return "EMP" + String(count + 1).padStart(3, "0");
};

const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      dateOfJoining,
      designation,
      salary,
      employmentType,
      reportingManager,
    } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const employeeId = await generateEmployeeId();

    const employee = await User.create({
      employeeId,
      name,
      email,
      password,
      phone,
      dateOfJoining,
      designation,
      salary,
      employmentType,
      reportingManager,
      role: "employee",
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const { search, status, employmentType } = req.query;
    const filter = { role: "employee" };

    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await User.find(filter)
      .select("-password")
      .populate("employmentType reportingManager", "name");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    const employee = await User.findById(req.params.id)
      .select("-password")
      .populate("employmentType reportingManager", "name");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const fields = [
      "name",
      "phone",
      "dateOfJoining",
      "designation",
      "salary",
      "employmentType",
      "reportingManager",
      "status",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    });

    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    await employee.deleteOne();
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
