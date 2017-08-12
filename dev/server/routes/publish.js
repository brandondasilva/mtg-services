
'use strict';

var express = require('express');
var request = require('request');
var router = express.Router();

// Set up and configure Webflow
var Webflow = require('webflow-api');
var webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN });

router.get ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.send('API v1 GET: Hello World!');
});

router.post ('/', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');

  res.send({
    "response_type": "ephemeral",
    "replace_original": false,
    "text": "Working..."
  });

  var actions = JSON.parse(req.body['payload']);

  var originalMessage = actions['original_message'];
  delete originalMessage['attachments'][1]['actions'];
  payload = originalMessage['attachments'];

  console.log(actions);
  console.log(originalMessage);

  if (actions["actions"][0]["value"] == "no") {
    payload[1].push({
      "text": "Not Published. You can check out the added posting on Webflow Editor."
    };

  } else if (actions["actions"][0]["value"] == "publish") {
    payload[1].push({
      "text": "Published!"
    });

    // Publish on Webflow
    var publish = webflow.publishSite({
      siteId: '58be0ec3d9b8619b4a64d0d3',
      domains: ['mtg2017.webflow.io']
    });

    publish.then(p => console.log(p));

  } else {
    payload[1].push({
      "text": "Sorry, that didn't work. Please check Webflow for errors."
    };
  }


  attachments[1]['text'] = "";

  console.log(payload);

  request({
    url: actions['response_url'],
    method: "POST",
    json: true,
    body: { payload },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  });

  // res.status(500).send({
  //   "response_type": "ephemeral",
  //   "replace_original": false,
  //   "text": "Something went wrong."
  // });
});

module.exports = router;
