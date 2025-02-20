const express = require('express')
const mongoose= require('mongoose')
const cors = require('cors')
const admin = require('firebase-admin')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const app = express();
const port = process.env.PORT || 5000;
const dotenv = require('dotenv');

//  load environment variables
dotenv.config()

// initialize express
app.use(cors({origin:'http://localhost:5173'}));
app.use(express.json())
app.use(morgan('tiny'))

// innitialize firebase admin 
// console.log('MONGO_URI from env:', JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

// Mongodb connection
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log(`Connencted to MongoDB atlas (database: task-management)`))
.catch((error)=>{
    console.log(`Mongodb connection error ${error}`)
    process.exit(1)
})

// user schema 
const userSchema = new mongoose.Schema({
    userId: {type:String, required: true, unique: true},
    email: String,
    displayName: String,
    role: String
})
const User = mongoose.model('User', userSchema)

// task schema
const taskShema = new mongoose.Schema({
    title: {type: String, required:true, maxlength: 50},
    description: {type: String, maxlength:200},
    category: {type:String, enum:['To-Do', 'In Progress', 'Done'], required:true},
    timestamp: {type:Date, default: Date.now},
    userId: {type:String, required:true},
    order:{type: Number, default: 0}
})
const Task = mongoose.model('Task', taskShema)

// JWT middleware 
const authMiddleware =(req, res, next)=>{
    const token = req.headers.authorization?.split('Bearer ')[1];
    if(!token){
        return res.status(401).send({error:"Token required"})
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
        if(err) return res.status(401).send({error:"Invalid token"})
            req.user = decoded;
        next()
    })
}

app.get('/', async (req, res) => {
    res.send(`Your favorite task management server running on ${port}`)
})

app.listen(port, ()=>{
    console.log(`Task management server is running on port ${port}`)
})
