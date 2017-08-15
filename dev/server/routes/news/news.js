
'use strict';

var moment = require('moment-timezone');

var express = require('express');
var request = require('request');
var router = express.Router();

// Set up and configure Webflow
var Webflow = require('webflow-api');
var webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN });

var MetaInspector = require('node-metainspector');

var validUrl = require('valid-url');

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  console.log(req.body);

  // Sets the 'url' field of the newsPost object depending on where the URL was passed
  if (req.body['url'] == undefined) {
    var newsPost = { 'url': req.body['text'] }
  } else {
    var newsPost = { 'url': req.body['url'] }
  }

  // Checks to see if the valid passed is a valid URL
  if (validUrl.isUri(newsPost['url'])) {

    // If the input string is a valid URL

    res.send("Sending link...");

    var client = new MetaInspector(newsPost['url'], { timeout: 5000 });

    client.on("fetch", function() {

      if (req.body['title'] == undefined) {
        newsPost['title'] = client.title;
      } else {
        newsPost['title'] = req.body['title'];
      }

      if (req.body['description'] == undefined) {
        newsPost['description'] = client.description;
      } else {
        newsPost['description'] = req.body['description'];
      }

      if (req.body['image'] == undefined) {
        newsPost['image'] = client.image;
      } else {
        newsPost['image'] = req.body['image'];
      }

      // Create Webflow item to push to the CMS
      var item = webflow.createItem({
        collectionId: '58be4ff264167da73c14db28',
        fields: {
          'name': newsPost['title'],
          'slug': 'news-post',
          '_archived': false,
          '_draft': false,
          'article-link': newsPost['url'],
          'image-link': newsPost['image'],
          'meta-description': newsPost['description'],
          'featured': true
        }
      });

      item.then(i => console.log(i)); // Send to Webflow

      var content = {
        "attachments": [
          {
            "title": "New News Post to Webflow",
            "color": "#36a64f",
            "text": "This needs to be published to the Webflow CMS using the Webflow Editor",
            "image_url": newsPost['image']
          },
          {
            "title": "Article Information",
            "fields": [
              {
                "title": "Name",
                "value": newsPost['title'],
                "short": false
              }, {
                "title": "Description",
                "value": newsPost['description'],
                "short": false
              }, {
                "title": "Article Link",
                "value": newsPost['url'],
                "short": false
              }
            ],
          },
          {
            "fallback": "Publish to Webflow?",
            "title": "Publish to Webflow?",
            "callback_id": "publish_webflow",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "actions": [
              {
                "name": "publish",
                "text": "Publish",
                "style": "danger",
                "type": "button",
                "value": "publish"
              },
              {
                "name": "no",
                "text": "No Thanks",
                "type": "button",
                "value": "no"
              }
            ]
          }
        ]
      }

      slackRequest(content, process.env.BDS_SLACK_WEBHOOK);
      slackRequest(content, process.env.PREMUS_SLACK_WEBHOOK);
    });

    client.on("error", function(err) {

      var content = {
        "attachments": [
          {
            "title": "News upload failed!",
            "color": "#C10039",
            "text": "The URL you have entered is invalid"
          }
        ]
      }

      slackRequest(content, process.env.BDS_SLACK_WEBHOOK);
      slackRequest(content, process.env.PREMUS_SLACK_WEBHOOK);

      console.log('META INSPECTOR ERROR!');
      console.log(err);
    });

    client.fetch();

  } else {

    // If the input string is not a valid URL

    res.send("Failed! Please enter a valid URL.");
  }

});

/**
 * Post the content being passed into the function to Slack through the webhook
 *
 * @param {Object} data The content to populate the Slack post
 * @param {Object} webhook The content to populate the Slack post
 */
function slackRequest(data, webhook) {

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
