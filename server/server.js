const express = require("express");
const dotenv = require("dotenv").config();

const cors = require("cors");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use("/api/user/", require("./src/routes/user"));
app.use("/api/location/", require("./src/routes/location"));
app.use("/api/police/", require("./src/routes/police"));
app.use("/api/sos/", require("./src/routes/sos"));

app.listen(port, () => {
    console.log(`Server is running in Port ${port}`);
});


