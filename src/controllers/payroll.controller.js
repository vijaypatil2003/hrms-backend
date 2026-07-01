const PDFDocument = require("pdfkit");
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
    const monthEnd = new Date(year, month, 0);

    // Present days — distinct dates only (multiple punches per day)
    const attendanceLogs = await AttendanceLog.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
    });

    const uniquePresentDates = new Set(
      attendanceLogs.map((log) => new Date(log.date).toDateString()),
    );
    const daysWithAttendance = uniquePresentDates.size;

    // Late marks — max 1 per day
    const lateDaySet = new Set();
    attendanceLogs.forEach((log) => {
      if (log.isLate) lateDaySet.add(new Date(log.date).toDateString());
    });
    const lateMarks = lateDaySet.size;
    const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

    // Approved leaves overlapping this month
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

    // Deduction = absent + late + unpaid only
    // Paid approved leaves don't cause deduction (employee applied and got approved)
    // Absent days are NOT auto-covered by leave balance — straight cut
    const salaryDeductionDays =
      absentDays + lateMarkDeductionDays + unpaidLeaveDays;

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
      presentDays: daysWithAttendance,
      lateMarkDeductionDays,
      leaveBreakdown,
      paidDays,
      salaryDeductionDays,
      leaveBalanceCovered: 0,
      totalDeduction,
      netSalary,
    });

    res.status(201).json(payroll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// const runPayroll = async (req, res) => {
//   try {
//     const { employeeId, month, year } = req.body;
//     if (!employeeId || !month || !year) {
//       return res
//         .status(400)
//         .json({ message: "employeeId, month and year are required" });
//     }

//     const existing = await Payroll.findOne({
//       employee: employeeId,
//       month,
//       year,
//     });
//     if (existing) {
//       return res
//         .status(400)
//         .json({ message: "Payroll already processed for this month" });
//     }

//     const employee = await User.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     const workingDays = await getWorkingDays(month, year);
//     const perDaySalary = employee.salary / workingDays;

//     // FIX 1: monthEnd = actual last calendar day, not based on workingDays
//     const monthStart = new Date(year, month - 1, 1);
//     const monthEnd = new Date(year, month, 0); // last day of month

//     // FIX 2: present days = distinct dates with attendance, not total log docs
//     const attendanceLogs = await AttendanceLog.find({
//       employee: employeeId,
//       date: { $gte: monthStart, $lte: monthEnd },
//     });

//     const uniquePresentDates = new Set(
//       attendanceLogs.map((log) => new Date(log.date).toDateString()),
//     );
//     const daysWithAttendance = uniquePresentDates.size;

//     // Late marks — one per day max (group by date, take worst)
//     const lateLogsByDate = {};
//     attendanceLogs.forEach((log) => {
//       const dateStr = new Date(log.date).toDateString();
//       if (log.isLate) lateLogsByDate[dateStr] = true;
//     });
//     const lateMarks = Object.keys(lateLogsByDate).length;
//     const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

//     // Approved leaves that overlap with this month
//     const approvedLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       fromDate: { $lte: monthEnd },
//       toDate: { $gte: monthStart },
//     });

//     let paidLeaveUsed = 0;
//     let unpaidLeaveDays = 0;
//     const leaveBreakdownMap = {};

//     approvedLeaves.forEach((leave) => {
//       const days = leave.isHalfDay
//         ? 0.5
//         : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//             (1000 * 60 * 60 * 24) +
//           1;

//       if (leave.leaveType === "Unpaid Leave") {
//         unpaidLeaveDays += days;
//       } else {
//         paidLeaveUsed += days;
//       }
//       leaveBreakdownMap[leave.leaveType] =
//         (leaveBreakdownMap[leave.leaveType] || 0) + days;
//     });

//     const leaveBreakdown = Object.keys(leaveBreakdownMap).map((leaveType) => ({
//       leaveType,
//       days: leaveBreakdownMap[leaveType],
//     }));

//     const totalLeaveDaysTaken = paidLeaveUsed + unpaidLeaveDays;
//     const presentOrLeaveDays = daysWithAttendance + totalLeaveDaysTaken;
//     const absentDays = Math.max(workingDays - presentOrLeaveDays, 0);

//     // Annual leave quota for this employment type
//     const policies = await LeavePolicy.find({
//       employmentType: employee.employmentType,
//     });
//     const paidLeaveAllotted = policies
//       .filter((p) => p.leaveType !== "Unpaid Leave")
//       .reduce((sum, p) => sum + p.annualDays, 0);

//     // FIX 3: YTD paid leave used BEFORE this month (not including current month)
//     // So balance = what was remaining entering this month
//     const yearStart = new Date(year, 0, 1);
//     const prevMonthEnd = new Date(year, month - 1, 0); // last day of previous month

//     const yearToDateLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       leaveType: { $ne: "Unpaid Leave" },
//       fromDate: { $gte: yearStart, $lte: prevMonthEnd },
//     });

//     const paidLeaveUsedBeforeThisMonth = yearToDateLeaves.reduce(
//       (sum, leave) => {
//         const days = leave.isHalfDay
//           ? 0.5
//           : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//               (1000 * 60 * 60 * 24) +
//             1;
//         return sum + days;
//       },
//       0,
//     );

//     // Balance entering this month
//     const paidLeaveBalanceEntering = Math.max(
//       paidLeaveAllotted - paidLeaveUsedBeforeThisMonth,
//       0,
//     );

//     // Deductions needed this month
//     const deductionDaysNeeded =
//       absentDays + lateMarkDeductionDays + unpaidLeaveDays;

//     // How much of deduction can be covered by remaining paid leave balance
//     const leaveBalanceCovered = 0
//     // const leaveBalanceCovered = Math.min(
//     //   paidLeaveBalanceEntering,
//     //   deductionDaysNeeded,
//     // );

//     // Only this much actually hits salary
//     const salaryDeductionDays =
//       absentDays + lateMarkDeductionDays + unpaidLeaveDays;

//     // const salaryDeductionDays = Math.max(
//     //   deductionDaysNeeded - leaveBalanceCovered,
//     //   0,
//     // );

//     // const totalDeduction =
//     //   Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
//     // const netSalary =
//     //   Math.round((employee.salary - totalDeduction) * 100) / 100;
//     // const paidDays = workingDays - salaryDeductionDays;

//     const totalDeduction =
//       Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
//     const netSalary =
//       Math.round((employee.salary - totalDeduction) * 100) / 100;
//     const paidDays = workingDays - salaryDeductionDays;
//     const payroll = await Payroll.create({
//       employee: employeeId,
//       month,
//       year,
//       grossSalary: employee.salary,
//       workingDays,
//       paidLeaveUsed,
//       unpaidLeaveDays,
//       absentDays,
//       presentDays: daysWithAttendance,
//       lateMarkDeductionDays,
//       leaveBreakdown,
//       paidDays,
//       salaryDeductionDays,
//       leaveBalanceCovered,
//       totalDeduction,
//       netSalary,
//     });

//     res.status(201).json(payroll);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// ==========================================================
// const runPayroll = async (req, res) => {
//   try {
//     const { employeeId, month, year } = req.body;
//     if (!employeeId || !month || !year) {
//       return res
//         .status(400)
//         .json({ message: "employeeId, month and year are required" });
//     }

//     const existing = await Payroll.findOne({
//       employee: employeeId,
//       month,
//       year,
//     });
//     if (existing) {
//       return res
//         .status(400)
//         .json({ message: "Payroll already processed for this month" });
//     }

//     const employee = await User.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     const workingDays = await getWorkingDays(month, year);
//     const perDaySalary = employee.salary / workingDays;

//     const monthStart = new Date(year, month - 1, 1);
//     const monthEnd = new Date(
//       year,
//       month - 1,
//       workingDays === 0 ? 1 : new Date(year, month, 0).getDate(),
//     );

//     const attendanceLogs = await AttendanceLog.find({
//       employee: employeeId,
//       date: { $gte: monthStart, $lte: monthEnd },
//     });

//     const lateMarks = attendanceLogs.filter((log) => log.isLate).length;
//     const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

//     const approvedLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       fromDate: { $gte: monthStart, $lte: monthEnd },
//     });

//     let paidLeaveUsed = 0;
//     let unpaidLeaveDays = 0;
//     const leaveBreakdownMap = {};

//     approvedLeaves.forEach((leave) => {
//       const days = leave.isHalfDay
//         ? 0.5
//         : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//             (1000 * 60 * 60 * 24) +
//           1;
//       if (leave.leaveType === "Unpaid Leave") {
//         unpaidLeaveDays += days;
//       } else {
//         paidLeaveUsed += days;
//       }
//       leaveBreakdownMap[leave.leaveType] =
//         (leaveBreakdownMap[leave.leaveType] || 0) + days;
//     });

//     const leaveBreakdown = Object.keys(leaveBreakdownMap).map((leaveType) => ({
//       leaveType,
//       days: leaveBreakdownMap[leaveType],
//     }));

//     const daysWithAttendance = attendanceLogs.length;
//     const totalLeaveDaysTaken = paidLeaveUsed + unpaidLeaveDays;
//     const presentOrLeaveDays = daysWithAttendance + totalLeaveDaysTaken;
//     const absentDays = Math.max(workingDays - presentOrLeaveDays, 0);

//     const policies = await LeavePolicy.find({
//       employmentType: employee.employmentType,
//     });
//     const paidLeaveAllotted = policies
//       .filter((p) => p.leaveType !== "Unpaid Leave")
//       .reduce((sum, p) => sum + p.annualDays, 0);

//     const yearStart = new Date(year, 0, 1);
//     const yearToDateLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       leaveType: { $ne: "Unpaid Leave" },
//       fromDate: { $gte: yearStart, $lte: monthEnd },
//     });

//     const paidLeaveUsedYTD = yearToDateLeaves.reduce((sum, leave) => {
//       const days = leave.isHalfDay
//         ? 0.5
//         : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//             (1000 * 60 * 60 * 24) +
//           1;
//       return sum + days;
//     }, 0);

//     const paidLeaveRemaining = paidLeaveAllotted - paidLeaveUsedYTD;

//     const deductionDaysNeeded =
//       absentDays + lateMarkDeductionDays + unpaidLeaveDays;
//     const salaryDeductionDays =
//       paidLeaveRemaining >= deductionDaysNeeded
//         ? 0
//         : deductionDaysNeeded - paidLeaveRemaining;

//     const totalDeduction =
//       Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
//     const netSalary =
//       Math.round((employee.salary - totalDeduction) * 100) / 100;
//     const paidDays = workingDays - salaryDeductionDays;
//     const leaveBalanceCovered = Math.max(
//       Math.min(paidLeaveRemaining, deductionDaysNeeded),
//       0,
//     );

//     const payroll = await Payroll.create({
//       employee: employeeId,
//       month,
//       year,
//       grossSalary: employee.salary,
//       workingDays,
//       paidLeaveUsed,
//       unpaidLeaveDays,
//       absentDays,
//       presentDays: daysWithAttendance,
//       lateMarkDeductionDays,
//       leaveBreakdown,
//       paidDays,
//       salaryDeductionDays,
//       leaveBalanceCovered,
//       totalDeduction,
//       netSalary,
//     });

//     res.status(201).json(payroll);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
const downloadSalarySlip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate(
      "employee",
      "name employeeId designation",
    );

    if (!payroll) {
      return res.status(404).json({ message: "Payroll not found" });
    }

    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== payroll.employee._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=salary-slip-${payroll.month}-${payroll.year}.pdf`,
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Mobicloud Technologies Pvt Ltd", { align: "left" });
    doc.fontSize(10).fillColor("gray").text("Salary Slip", {
      align: "right",
    });
    doc.fillColor("black");

    doc.moveDown();
    doc.moveTo(40, 90).lineTo(550, 90).stroke();

    // Employee Details
    doc.moveDown();
    doc.fontSize(12).text("EMPLOYEE DETAILS", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Employee Name : ${payroll.employee.name}`);
    doc.text(`Employee ID : ${payroll.employee.employeeId}`);
    doc.text(`Designation : ${payroll.employee.designation || "-"}`);
    doc.text(`Pay Period : ${payroll.month}/${payroll.year}`);

    // Net Salary Box
    doc.rect(350, 120, 180, 80).stroke();
    doc.fontSize(18).text(`Rs ${payroll.netSalary}`, 365, 145);
    doc.fontSize(10).text("Net Salary", 365, 170);

    // Pay Summary
    let y = 250;

    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    doc.fontSize(12).text("PAY SUMMARY", 40, y);
    y += 25;

    [
      ["Gross Salary", payroll.grossSalary],
      ["Working Days", payroll.workingDays],
      ["Paid Days", payroll.paidDays],
      ["Absent Days", payroll.absentDays],
    ].forEach(([label, value]) => {
      doc.fontSize(10).text(label, 50, y);
      doc.text(String(value), 250, y);
      y += 20;
    });

    // Leave Details
    y += 10;
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    doc.fontSize(12).text("LEAVE DETAILS", 40, y);
    y += 25;

    if (payroll.leaveBreakdown?.length) {
      payroll.leaveBreakdown.forEach((leave) => {
        doc.fontSize(10).text(leave.leaveType, 50, y);
        doc.text(`${leave.days} Days`, 250, y);
        y += 20;
      });
    } else {
      doc.fontSize(10).text("No Leave Records", 50, y);
      y += 20;
    }

    // Salary Breakdown
    y += 10;
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    doc.fontSize(12).text("SALARY BREAKDOWN", 40, y);
    y += 25;

    doc.fontSize(10);
    doc.text("Earnings", 50, y);
    doc.text("Amount", 220, y);

    doc.text("Deductions", 330, y);
    doc.text("Amount", 470, y);

    y += 20;

    doc.text("Gross Salary", 50, y);
    doc.text(`Rs ${payroll.grossSalary}`, 220, y);

    doc.text("Salary Deduction", 330, y);
    doc.text(`Rs ${payroll.totalDeduction}`, 470, y);

    y += 35;

    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    doc.fontSize(14).text("NET SALARY", 50, y);
    doc.text(`Rs ${payroll.netSalary}`, 470, y);

    y += 50;

    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This is a system-generated salary slip and does not require a signature.",
        40,
        y,
        { align: "center" },
      );

    doc.end();
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      return res.status(500).json({ message: err.message });
    }
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

module.exports = { runPayroll, getPayrollHistory, downloadSalarySlip };

// const User = require("../models/User.model");
// const AttendanceLog = require("../models/AttendanceLog.model");
// const LeaveRequest = require("../models/LeaveRequest.model");
// const LeavePolicy = require("../models/LeavePolicy.model");
// const Holiday = require("../models/Holiday.model");
// const Payroll = require("../models/Payroll.model");

// const getWorkingDays = async (month, year) => {
//   const totalDays = new Date(year, month, 0).getDate();
//   const holidays = await Holiday.find({
//     date: {
//       $gte: new Date(year, month - 1, 1),
//       $lte: new Date(year, month - 1, totalDays),
//     },
//   });

//   let workingDays = 0;
//   for (let day = 1; day <= totalDays; day++) {
//     const current = new Date(year, month - 1, day);
//     const dayOfWeek = current.getDay();
//     const isHoliday = holidays.some(
//       (h) => new Date(h.date).toDateString() === current.toDateString(),
//     );
//     if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
//       workingDays++;
//     }
//   }
//   return workingDays;
// };

// const runPayroll = async (req, res) => {
//   try {
//     const { employeeId, month, year } = req.body;
//     if (!employeeId || !month || !year) {
//       return res
//         .status(400)
//         .json({ message: "employeeId, month and year are required" });
//     }

//     const existing = await Payroll.findOne({
//       employee: employeeId,
//       month,
//       year,
//     });
//     if (existing) {
//       return res
//         .status(400)
//         .json({ message: "Payroll already processed for this month" });
//     }

//     const employee = await User.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     const workingDays = await getWorkingDays(month, year);
//     const perDaySalary = employee.salary / workingDays;

//     const monthStart = new Date(year, month - 1, 1);
//     const monthEnd = new Date(
//       year,
//       month - 1,
//       workingDays === 0 ? 1 : new Date(year, month, 0).getDate(),
//     );

//     const attendanceLogs = await AttendanceLog.find({
//       employee: employeeId,
//       date: { $gte: monthStart, $lte: monthEnd },
//     });

//     const lateMarks = attendanceLogs.filter((log) => log.isLate).length;
//     const lateMarkDeductionDays = Math.floor(lateMarks / 3) * 0.5;

//     const approvedLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       fromDate: { $gte: monthStart, $lte: monthEnd },
//     });

//     let paidLeaveUsed = 0;
//     let unpaidLeaveDays = 0;
//     const leaveBreakdownMap = {};

//     approvedLeaves.forEach((leave) => {
//       const days = leave.isHalfDay
//         ? 0.5
//         : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//             (1000 * 60 * 60 * 24) +
//           1;
//       if (leave.leaveType === "Unpaid Leave") {
//         unpaidLeaveDays += days;
//       } else {
//         paidLeaveUsed += days;
//       }
//       leaveBreakdownMap[leave.leaveType] =
//         (leaveBreakdownMap[leave.leaveType] || 0) + days;
//     });

//     const leaveBreakdown = Object.keys(leaveBreakdownMap).map((leaveType) => ({
//       leaveType,
//       days: leaveBreakdownMap[leaveType],
//     }));

//     const daysWithAttendance = attendanceLogs.length;
//     const totalLeaveDaysTaken = paidLeaveUsed + unpaidLeaveDays;
//     const presentOrLeaveDays = daysWithAttendance + totalLeaveDaysTaken;
//     const absentDays = Math.max(workingDays - presentOrLeaveDays, 0);

//     const policies = await LeavePolicy.find({
//       employmentType: employee.employmentType,
//     });
//     const paidLeaveAllotted = policies
//       .filter((p) => p.leaveType !== "Unpaid Leave")
//       .reduce((sum, p) => sum + p.annualDays, 0);

//     const yearStart = new Date(year, 0, 1);
//     const yearToDateLeaves = await LeaveRequest.find({
//       employee: employeeId,
//       status: "approved",
//       leaveType: { $ne: "Unpaid Leave" },
//       fromDate: { $gte: yearStart, $lte: monthEnd },
//     });

//     const paidLeaveUsedYTD = yearToDateLeaves.reduce((sum, leave) => {
//       const days = leave.isHalfDay
//         ? 0.5
//         : (new Date(leave.toDate) - new Date(leave.fromDate)) /
//             (1000 * 60 * 60 * 24) +
//           1;
//       return sum + days;
//     }, 0);

//     const paidLeaveRemaining = paidLeaveAllotted - paidLeaveUsedYTD;

//     const deductionDaysNeeded =
//       absentDays + lateMarkDeductionDays + unpaidLeaveDays;
//     const salaryDeductionDays =
//       paidLeaveRemaining >= deductionDaysNeeded
//         ? 0
//         : deductionDaysNeeded - paidLeaveRemaining;

//     const totalDeduction =
//       Math.round(salaryDeductionDays * perDaySalary * 100) / 100;
//     const netSalary =
//       Math.round((employee.salary - totalDeduction) * 100) / 100;
//     const paidDays = workingDays - salaryDeductionDays;
//     const leaveBalanceCovered = Math.max(
//       Math.min(paidLeaveRemaining, deductionDaysNeeded),
//       0,
//     );

//     const payroll = await Payroll.create({
//       employee: employeeId,
//       month,
//       year,
//       grossSalary: employee.salary,
//       workingDays,
//       paidLeaveUsed,
//       unpaidLeaveDays,
//       absentDays,
//       presentDays: daysWithAttendance,
//       lateMarkDeductionDays,
//       leaveBreakdown,
//       paidDays,
//       salaryDeductionDays,
//       leaveBalanceCovered,
//       totalDeduction,
//       netSalary,
//     });

//     res.status(201).json(payroll);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// const getPayrollHistory = async (req, res) => {
//   try {
//     const filter = {};
//     if (req.user.role !== "admin") {
//       filter.employee = req.user._id;
//     } else if (req.query.employee) {
//       filter.employee = req.query.employee;
//     }

//     const history = await Payroll.find(filter)
//       .populate("employee", "name employeeId")
//       .sort({ year: -1, month: -1 });
//     res.json(history);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// const downloadSalarySlip = async (req, res) => {
//   try {
//     const payroll = await Payroll.findById(req.params.id).populate(
//       "employee",
//       "name employeeId designation",
//     );
//     if (!payroll) {
//       return res.status(404).json({ message: "Payroll not found" });
//     }

//     if (
//       req.user.role !== "admin" &&
//       req.user._id.toString() !== payroll.employee._id.toString()
//     ) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=salary-slip-${payroll.month}-${payroll.year}.pdf`,
//     );

//     const doc = new PDFDocument({ margin: 50 });
//     doc.pipe(res);

//     const logoPath = path.join(__dirname, "../assets/logo.png");
//     if (fs.existsSync(logoPath)) {
//       doc.image(logoPath, 50, 45, { width: 60 });
//     }

//     doc.fontSize(18).text("MobiCloud Technologies", 120, 50);
//     doc.fontSize(10).fillColor("gray").text("Salary Slip", 120, 72);
//     doc.fillColor("black");

//     doc.moveTo(50, 110).lineTo(550, 110).stroke();
//     doc.moveDown(2);

//     const monthNames = [
//       "",
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ];

//     doc.fontSize(11);
//     doc.text(`Employee Name: ${payroll.employee.name}`, 50, 130);
//     doc.text(`Employee ID: ${payroll.employee.employeeId}`, 300, 130);
//     doc.text(`Designation: ${payroll.employee.designation || "-"}`, 50, 150);
//     doc.text(
//       `Pay Period: ${monthNames[payroll.month]} ${payroll.year}`,
//       300,
//       150,
//     );

//     let y = 190;
//     doc.moveTo(50, y).lineTo(550, y).stroke();
//     y += 10;

//     doc.fontSize(10).fillColor("gray");
//     doc.text("Details", 50, y);
//     doc.text("Days", 300, y);
//     doc.fillColor("black");
//     y += 20;

//     const rows = [
//       ["Working Days", payroll.workingDays],
//       ["Paid Days", payroll.paidDays],
//       ["Absent Days", payroll.absentDays],
//     ];

//     rows.forEach(([label, value]) => {
//       doc.fontSize(10).text(label, 50, y);
//       doc.text(String(value), 300, y);
//       y += 18;
//     });

//     if (payroll.leaveBreakdown?.length) {
//       y += 5;
//       doc.fontSize(10).fillColor("gray").text("Leave Breakdown", 50, y);
//       doc.fillColor("black");
//       y += 18;
//       payroll.leaveBreakdown.forEach((lb) => {
//         doc.text(`${lb.leaveType}`, 50, y);
//         doc.text(`${lb.days} days`, 300, y);
//         y += 16;
//       });
//     }

//     y += 10;
//     doc.moveTo(50, y).lineTo(550, y).stroke();
//     y += 15;

//     doc.fontSize(10);
//     doc.text("Gross Salary", 50, y);
//     doc.text(`Rs. ${payroll.grossSalary}`, 300, y);
//     y += 18;

//     doc.text("Total Deduction", 50, y);
//     doc.text(`Rs. ${payroll.totalDeduction}`, 300, y);
//     y += 18;

//     doc.moveTo(50, y).lineTo(550, y).stroke();
//     y += 15;

//     doc.fontSize(13).text("Net Salary", 50, y);
//     doc.fontSize(13).text(`Rs. ${payroll.netSalary}`, 300, y);

//     doc
//       .fontSize(8)
//       .fillColor("gray")
//       .text(
//         "This is a system generated salary slip and does not require a signature.",
//         50,
//         750,
//       );

//     doc.end();
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// module.exports = { runPayroll, getPayrollHistory, downloadSalarySlip };
