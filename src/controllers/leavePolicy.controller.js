const LeavePolicy = require("../models/LeavePolicy.model");

const createLeavePolicy = async (req, res) => {
  try {
    const { employmentType, leaveType, annualDays } = req.body;
    if (!employmentType || !leaveType || annualDays === undefined) {
      return res.status(400).json({
        message: "employmentType, leaveType and annualDays are required",
      });
    }

    const existing = await LeavePolicy.findOne({ employmentType, leaveType });
    if (existing) {
      return res.status(400).json({
        message: `Leave policy for "${leaveType}" already exists for this employment type`,
      });
    }

    const policy = await LeavePolicy.create({
      employmentType,
      leaveType,
      annualDays,
    });
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getLeavePolicy = async (req, res) => {
  try {
    const policies = await LeavePolicy.find({
      employmentType: req.params.employmentTypeId,
    });
    res.json(policies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ message: "Leave policy not found" });
    }

    if (req.body.annualDays !== undefined)
      policy.annualDays = req.body.annualDays;
    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createLeavePolicy, getLeavePolicy, updateLeavePolicy };
