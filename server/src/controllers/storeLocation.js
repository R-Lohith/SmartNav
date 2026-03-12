const pool = require("../config/db");

const storeLocation = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || !latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "userId, latitude, and longitude are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO user_locations (userId, latitude, longitude) VALUES (?, ?, ?)",
      [userId, latitude, longitude]
    );

    res.status(201).json({
      message: "Location stored successfully",
      locationId: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = storeLocation;
