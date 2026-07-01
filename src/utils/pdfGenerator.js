const PDFDocument = require("pdfkit");

const generateSalarySlipPDF = (payroll, res) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=salary-slip-${payroll.month}-${payroll.year}.pdf`,
  );

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(20).text("Mobicloud Technologies Pvt Ltd", { align: "left" });
  doc.fontSize(10).fillColor("gray").text("Salary Slip", { align: "right" });
  doc.fillColor("black");
  doc.moveDown();
  doc.moveTo(40, 90).lineTo(550, 90).stroke();
  doc.moveDown();
  doc.fontSize(12).text("EMPLOYEE DETAILS", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Employee Name : ${payroll.employee.name}`);
  doc.text(`Employee ID : ${payroll.employee.employeeId}`);
  doc.text(`Designation : ${payroll.employee.designation || "-"}`);
  doc.text(`Pay Period : ${payroll.month}/${payroll.year}`);
  doc.rect(350, 120, 180, 80).stroke();
  doc.fontSize(18).text(`Rs ${payroll.netSalary}`, 365, 145);
  doc.fontSize(10).text("Net Salary", 365, 170);

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
};

module.exports = { generateSalarySlipPDF };
