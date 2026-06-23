require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");

const seedAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: "admin@hrms.com" });
  if (existing) {
    console.log("Admin already exists");
    return process.exit();
  }

  await User.create({
    employeeId: "ADM001",
    name: "Admin",
    email: "admin@hrms.com",
    password: "admin123",
    role: "admin",
  });

  console.log("Admin created");
  process.exit();
};

seedAdmin();
