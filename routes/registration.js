
'use strict';

var express = require('express');
var request = require('request');
var router = express.Router();

var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

// Setting up Google API Authentication
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);
google.options({ auth: oauth2Client });

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  // Configuring the email parameters for composing
  var from_email = new helper.Email('info@medtechgateway.com', "Medical Technologies Gateway");
  var to_email = new helper.Email('brandon@bdsdesign.co');
  var user_email = new helper.Email(req.body['email'], req.body['name']);
  var mtg_subject = "New contact form submission on the Medical Technologies Gateway website!";
  var user_subject = "Medical Technologies Gateway - Contact Form Submission Confirmation";

  // Construct email requests to be sent to MTG and a confirmation to the user using custom made templates
  var request1 = composeMail(from_email, mtg_subject, to_email, req.body, process.env.REGISTRATION_MTG_TEMPLATE);
  var request2 = composeMail(from_email, user_subject, user_email, req.body, process.env.REGISTRATION_USER_TEMPLATE);

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

function composeMail() {

}

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

module.exports = router;
