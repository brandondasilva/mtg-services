
'use strict';

var moment = require('moment-timezone');

var express = require('express');
var request = require('request');
var router = express.Router();

// Set up and configure Webflow
var Webflow = require('webflow-api');
var webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN });

var MetaInspector = require('node-metainspector');

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  console.log(req.body);

  var client = new MetaInspector(req.body['url'], { timeout: 5000 });

  console.log(client);

  // Create Webflow item to push to the CMS
  /*var item = webflow.createItem({
    collectionId: '',
    fields: {
      'name': ,
      'slug': ,
      '_archived': ,
      '_draft': ,
      'article-link': ,
      'image-link':
    }
  });

  // HTTP POST to Slack Webhook to post an update on Slack
  request({
    url: process.env.BDS_SLACK_WEBHOOK,
    method: "POST",
    json: true,
    body: {
      "attachments": [
        {
          "fallback": "A new post from Instagram has been posted to Webflow.",
          "color": "#36a64f",
          "pretext": "A new post from Instagram has been posted to Webflow.",
          "title": "Instagram Post to Webflow",
          "text": "This needs to be published to the Webflow CMS using the Webflow Editor",
          "fields": [
            {
              "title": "Name",
              "value": req.body['name'],
              "short": false
            }, {
              "title": "Post Link",
              "value": req.body['link'],
              "short": false
            }, {
              "title": "Image Link",
              "value": req.body['image'],
              "short": false
            }
          ]
        }
      ]
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  });

  item.then(i => console.log(i)); // Send to Webflow

  */

  res.send(req.body);
});

module.exports = router;
