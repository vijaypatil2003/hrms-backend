const AttendanceLog = require("../models/AttendanceLog.model");

const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const punchIn = async (req, res) => {
  try {
    const today = getTodayDate();
    const now = new Date();

    let log = await AttendanceLog.findOne({
      employee: req.user._id,
      date: today,
    });

    if (!log) {
      const officeStart = new Date(today);
      officeStart.setHours(9, 30, 0, 0);
      const isLate = now > officeStart;

      log = await AttendanceLog.create({
        employee: req.user._id,
        date: today,
        punches: [{ inTime: now }],
        isLate,
      });

      return res.status(201).json(log);
    }

    const lastPunch = log.punches[log.punches.length - 1];
    if (lastPunch && !lastPunch.outTime) {
      return res
        .status(400)
        .json({ message: "Already punched in, punch out first" });
    }

    if (lastPunch && lastPunch.outTime) {
      const breakMins = (now - lastPunch.outTime) / (1000 * 60);
      log.totalBreakMins += breakMins;
    }

    log.punches.push({ inTime: now });
    await log.save();

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const punchOut = async (req, res) => {
  try {
    const today = getTodayDate();
    const now = new Date();

    const log = await AttendanceLog.findOne({
      employee: req.user._id,
      date: today,
    });
    if (!log) {
      return res.status(400).json({ message: "No punch in found for today" });
    }

    const lastPunch = log.punches[log.punches.length - 1];
    if (!lastPunch || lastPunch.outTime) {
      return res.status(400).json({ message: "Punch in first" });
    }

    lastPunch.outTime = now;
    const hoursWorked = (now - lastPunch.inTime) / (1000 * 60 * 60);
    log.totalWorkHours += hoursWorked;

    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const logs = await AttendanceLog.find({ employee: req.user._id }).sort({
      date: -1,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const { employee, from, to } = req.query;
    const filter = {};

    if (employee) filter.employee = employee;
    if (from && to) {
      filter.date = { $gte: new Date(from), $lte: new Date(to) };
    }

    const logs = await AttendanceLog.find(filter)
      .populate("employee", "name employeeId")
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { punchIn, punchOut, getMyAttendance, getAllAttendance };
