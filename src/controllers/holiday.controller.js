const Holiday = require("../models/Holiday.model");

const checkDuplicateHoliday = async (name, date, excludeId = null) => {
  const inputDate = new Date(date);
  const startOfDay = new Date(inputDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(inputDate);
  endOfDay.setHours(23, 59, 59, 999);

  const filter = {
    name: name.trim(),
    date: { $gte: startOfDay, $lte: endOfDay },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  return await Holiday.findOne(filter);
};

const createHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: "Name and date are required" });
    }

    const existing = await checkDuplicateHoliday(name, date);
    if (existing) {
      return res.status(400).json({
        message: `Holiday "${name}" already exists on this date`,
      });
    }

    const holiday = await Holiday.create({ name, date, description });
    res.status(201).json(holiday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    const { name, date, description } = req.body;
    const newName = name || holiday.name;
    const newDate = date || holiday.date;

    if (name || date) {
      const existing = await checkDuplicateHoliday(
        newName,
        newDate,
        holiday._id,
      );
      if (existing) {
        return res.status(400).json({
          message: `Holiday "${newName}" already exists on this date`,
        });
      }
    }

    if (name) holiday.name = name;
    if (date) holiday.date = date;
    if (description !== undefined) holiday.description = description;

    await holiday.save();
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }
    await holiday.deleteOne();
    res.json({ message: "Holiday deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createHoliday, getHolidays, updateHoliday, deleteHoliday };
