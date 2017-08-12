
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

  var newsPost = { 'url': req.body['url'] }

  var client = new MetaInspector(req.body['url'], { timeout: 5000 });

  client.on("fetch", function() {

    console.log("SCHEME");
    console.log(client.scheme);

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

    console.log(newsPost);
  });

  client.on("error", function(err){
    console.log(err);
  });

  client.fetch();

  // Create Webflow item to push to the CMS TODO ADD TO FEATURED AUTOMATICALLY
  var item = webflow.createItem({
    collectionId: '58be4ff264167da73c14db28',
    fields: {
      'name': newsPost['title'],
      'slug': 'testing-it-out',
      '_archived': false,
      '_draft': false,
      'article-link': newsPost['url'],
      'image-link': newsPost['image'],
      'meta-description': newsPost['description']
    }
  });

  // HTTP POST to Slack Webhook to post an update on Slack
  /*request({
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
  });*/

  item.then(i => console.log(i)); // Send to Webflow

  res.send(req.body);
});

module.exports = router;
