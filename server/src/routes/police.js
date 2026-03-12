// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { searchUser } = require("../controllers/userSearch");

// Search endpoint
router.get("/search", searchUser);

module.exports = router;
