const EmploymentType = require("../models/EmploymentType.model");

const createEmploymentType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const existing = await EmploymentType.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Employment type already exists" });
    }

    const employmentType = await EmploymentType.create({ name });
    res.status(201).json(employmentType);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmploymentTypes = async (req, res) => {
  try {
    const types = await EmploymentType.find();
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createEmploymentType, getEmploymentTypes };