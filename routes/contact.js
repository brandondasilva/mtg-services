
'use strict';

var express = require('express');
var request = require('request');
var router = express.Router();

var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');


  var content = {
    "attachments": [
      {
        "fallback": "A new request for a quote has been submitted.",
        "color": "#36a64f",
        "pretext": "A new request for a quote has been submitted.",
        "title": "New Form Quote Submission",
        "text": "The following are the contents of the form for reference.",
        "fields": [
          {
            "title": "PAC Email Status code",
            "value": "value",
            "short": true
          }
        ]
      }
    ]
  }

  // Post to Slack
  slackPost(content, process.env.PREMUS_SLACK_WEBHOOK);
  slackPost(content, process.env.BDS_SLACK_WEBHOOK);
});


function slackPost(data, webhook) {

  request({
    url: webhook,
    method: "POST",
    json: true,
    body: data,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  });
}
