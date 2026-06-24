const Holiday = require("../models/Holiday.model");

const createHoliday = async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: "Name and date are required" });
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
