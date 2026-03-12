// controllers/userController.js
const pool = require("../config/db");

// Search user by name, email, phone, or userId
const searchUser = async (req, res) => {
  try {
    const { q } = req.query; // search query

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Query database
    const [rows] = await pool.query(
      `SELECT 
         userId, 
         name, 
         email, 
         mobile AS phone, 
         emergency_contact AS emergency_number, 
         bloodGroup AS blood_group, 
         gender, 
         dob, 
         address,
         role
       FROM users
       WHERE name LIKE ? OR email LIKE ? OR mobile LIKE ? OR userId = ? 
       LIMIT 1`,
      [`%${q}%`, `%${q}%`, `%${q}%`, q]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Search User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { searchUser };
