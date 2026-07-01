const leaveService = require("../services/leave.service");

const applyLeave = async (req, res) => {
  try {
    const leave = await leaveService.applyLeave(req.user._id, req.body);
    res.status(201).json(leave);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await leaveService.getMyLeaves(req.user._id);
    res.json(leaves);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const leaves = await leaveService.getAllLeaves(req.query);
    res.json(leaves);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const approveLeave = async (req, res) => {
  try {
    const leave = await leaveService.approveLeave(req.params.id);
    res.json(leave);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const leave = await leaveService.rejectLeave(req.params.id);
    res.json(leave);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const balance = await leaveService.getLeaveBalance(req.user._id);
    res.json(balance);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
};
