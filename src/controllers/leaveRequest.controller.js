const LeaveRequest = require("../models/LeaveRequest.model");
const LeavePolicy = require("../models/LeavePolicy.model");
const User = require("../models/User.model");

const calculateLeaveDays = (fromDate, toDate, isHalfDay) => {
  if (isHalfDay) return 0.5;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffDays = (to - from) / (1000 * 60 * 60 * 24) + 1;
  return diffDays;
};

const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, isHalfDay, halfDaySession, reason } =
      req.body;

    if (!leaveType || !fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "leaveType, fromDate and toDate are required" });
    }

    const leave = await LeaveRequest.create({
      employee: req.user._id,
      leaveType,
      fromDate,
      toDate,
      isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession : null,
      reason,
    });

    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employee: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const { status, employee } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    const leaves = await LeaveRequest.find(filter)
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    leave.status = "approved";
    await leave.save();
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    leave.status = "rejected";
    await leave.save();
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.employmentType) {
      return res.json([]);
    }

    const policies = await LeavePolicy.find({
      employmentType: user.employmentType,
    });
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);

    const approvedLeaves = await LeaveRequest.find({
      employee: user._id,
      status: "approved",
      fromDate: { $gte: yearStart, $lte: yearEnd },
    });

    const balance = policies.map((policy) => {
      const usedDays = approvedLeaves
        .filter((leave) => leave.leaveType === policy.leaveType)
        .reduce(
          (sum, leave) =>
            sum +
            calculateLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
          0,
        );

      return {
        leaveType: policy.leaveType,
        available: policy.annualDays,
        used: usedDays,
        remaining: policy.annualDays - usedDays,
      };
    });

    res.json(balance);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
