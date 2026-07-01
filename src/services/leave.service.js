const LeaveRequest = require("../models/LeaveRequest.model");
const LeavePolicy = require("../models/LeavePolicy.model");
const User = require("../models/User.model");

const calculateLeaveDays = (fromDate, toDate, isHalfDay) => {
  if (isHalfDay) return 0.5;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return (to - from) / (1000 * 60 * 60 * 24) + 1;
};

const validateLeaveInput = (fromDate, toDate, isHalfDay, halfDaySession) => {
  if (new Date(toDate) < new Date(fromDate)) {
    throw { statusCode: 400, message: "toDate cannot be before fromDate" };
  }
  if (isHalfDay && fromDate !== toDate) {
    throw {
      statusCode: 400,
      message: "Half day leave must have the same fromDate and toDate",
    };
  }
  if (isHalfDay && !["first", "second"].includes(halfDaySession)) {
    throw {
      statusCode: 400,
      message: "halfDaySession must be 'first' or 'second'",
    };
  }
};

const checkLeaveBalance = async (userId, employmentType, leaveType, days) => {
  const policy = await LeavePolicy.find({ employmentType, leaveType });
  const allotted = policy.reduce((sum, p) => sum + p.annualDays, 0);

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const usedLeaves = await LeaveRequest.find({
    employee: userId,
    leaveType,
    status: "approved",
    fromDate: { $gte: yearStart },
  });

  const used = usedLeaves.reduce(
    (sum, l) => sum + calculateLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
    0,
  );

  const remaining = allotted - used;
  if (days > remaining) {
    throw {
      statusCode: 400,
      message: `Insufficient leave balance. Remaining ${leaveType}: ${remaining} days`,
    };
  }
};

const applyLeave = async (userId, payload) => {
  const { leaveType, fromDate, toDate, isHalfDay, halfDaySession, reason } =
    payload;

  if (!leaveType || !fromDate || !toDate) {
    throw {
      statusCode: 400,
      message: "leaveType, fromDate and toDate are required",
    };
  }

  validateLeaveInput(fromDate, toDate, isHalfDay, halfDaySession);

  const days = calculateLeaveDays(fromDate, toDate, isHalfDay);

  if (leaveType !== "Unpaid Leave") {
    const user = await User.findById(userId);
    await checkLeaveBalance(userId, user.employmentType, leaveType, days);
  }

  return await LeaveRequest.create({
    employee: userId,
    leaveType,
    fromDate,
    toDate,
    isHalfDay,
    halfDaySession: isHalfDay ? halfDaySession : null,
    reason,
  });
};

const getMyLeaves = async (userId) => {
  return await LeaveRequest.find({ employee: userId }).sort({ createdAt: -1 });
};

const getAllLeaves = async (filters) => {
  const filter = {};
  if (filters.status) filter.status = filters.status;
  if (filters.employee) filter.employee = filters.employee;

  return await LeaveRequest.find(filter)
    .populate("employee", "name employeeId")
    .sort({ createdAt: -1 });
};

const approveLeave = async (leaveId) => {
  const leave = await LeaveRequest.findById(leaveId);
  if (!leave) throw { statusCode: 404, message: "Leave request not found" };
  leave.status = "approved";
  await leave.save();
  return leave;
};

const rejectLeave = async (leaveId) => {
  const leave = await LeaveRequest.findById(leaveId);
  if (!leave) throw { statusCode: 404, message: "Leave request not found" };
  leave.status = "rejected";
  await leave.save();
  return leave;
};

const getLeaveBalance = async (userId) => {
  const user = await User.findById(userId);
  if (!user.employmentType) return [];

  const policies = await LeavePolicy.find({
    employmentType: user.employmentType,
  });
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearEnd = new Date(new Date().getFullYear(), 11, 31);

  const approvedLeaves = await LeaveRequest.find({
    employee: userId,
    status: "approved",
    fromDate: { $gte: yearStart, $lte: yearEnd },
  });

  return policies.map((policy) => {
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
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
};
