const User = require("../models/User.model");
const AttendanceLog = require("../models/AttendanceLog.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const Holiday = require("../models/Holiday.model");
const Payroll = require("../models/Payroll.model");

const getWorkingDays = async (month, year) => {
  const totalDays = new Date(year, month, 0).getDate();
  const holidays = await Holiday.find({
    date: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month - 1, totalDays),
    },
  });

  let workingDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const current = new Date(year, month - 1, day);
    const dayOfWeek = current.getDay();
    const isHoliday = holidays.some(
      (h) => new Date(h.date).toDateString() === current.toDateString(),
    );
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
      workingDays++;
    }
  }
  return workingDays;
};

const processPayroll = async (employeeId, month, year) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    throw { statusCode: 400, message: "Cannot run payroll for a future month" };
  }

  const existing = await Payroll.findOne({ employee: employeeId, month, year });
  if (existing) {
    throw {
      statusCode: 400,
      message: "Payroll already processed for this month",
    };
  }

  const employee = await User.findById(employeeId);
  if (!employee) {
    throw { statusCode: 404, message: "Employee not found" };
  }

  const workingDays = await getWorkingDays(month, year);
  const perDaySalary = employee.salary / workingDays;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const attendanceLogs = await AttendanceLog.find({
    employee: employeeId,
    date: { $gte: monthStart, $lte: monthEnd },
  });

  const uniquePresentDates = new Set(
    attendanceLogs.map((log) => new Date(log.date).toDateString()),
  );
  const daysWithAttendance = uniquePresentDates.size;

  const lateDaySet = new Set();
  attendanceLogs.forEach((log) => {
    if (log.isLate) lateDaySet.add(new Date(log.date).toDateString());
  });
  const lateMarks = lateDaySet.size;
  const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

  const approvedLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: "approved",
    fromDate: { $lte: monthEnd },
    toDate: { $gte: monthStart },
  });

  let paidLeaveUsed = 0;
  let unpaidLeaveDays = 0;
  const leaveBreakdownMap = {};

  approvedLeaves.forEach((leave) => {
    const days = leave.isHalfDay
      ? 0.5
      : (new Date(leave.toDate) - new Date(leave.fromDate)) /
          (1000 * 60 * 60 * 24) +
        1;

    if (leave.leaveType === "Unpaid Leave") {
      unpaidLeaveDays += days;
    } else {
      paidLeaveUsed += days;
    }
    leaveBreakdownMap[leave.leaveType] =
      (leaveBreakdownMap[leave.leaveType] || 0) + days;
  });

  const leaveBreakdown = Object.keys(leaveBreakdownMap).map((leaveType) => ({
    leaveType,
    days: leaveBreakdownMap[leaveType],
  }));

  const totalLeaveDaysTaken = paidLeaveUsed + unpaidLeaveDays;
  const presentOrLeaveDays = daysWithAttendance + totalLeaveDaysTaken;
  const absentDays = Math.max(workingDays - presentOrLeaveDays, 0);
  const salaryDeductionDays =
    absentDays + lateMarkDeductionDays + unpaidLeaveDays;
  const totalDeduction =
    Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
  const netSalary = Math.round((employee.salary - totalDeduction) * 100) / 100;
  const paidDays = workingDays - salaryDeductionDays;

  return await Payroll.create({
    employee: employeeId,
    month,
    year,
    grossSalary: employee.salary,
    workingDays,
    paidLeaveUsed,
    unpaidLeaveDays,
    absentDays,
    presentDays: daysWithAttendance,
    lateMarkDeductionDays,
    leaveBreakdown,
    paidDays,
    salaryDeductionDays,
    leaveBalanceCovered: 0,
    totalDeduction,
    netSalary,
  });
};

const getHistory = async (userId, role, employeeFilter) => {
  const filter = {};
  if (role !== "admin") {
    filter.employee = userId;
  } else if (employeeFilter) {
    filter.employee = employeeFilter;
  }

  return await Payroll.find(filter)
    .populate("employee", "name employeeId")
    .sort({ year: -1, month: -1 });
};

const resetPayrollRecord = async (employeeId, month, year) => {
  const result = await Payroll.findOneAndDelete({
    employee: employeeId,
    month,
    year,
  });
  if (!result) {
    throw { statusCode: 404, message: "Payroll record not found" };
  }
  return result;
};

const getPayrollById = async (id) => {
  const payroll = await Payroll.findById(id).populate(
    "employee",
    "name employeeId designation",
  );
  if (!payroll) {
    throw { statusCode: 404, message: "Payroll not found" };
  }
  return payroll;
};

module.exports = {
  processPayroll,
  getHistory,
  resetPayrollRecord,
  getPayrollById,
};
