const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const usersSchema = new mongoose.Schema({
  _id: {type: String},
  username: {type: String}
})


const Users = mongoose.model("users", usersSchema)
const collection = mongoose.connection.collection("users")

app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username
  if (username === "" || username.length === 0) {
    res.send("Must provide a username")
  }
  
  collection.findOne({
    username: username
  }, (err, doc) => {
    if (err) res.send(err)
    if (doc !== null) {
      res.send("Username already taken")
    } else {
      collection.insertOne({
        username: username
      }, (err, doc) => {
        if (err) res.send(err)
        res.send(doc.ops[0])
      })
    }
  })
  
})

app.get("/api/exercise/users", (req, res) => {
  Users.find({}, (err, doc) => {
    res.send(doc)
  })
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
