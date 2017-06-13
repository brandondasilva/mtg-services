
'use strict';

var moment = require('moment-timezone');

var express = require('express');
var request = require('request');
var router = express.Router();

var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

// Setting up Google API Authentication
var google = require('googleapis');
var googleAuth = google.auth.OAuth2;
var sheets = google.sheets('v4');

// Set up the OAuth2 Client using the environment variables from Heroku
// var oauth2Client = new googleAuth(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URL
// );

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  console.log(req.body);

  var name = req.body['firstname'] + ' ' + req.body['lastname'];

  // Configuring the email parameters for composing
  var from_email = new helper.Email('info@medtechgateway.com', "Medical Technologies Gateway");
  var to_email = new helper.Email('brandon@bdsdesign.co');
  var user_email = new helper.Email(req.body['email'], req.body['name']);
  var mtg_subject = "New contact form submission on the Medical Technologies Gateway website!";
  var user_subject = "Medical Technologies Gateway - Contact Form Submission Confirmation";

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
        "fallback": "A new form on the MTG website has been submitted!",
        "color": "#36a64f",
        "pretext": "A new form on the MTG website has been submitted!",
        "title": "New Contact Form Submission",
        "text": "The contents of the form are outline below for reference.",
        "fields": [
          {
            "title": "First Name",
            "value": req.body['firstname'],
            "short": true
          }, {
            "title": "Last Name",
            "value": req.body['lastname'],
            "short": true
          }, {
            "title": "Email Address",
            "value": req.body['email'],
            "short": false
          }, {
            "title": "Subject",
            "value": req.body['subject'],
            "short": false
          }, {
            "title": "Message",
            "value": req.body['message'],
            "short": false
          }, {
            "title": "Added to mailing list?",
            "value": (req.body['mailinglist'] == 'true') ? "Yes" : "No",
            "short": false
          }
        ]
      }
    ]
  };

  var sheetsRequest = {
    "range": "Form Data!A2:H",
    "values": [
      [

      ]
    ]
  }

  // sheets(sheetsRequest);

  sendgridRequest(request1);
  // sendgridRequest(request2);
  // sendgridRequest(contactRequest);

  // Post to Slack
  // slackPost(content, process.env.PREMUS_SLACK_WEBHOOK);
  slackPost(content, process.env.BDS_SLACK_WEBHOOK);

  res.send(req.body);
});

/**
 * Set up the mail information and template to be requested to be sent through SendGrid
 *
 * @param {String} from_email "From" email
 * @param {String} subject Subject for the email
 * @param {String} to_email "To" email
 * @param {Object} form_data The information submitted on the form
 * @param {String} template_id The ID of the template to use when sending the email
 */
function composeMail(from_email, subject, to_email, form_data, template_id) {

  var content = new helper.Content("text/html", form_data['message']);

  var mail = new helper.Mail(from_email, subject, to_email, content); // Create mail helper

  // Set up personalizations for the email template using the form data from the parameters
  mail.personalizations[0].addSubstitution( new helper.Substitution('-firstname-', form_data['firstname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-lastname-', form_data['lastname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-email-', form_data['email']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-subject-', form_data['subject']) );

  // mail.setTemplateId(template_id); // Set the Template ID for the email content

  // Return request to send to the SendGrid API
  return sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  });
}

/**
 * Sends the SendGrid request to the API
 *
 * @param {Object} req The callback to send to SendGrid
 */
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

/**
 * Post the content being passed into the function to Slack through the webhook
 *
 * @param {Object} data The content to populate the Slack post
 * @param {Object} webhook The content to populate the Slack post
 */
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

/**
 *
 */
function sheets(content) {

  // Call function to authorize access to the Google API and send data to spreadsheet
  authorize(function(authClient) {

    // Today's date for logging
    var d = new Date(); // Create new Date
    var date = moment.tz(d, "America/Toronto").format(); // Format the data to the appropriate timezone

    // Create request object to send to the spreadsheet
    var sheetReq = {
      spreadsheetId: '1Xj-igcg5c7hWyDWg7vkyThmekbPQ0aMBg1rsDI39Sa4',
      range: content.range,
      valueInputOption: 'RAW',
      auth: authClient,
      resource: {
        majorDimension: 'ROWS',
        values: content.values
      }
    };
  });
}

/**
 * Authorize access to the Google API to update the spreadsheet
 *
 * @param {function} callback The callback to call
 */
function authorize(callback) {

  if (oauth2Client == null) {
    console.log('Google authentication failed');
    return;
  }

  // Set credentials and tokens
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  oauth2Client.refreshAccessToken(function(err, tokens) { if (err) { console.log(err); } });

  var scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ]

  var AuthUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });

  callback(oauth2Client);
}

module.exports = router;
