const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Register new user
const registerUser = async (req, res) => {
  try {
    const {
      name,
      dob,
      bloodGroup,
      mobile,
      email,
      password,
      address,
      emergency_contact,
      gender,
    } = req.body;

    if (!name || !mobile || !email || !password) {
      return res
        .status(400)
        .json({ message: "All fields are required" });
    }

    // ✅ Check if user already exists
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE mobile = ? OR email = ?",
      [mobile, email]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "User already exists with this email or mobile" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate userId automatically
    const userId = "USR" + Date.now();

    await pool.query(
      `INSERT INTO users 
        (userId, name, dob, bloodGroup, mobile, email, password, address, emergency_contact, gender) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        dob,
        bloodGroup,
        mobile,
        email,
        hashedPassword,
        address,
        emergency_contact,
        gender,
      ]
    );

    res
      .status(201)
      .json({ message: "✅ User registered successfully", userId });
  } catch (error) {
    console.error("Register User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser };
