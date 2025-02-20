const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const mongoose= require('mongoose')
const cors = require('cors')
const morgan = require('morgan')
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const uri = process.env.MONGO_URI

app.use(cors());
app.use(express.json())
app.use(morgan('tiny'))



// console.log('MONGO_URI from env:', process.env.MONGO_URI);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send(`Your favorite task management server running on ${port}`)
})

app.listen(port, ()=>{
    console.log(`Task management server is running on port ${port}`)
})
