// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { searchUser } = require("../contorllers/userSearch");

// Search endpoint
router.get("/search", searchUser);

module.exports = router;
