const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // ✅ Check if user exists
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    // ✅ Return user details
    res.status(200).json({
      message: "✅ Login successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        bloodGroup: user.bloodGroup || "",
        emergencyContact: user.emergency_contact || "",
        address: user.address || "",
        dateOfBirth: user.dob
          ? new Date(user.dob).toISOString().split("T")[0]
          : "",
        role:user.role
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { loginUser };
