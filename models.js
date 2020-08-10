const mongoose = require('mongoose')

const Users = new mongoose.Schema({
  _id: {type: String},
  username: {type: String}
})

module.exports(mongoose.model('Users', Users))