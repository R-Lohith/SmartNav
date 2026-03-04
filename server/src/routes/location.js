const express = require("express");
const storeLocation  = require("../contorllers/storeLocation.js");
const getLocations  = require("../contorllers/getLocation.js");

const router = express.Router();

router.post("/store", storeLocation);
router.get("/get/:userId", getLocations);

module.exports = router;
