const express = require('express')
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser")
const port = process.env.PORT || 6001
const app  = express()
const user = require('./routes/userRoute')

app.use(express.json())
app.use(bodyParser.urlencoded({extended:false}))
app.use(cors())


app.use('/api/client/',user)

app.listen(port,()=>{
    console.log(`App is running on http://localhost:${port}`);
})