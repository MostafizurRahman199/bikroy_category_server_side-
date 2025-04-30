const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;



//middle ware
app.use(cors());
app.use(express.json())


app.get("/", (req, res)=>{
    res.send("Hello World")
})

app.post("/jwt", async(req, res)=>{
    const user = req.body;
    const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn : "1h"
    });
    res.send(token);
})


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})