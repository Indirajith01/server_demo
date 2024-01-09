const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const PORT = process.env.PORT || 3000

app.get('/',(req,res)=>{
    res.send("server is running successfully!")
})

app.listen(PORT, function(err) {
    if(err){
        console.log(err)
    }
    else{
        console.log(`server is running on ${PORT}`)
    }
})