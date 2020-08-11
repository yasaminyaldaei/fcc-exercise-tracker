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
  username: {type: String, unique: true, required: true},
  exercises: []
},  { versionKey: false })


const Users = mongoose.model("users", usersSchema)

app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username
  Users.create({
    username: username
  }, (err, doc) => {
    if (err) {
      if (err.code === 11000) {
        return res.send({
          code: err.code,
          message: "Username already taken"
        })
      }
      else {
        return res.send({
          message: err.message
        })
      }
    }
    return res.send(doc)
  })
})

app.get("/api/exercise/users", (req, res) => {
  Users.find({}, (err, doc) => {
    if (err) return res.send({
      message: err.message
    })
    return res.send(doc)
  })
})

const getCurrentStringDate = () => {
  const currentDate = new Date()
  return currentDate.getFullYear() + "-" + currentDate.getMonth() + "-" + currentDate.getDay()
}

app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration, date } = req.body;
  Users.findOneAndUpdate({
    _id: userId,
  }, { $push: {
        exercises: {
          description,
          duration,
          date: date || getCurrentStringDate()
        }
      }
  }, { upsert: true, new: true }, (err, doc) => {
    if (err) return res.send({
      message: err.message
    })
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
