
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

  // Today's date for logging
  var d = new Date(); // Create new Date
  var date = moment.tz(d, "America/Toronto").format(); // Format the data to the appropriate timezone

  // Configuring the email parameters for composing
  var from_email = new helper.Email('info@medtechgateway.com', "Medical Technologies Gateway");
  var to_email = new helper.Email('brandon@bdsdesign.co');
  var user_email = new helper.Email(req.body['email'], req.body['name']);
  var mtg_subject = "New contact form submission on the MTG website!";
  var user_subject = "Medical Technologies Gateway - New Device Registration Confirmation";

  // Construct email requests to be sent to MTG and a confirmation to the user using custom made templates
  var request1 = composeMail(from_email, mtg_subject, to_email, req.body, process.env.REGISTRATION_MTG_TEMPLATE);
  var request2 = composeMail(from_email, user_subject, user_email, req.body, process.env.REGISTRATION_USER_TEMPLATE);

  var slackParams = {
    "form": {
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

  // SendGrid requests for sending emails
  sendgridRequest(request1, undefined);
  sendgridRequest(request2, undefined);

  // Post to Slack
  // slackPost(content, process.env.PREMUS_SLACK_WEBHOOK);
  // slackPost(slackParams['form'], process.env.BDS_SLACK_WEBHOOK);
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

  var content = new helper.Content("text/html", " ");

  var name = form_data['firstname'] + ' ' + form_data['lastname'];
  var purchase_date = moment(form_data['year'] + form_data['month'] + form_data['day']).format('L');

  var mail = new helper.Mail(from_email, subject, to_email, content); // Create mail helper

  // Set up personalizations for the email template using the form data from the parameters
  mail.personalizations[0].addSubstitution( new helper.Substitution('-name-', name) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-firstname-', form_data['firstname']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-email-', form_data['email']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-device-', form_data['device']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-serial-', form_data['serial']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-country-', form_data['country']) );
  mail.personalizations[0].addSubstitution( new helper.Substitution('-date-', form_data['date']) );

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

    if (response.statusCode == 200 || response.statusCode == 202) {

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
        // slackPost(confirmationRes, process.env.PREMUS_SLACK_WEBHOOK);
        slackPost(confirmationRes, process.env.BDS_SLACK_WEBHOOK);

      } else {

        // If the slackReq parameter is defined, then add the status code, headers
        // and response
        slackReq['attachments']['fallback'] = "SendGrid Contact Request Successful!";
        slackReq['attachments']['pretext'] = "SendGrid Contact Request Successful!";
        slackReq['attachments']['title'] = "SendGrid Contact Request Successful!";

        slackReq['attachments']['fields'].push(
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
        // slackPost(slackReq, process.env.PREMUS_SLACK_WEBHOOK);
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
        errorRes['attachments']['text'] += "\nThis request is for the SendGrid Contacts API";
      }

      // Post to Slack
      // slackPost(errorRes, process.env.PREMUS_SLACK_WEBHOOK);
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

module.exports = router;
