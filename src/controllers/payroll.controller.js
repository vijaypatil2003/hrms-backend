const payrollService = require("../services/payroll.service");
const { generateSalarySlipPDF } = require("../utils/pdfGenerator");

const runPayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ message: "employeeId, month and year are required" });
    }
    const payroll = await payrollService.processPayroll(
      employeeId,
      month,
      year,
    );
    res.status(201).json(payroll);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getPayrollHistory = async (req, res) => {
  try {
    const history = await payrollService.getHistory(
      req.user._id,
      req.user.role,
      req.query.employee,
    );
    res.json(history);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const resetPayroll = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ message: "employeeId, month and year are required" });
    }
    await payrollService.resetPayrollRecord(employeeId, month, year);
    res.json({
      message:
        "Payroll reset successfully. You can now re-run payroll for this month.",
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const downloadSalarySlip = async (req, res) => {
  try {
    const payroll = await payrollService.getPayrollById(req.params.id);
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== payroll.employee._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    generateSalarySlipPDF(payroll, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ message: err.message });
    }
  }
};

module.exports = {
  runPayroll,
  getPayrollHistory,
  downloadSalarySlip,
  resetPayroll,
};
