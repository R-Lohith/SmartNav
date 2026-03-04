const express = require("express");
const { registerUser } = require("../contorllers/userRegister.js");
const { loginUser } = require("../contorllers/userLogin.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
