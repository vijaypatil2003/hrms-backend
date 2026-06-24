const User = require("../models/User.model");
const AttendanceLog = require("../models/AttendanceLog.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const LeavePolicy = require("../models/LeavePolicy.model");
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

const runPayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ message: "employeeId, month and year are required" });
    }

    const existing = await Payroll.findOne({
      employee: employeeId,
      month,
      year,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Payroll already processed for this month" });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const workingDays = await getWorkingDays(month, year);
    const perDaySalary = employee.salary / workingDays;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(
      year,
      month - 1,
      workingDays === 0 ? 1 : new Date(year, month, 0).getDate(),
    );

    const attendanceLogs = await AttendanceLog.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    const lateMarks = attendanceLogs.filter((log) => log.isLate).length;
    const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: "approved",
      fromDate: { $gte: monthStart, $lte: monthEnd },
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

    const daysWithAttendance = attendanceLogs.length;
    const totalLeaveDaysTaken = paidLeaveUsed + unpaidLeaveDays;
    const presentOrLeaveDays = daysWithAttendance + totalLeaveDaysTaken;
    const absentDays = Math.max(workingDays - presentOrLeaveDays, 0);

    const policies = await LeavePolicy.find({
      employmentType: employee.employmentType,
    });
    const paidLeaveAllotted = policies
      .filter((p) => p.leaveType !== "Unpaid Leave")
      .reduce((sum, p) => sum + p.annualDays, 0);
    const paidLeaveRemaining = paidLeaveAllotted - paidLeaveUsed;

    const deductionDaysNeeded =
      absentDays + lateMarkDeductionDays + unpaidLeaveDays;
    const salaryDeductionDays =
      paidLeaveRemaining >= deductionDaysNeeded
        ? 0
        : deductionDaysNeeded - paidLeaveRemaining;

    const totalDeduction =
      Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
    const netSalary =
      Math.round((employee.salary - totalDeduction) * 100) / 100;
    const paidDays = workingDays - salaryDeductionDays;

    const payroll = await Payroll.create({
      employee: employeeId,
      month,
      year,
      grossSalary: employee.salary,
      workingDays,
      paidLeaveUsed,
      unpaidLeaveDays,
      absentDays,
      lateMarkDeductionDays,
      leaveBreakdown,
      paidDays,
      totalDeduction,
      netSalary,
    });

    res.status(201).json(payroll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPayrollHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") {
      filter.employee = req.user._id;
    } else if (req.query.employee) {
      filter.employee = req.query.employee;
    }

    const history = await Payroll.find(filter)
      .populate("employee", "name employeeId")
      .sort({ year: -1, month: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { runPayroll, getPayrollHistory };
