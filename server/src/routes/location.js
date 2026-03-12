const express = require("express");
const storeLocation  = require("../controllers/storeLocation.js");
const getLocations  = require("../controllers/getLocation.js");

const router = express.Router();

router.post("/store", storeLocation);
router.get("/get/:userId", getLocations);

module.exports = router;
