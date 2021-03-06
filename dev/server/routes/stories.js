
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
var oauth2Client = new googleAuth(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  // Today's date for logging
  var d = new Date(); // Create new Date
  var date = moment.tz(d, "America/Toronto").format(); // Format the data to the appropriate timezone
  req.body['name'] = req.body['firstname'] + ' ' + req.body['lastname'];

  // Configuring the email parameters for composing
  var from_email = new helper.Email('info@medtechgateway.com', "Medical Technologies Gateway");
  var to_email = new helper.Email('brandon@bdsdesign.co');
  var user_email = new helper.Email(req.body['email'], req.body['name']);
  var mtg_subject = "New contact form submission on the MTG website!";
  var user_subject = "Medical Technologies Gateway - Contact Form Submission Confirmation";

  // Construct email requests to be sent to MTG and a confirmation to the user using custom made templates
  var request1 = composeMail(from_email, mtg_subject, to_email, req.body, process.env.STORIES_MTG_TEMPLATE);
  var request2 = composeMail(from_email, user_subject, user_email, req.body, process.env.STORIES_USER_TEMPLATE);

  // Setting up the Slack post messages
  var slackParams = {
    "form": {
      "attachments": [
        {
          "fallback": "A new Featured Stories form on the MTG website has been submitted!",
          "pretext": "A new Featured Stories form on the MTG website has been submitted!",
          "title": "New Featured Stories Form Submission",
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
    },
    "mailinglist": {
      "attachments": [
        {
          "fallback": "A new contact has subscribed to the mailing list!",
          "color": "#1BDB6C",
          "pretext": "A new contact has subscribed to the mailing list!",
          "title": "New Contact Added to the Mailing List",
          "text": "The new subscriber's information and upload status is outlined below.",
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
            }
          ]
        }
      ]
    }
  }

  googleSheets({
    range: "Featured Stories Submissions!A2:D",
    values: [
      [
        date,
        req.body['name'],
        req.body['email'],
        req.body['message']
      ]
    ]
  });

  // Check to see if they want to be added to the mailing list
  if (req.body['mailinglist'] == 'true') {

    var contactRequest = sg.emptyRequest({
      method: 'POST',
      path: '/v3/contactdb/recipients',
      body: [{
        "email": req.body['email'],
        "first_name": req.body['firstname'],
        "last_name": req.body['lastname']
      }]
    });

    sendgridContactRequest(contactRequest, slackParams['mailinglist']);

    googleSheets({
      range: "Mailing List!A2:C",
      values: [
        [
          req.body['firstname'],
          req.body['lastname'],
          req.body['email']
        ]
      ]
    });
  }

  sendgridRequest(request1, undefined);
  sendgridRequest(request2, undefined);

  // Post to Slack
  slackPost(slackParams['form'], process.env.PREMUS_SLACK_WEBHOOK);
  slackPost(slackParams['form'], process.env.BDS_SLACK_WEBHOOK);

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
  var name = form_data['firstname'] + ' ' + form_data['lastname'];

  var mail = new helper.Mail(from_email, subject, to_email, content); // Create mail helper

  // Set up personalizations for the email template using the form data from the parameters
  mail.personalizations[0].addSubstitution( new helper.Substitution('-name-', name) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-firstname-', form_data['firstname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-email-', form_data['email']) );

  mail.setTemplateId(template_id); // Set the Template ID for the email content

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
 * @param {Object} slackReq The attachment content to post on Slack
 */
function sendgridRequest(req, slackReq) {

  sg.API(req, function(error, response) {

    if (response.statusCode == 200 || response.statusCode == 202 || response.statusCode == 201) {

      if (slackReq == undefined) {

        // Confirmation response
        var confirmationRes = {
          "attachments": [
            {
              "fallback": "SendGrid Email Request Successful!",
              "color": "#1BDB6C",
              "pretext": "SendGrid Email Request Successful!",
              "title": "SendGrid Email Request Successful!",
              "text": "The SendGrid request has been sent. Below is the response from SendGrid.",
              "fields": [
                {
                  "title": "Status Code",
                  "value": response.statusCode,
                  "short": true
                }, {
                  "title": "Response Body",
                  "value": "```" + JSON.stringify(response.body) + "```",
                  "short": false
                }, {
                  "title": "Response Headers",
                  "value": "```" + JSON.stringify(response.headers) + "```",
                  "short": false
                }
              ]
            }
          ]
        }

        // Post to Slack
        slackPost(confirmationRes, process.env.BDS_SLACK_WEBHOOK);

      } else {

        // If the slackReq parameter is defined, then add the status code, headers
        // and response
        slackReq['attachments'][0]['fallback'] = "SendGrid Contact Request Successful!";
        slackReq['attachments'][0]['pretext'] = "SendGrid Contact Request Successful!";
        slackReq['attachments'][0]['title'] = "SendGrid Contact Request Successful!";

        slackReq['attachments'][0]['fields'].push(
          {
            "title": "Status Code",
            "value": response.statusCode,
            "short": true
          }, {
            "title": "Response Body",
            "value": "```" + JSON.stringify(response.body) + "```",
            "short": false
          }, {
            "title": "Response Headers",
            "value": "```" + JSON.stringify(response.headers) + "```",
            "short": false
          }
        );

        // Post to Slack
        slackPost(slackReq, process.env.PREMUS_SLACK_WEBHOOK);
        slackPost(slackReq, process.env.BDS_SLACK_WEBHOOK);

      }

    } else {

      // Error response
      var errorRes = {
        "attachments": [
          {
            "fallback": "SENDGRID REQUEST FAILED",
            "color": "#C10039",
            "pretext": "SENDGRID REQUEST FAILED!",
            "title": "SENDGRID REQUEST FAILED!",
            "text": "The response from SendGrid is displayed below for more information.",
            "fields": [
              {
                "title": "Status Code",
                "value": response.statusCode,
                "short": true
              }, {
                "title": "Response Body",
                "value": "```" + JSON.stringify(response.body) + "```",
                "short": false
              }, {
                "title": "Response Headers",
                "value": "```" + JSON.stringify(response.headers) + "```",
                "short": false
              }
            ]
          }
        ]
      }

      if (slackReq != undefined) {
        errorRes['attachments'][0]['text'] += "\nThis request is for the SendGrid Contacts API";
      }

      // Post to Slack
      slackPost(errorRes, process.env.PREMUS_SLACK_WEBHOOK);
      slackPost(errorRes, process.env.BDS_SLACK_WEBHOOK);

    }

    // Log response
    console.log('--RESPONSE BEGIN--');
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
    console.log('--RESPONSE END--\n');
  });
}

/**
 * Secondary SendGrid request to the API for uploading Contacts and segmenting them to the mailing list
 *
 * @param {Object} req The callback to send to SendGrid
 * @param {Object} slackReq The attachment content to post on Slack
 */
function sendgridContactRequest(req, slackReq) {

  sg.API(req, function(error, response) {

    // Log response
    console.log('--RESPONSE BEGIN--');
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
    console.log('--RESPONSE END--\n');

    var reqPath = '/v3/contactdb/lists/' + process.env.LIST_ID_MAILING + '/recipients/' + response.body['persisted_recipients'][0];

    // Request to add the newly added contact to the appropriate list
    var mailinglistRequest = sg.emptyRequest({
      method: 'POST',
      path: reqPath
    });

    sendgridRequest(mailinglistRequest, slackReq);
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
    body: data
  });
}

/**
 * Google Sheets API request to post the information to the spreadsheet. The information
 * on which page on the spreadsheet to post to as well as the appropriate cells on the
 * spreadsheet are passed through as an Object through a parameter.
 *
 * @param {Object} content An object that contains the range and content to populate on Google Sheets
 */
function googleSheets(content) {

  // Call function to authorize access to the Google API and send data to spreadsheet
  authorize(function(authClient) {

    // Create request object to send to the spreadsheet
    var sheetReq = {
      spreadsheetId: '1-AEh85B7NA-05DDWYe1dIqBdWwecBuJQqFWvxtUblvU',
      range: content.range,
      valueInputOption: 'RAW',
      auth: authClient,
      resource: {
        majorDimension: 'ROWS',
        values: content.values
      }
    };

    // Append form data to the spreadsheet with the request sheetReq
    sheets.spreadsheets.values.append(sheetReq, function(err, response) {
      if (err) {
        console.log(err);
        return;
      }
    });
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
