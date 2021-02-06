const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [{
    description: { type: String },
    duration: { type: Number },
    date: { type: String }
  }]
});

let User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/**
 * You can POST to /api/exercise/new-user with form data username to create a new user. 
 * The returned response will be an object with username and _id properties.
 */

app.post('/api/exercise/new-user', (req, res) => {
  const userName = req.body.username;
  User.find({username: userName}, (err, user) => {
    if (err) {
      console.error(err);
    }

    if (user.length) {
      res.send('username already existed!');
    } else {
      const newUser = new User({username: userName});
      newUser.save((err, data) => {
        if (err) {
          console.log(err);
        }
        res.json({
          username: data.username, 
          _id: data._id});
        });
    }
  });
});

/**
 * You can make a GET request to api/exercise/users to get an array of all users. 
 * Each element in the array is an object containing a user's username and _id.
 */

app.get('/api/exercise/users', (req, res) => {
  User.find({}, {username: 1}, {_id: 1}, function(err, users) {
    if (err) {
      console.error(err);
    } else {
      res.send(users);
    }
  });
});

/**
 * You can POST to /api/exercise/add with form data userId=_id, description, duration, and optionally date. 
 * If no date is supplied, the current date will be used. 
 * The response returned will be the user object with the exercise fields added.
 */

app.post('/api/exercise/add', (req, res) => {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = Number (req.body.duration);
  let date = req.body.date;

  if (date === undefined) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }
  if (date === 'Invalid Date') {
    res.send('Cast to date failed for value "Invalid Date"');
  } else {
    User.findByIdAndUpdate(userId, {$push: {'log': {description: description, duration: duration, date: date}}}, (err, data) => {
      if (err) {
        console.error(err);
      }
      if (data) {
        res.json({
          _id: userId,
          username: data.username,
          date: date,
          duration: duration,
          description: description
        });
      } else {
        res.send('userId not found!');
      }
    });
  }
});

/**
 * You can make a GET request to /api/exercise/log with a parameter of userId=_id to retrieve a full exercise log of any user. 
 * The returned response will be the user object with a log array of all the exercises added. 
 * Each log item has the description, duration, and date properties.
 * A request to a user's log (/api/exercise/log) returns an object with a count property representing the number of exercises returned.
 * You can add from, to and limit parameters to a /api/exercise/log request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back.
 */

app.get('/api/exercise/log', (req, res) => {
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  if (!userId) {
    res.send('unknown userId');
  } else {
    User.findOne({_id: userId}, {'log._id': 0}, (err, user) => {
      if (err) {
        console.error(err);
      }
      
      if (user) {
        let log = user.log.slice();

        if (from) {
          log = log.filter(exercise => new Date(exercise.date).getTime() >= new Date(from).getTime());
          from = new Date(from).toDateString();
        } 
        if (to) {
          log = log.filter(exercise => new Date(exercise.date).getTime() <= new Date(to).getTime());
          to = new Date(to).toDateString();
        }
        if (limit >= 1) {
          log = log.slice(0, limit);
        }

        if (from && !to) {
          res.json({
            _id: user.id,
            username: user.username,
            from: from,
            count: log.length,
            log: log
          });
        } else if (to && !from) {
          res.json({
            _id: user.id,
            username: user.username,
            to: to,
            count: log.length,
            log: log
          });
        } else if (from && to) {
          res.json({
            _id: user.id,
            username: user.username,
            from: from,
            to: to,
            count: log.length,
            log: log
          });
        } else {
          res.json({
            _id: user.id,
            username: user.username,
            count: log.length,
            log: log
          });
        }
      } else {
        res.send('unknown userId');
      }
    });    
  }   
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  });