const express = require("express");
const { registerUser } = require("../controllers/userRegister.js");
const { loginUser } = require("../controllers/userLogin.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
