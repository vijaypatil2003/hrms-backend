const User = require("../models/User.model");

const generateEmployeeId = async () => {
  let employeeId;
  let isUnique = false;

  while (!isUnique) {
    const count = await User.countDocuments({ role: "employee" });
    employeeId = "EMP" + String(count + 1).padStart(3, "0");
    const existing = await User.findOne({ employeeId });
    if (!existing) isUnique = true;
  }

  return employeeId;
};

const createEmployee = async (payload) => {
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
  } = payload;

  if (!name || !email || !password) {
    throw { statusCode: 400, message: "Name, email and password are required" };
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw { statusCode: 400, message: "Email already exists" };
  }

  const employeeId = await generateEmployeeId();

  return await User.create({
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
};

const getEmployees = async (filters) => {
  const { search, status, employmentType } = filters;
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

  return await User.find(filter)
    .select("-password")
    .populate("employmentType reportingManager", "name");
};

const getEmployeeById = async (id) => {
  const employee = await User.findById(id)
    .select("-password")
    .populate("employmentType reportingManager", "name");

  if (!employee) {
    throw { statusCode: 404, message: "Employee not found" };
  }
  return employee;
};

const updateEmployee = async (id, payload) => {
  const employee = await User.findById(id);
  if (!employee) {
    throw { statusCode: 404, message: "Employee not found" };
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
    if (payload[field] !== undefined) employee[field] = payload[field];
  });

  await employee.save();
  return employee;
};

const deleteEmployee = async (id) => {
  const employee = await User.findById(id);
  if (!employee) {
    throw { statusCode: 404, message: "Employee not found" };
  }
  await employee.deleteOne();
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
