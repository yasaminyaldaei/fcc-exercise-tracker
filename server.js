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
  log: [],
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
    return res.send({
      _id: doc._id,
      username: doc.username
    })
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

app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration, date } = req.body;
  const dateString = date ? new Date(date) : new Date()
  Users.findOneAndUpdate({
    _id: userId,
  }, { $push: {
        log: {
          description,
          duration,
          date: dateString,
        },
      }}, { upsert: true, new: true }, (err, doc) => {
    if (err) return res.send({
      message: err.message
    })
    const result = {
        "_id": "" + doc._id,
        "username": doc.username,
        "date": dateString.toDateString(),
        duration: +duration,
        description
    }
    res.send(result)
  })
})

app.get("/api/exercise/log", (req, res) => {
  const userId = new ObjectID(req.query.userId)
  const from = req.query.from ? new Date(req.query.from) : null
  const to = req.query.to ? new Date(req.query.to) : null
  const limit = req.query.limit
  
  let pipeline = [
    { 
      $match: { _id: userId }
    }, 
    {
      $project: {
        log: 1,
        count: {
          $size: "$log"
        }
      }
    }
  ];
  if (limit) {
    pipeline.push({
      $project: {
        log: {
          $slice: ["$log", 0, +limit]
        }
      }
    })
  }
  let dateRange = []
  if (from) {
    dateRange.push({$gte: [ "$$item.date", from]})
  }
  if (to) {
    dateRange.push({$lte: [ "$$item.date", to]})
  }
  if (dateRange.length !== 0) {
    pipeline.push({
      $project: {
        log: {
          $filter: {
            input: "$log",
            as: "item",
            cond: { $and: dateRange }
          }
        }
      }
    })
  } 
  
  Users.aggregate(pipeline, (err, doc) => {
    if (err) return res.send({
      message: err.message
    })
    res.send(doc[0])
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
