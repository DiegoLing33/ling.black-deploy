const {Logger} = require("@ling.black/log");
const express = require('express')
const app = express()
const port = 3399

Logger.log("Hi, its me!");


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, "server.ling.black",() => {
    Logger.log(`Example app listening at *:${port}`);
})