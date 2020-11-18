const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
const ObjectID = require("mongodb").ObjectID;
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
  exercises: [],
  count: {type: Number}
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
  return currentDate.getFullYear() + "-" + ("0" + (currentDate.getMonth() + 1)).slice(-2) + "-" + ("0" + currentDate.getDay()).slice(-2)
}

app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration, date } = req.body;
  Users.findOneAndUpdate({
    _id: userId,
  }, { $push: {
        exercises: {
          description,
          duration,
          date: new Date(date || getCurrentStringDate())
        },
      }}, { upsert: true, new: true }, (err, doc) => {
    if (err) return res.send({
      message: err.message
    })
    Users.findOneAndUpdate({
      _id: userId,
    }, { $set: {
          count: doc.exercises.length || 0
      }
     }, { upsert: true, new: true }, (err, doc) => {
      if (err) return res.send({
      message: err.message
    })
      res.send(doc)
    })
  })
})

app.get("/api/exercise/log", (req, res) => {
  const userId = new ObjectID(req.query.userId)
  const from = req.query.from ? new Date(req.query.from) : null
  const to = req.query.to ? new Date(req.query.to) : null
  const limit = req.query.limit
  
  let pipeline = [{ $match: { _id: userId }}];
  if (limit) {
    pipeline.push({
      $project: {
        exercises: {
          $slice: ["$exercises", 0, +limit]
        }
      }
    })
  }
  if (from || to) {
    pipeline.push({
      $project: {
        exercises: {
          $filter: {
            input: "$exercises",
            as: "exercise",
            cond: { $and: [
              { $gte: [ "$$exercise.date", from] },
              { $lte: ["$$exercise.date", to] },
            ]}
          }
        }
      }
    })
  }  
  
  Users.aggregate(pipeline, (err, doc) => {
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
