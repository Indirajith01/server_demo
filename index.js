const express = require('express')
const app = express()
const dotenv = require('dotenv').config()
const PORT = process.env.PORT || 3000
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: "indirajithkv2003@gmail.com",
        pass: "yvlq gaiu hgqi useq"
    }

})

const mailoption = {
    from: "indirajithkv2003@gmail.com",
    to: "msvishwanath@outlook.com",
    subject: "Hello from Nodjs",
    text: "I completed this task"
}

app.get('/',(req,res)=>{
    res.send("server is running successfully!")
})

app.get('/sendmail',(req,res)=>{
    transporter.sendMail(mailoption,(error, info)=>{
        if(error){
            console.log("Error sending mail:",error);
        } else {
            console.log("Email sent:",info.response);
        }
    
    })
    res.send("mail sent successfully!")
})


app.listen(PORT, function(err) {
    if(err){
        console.log(err)
    }
    else{
        console.log(`server is running on ${PORT}`)
    }
})