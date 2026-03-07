const pool = require("../config/db"); // Make sure db config is correct

const getLocations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Query only the columns that exist in the database
    const [rows] = await pool.query(
      `SELECT latitude AS lat, longitude AS lng, recorded_at 
       FROM user_locations 
       WHERE userId = ? 
       ORDER BY recorded_at DESC`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = getLocations;
