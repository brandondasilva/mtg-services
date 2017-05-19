
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

  // Configuring the email parameters for composing
  var from_email = new helper.Email('info@medtechgateway.com', "Medical Technologies Gateway");
  var to_email = new helper.Email('brandon@bdsdesign.co');
  var user_email = new helper.Email(req.body['email'], req.body['name']);
  var mtg_subject = "New contact form submission on the Medical Technologies Gateway website!";
  var user_subject = "Medical Technologsies Gateway - Contact Form Submission Confirmation";

  // Construct email requests to be sent to MTG and a confirmation to the user using custom made templates
  var request1 = composeMail(from_email, mtg_subject, to_email, req.body, process.env.CONTACT_MTG_TEMPLATE);
  var request2 = composeMail(from_email, user_subject, user_email, req.body, process.env.CONTACT_USER_TEMPLATE);

  // Check to see if they want to be added to the mailing list
  var contactRequest = sg.emptyRequest({
    method: 'POST',
    path: '/v3/contactdb/recipients',
    body: [{
      "email": req.body['email'],
      "first_name": req.body['firstname'],
      "last_name": req.body['lastname']
    }]
  });

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

  sendgridRequest(request1);
  sendgridRequest(request2);
  sendgridRequest(contactRequest);

  // Post to Slack
  slackPost(content, process.env.PREMUS_SLACK_WEBHOOK);
  slackPost(content, process.env.BDS_SLACK_WEBHOOK);
});

function composeMail(from_email, subject, to_email, form_data, template_id) {

  var content = new helper.Content("text/html", form_data['message']);

  var mail = new helper.Mail(from_email, subject, to_email, content); // Create mail helper

  // Set up personalizations for the email template using the form data from the parameters
  mail.personalizations[0].addSubstitution( new helper.Substitution('-firstname-', form_data['firstname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-lastname-', form_data['lastname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-email-', form_data['email']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-subject-', form_data['subject']) );

  mail.setTemplateId(template_id); // Set the Template ID for the email content

  // Return request to send to the SendGrid API
  return sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  });
}

function sendgridRequest(req) {

  sg.API(req, function(error, response) {
    // Log response
    console.log('--RESPONSE BEGIN--');
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
    console.log('--RESPONSE END--\n');
  });
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
