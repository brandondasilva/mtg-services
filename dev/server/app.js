
'use strict';

const express = require('express');
const PORT = process.env.PORT || 3000;

var app = express();
var bodyParser = require('body-parser');
var helmet = require('helmet');

app.set('port', PORT);

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());

// Forms
var registration = require('./routes/registration');
var stories = require('./routes/stories');
var contact = require('./routes/contact');

app.use('/registration', registration);
app.use('/stories', stories);
app.use('/contact', contact);

// News
var news = require('./routes/news');
var publish = require('./routes/publish');

app.use('/news', news);
app.use('/news/publish', publish);

// Support
// var support = require('./routes/support');
// app.use('/support', support);

app.get('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  res.status(200).send('ok');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
