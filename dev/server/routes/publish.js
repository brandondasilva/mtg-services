
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

  var actions = req.body['payload'];

  var payload = {
    "response_type": "ephemeral",
    "replace_original": false,
    "text": ""
  }

  console.log(actions);
  console.log(actions['actions']);
  console.log(actions[0]);

  if (actions["actions"][0]["value"] == "no") {
    payload = { "text": "Not Published. You can check out the added posting on Webflow Editor." };

  } else if (actions["actions"][0]["value"] == "publish") {
    payload = { "text": "Published!" };

    /*// Publish on Webflow
    var publish = webflow.publishSite({
      siteId: '58be0ec3d9b8619b4a64d0d3',
      domains: ['mtg2017.webflow.io']
    });

    publish.then(p => console.log(p));
    */
  } else {
    payload = { "text": "Sorry, that didn't work. Please check Webflow for errors." };

  }

  request({
    url: actions['response_url'],
    method: "POST",
    json: true,
    body: payload,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  });

  res.status(500).send({
    "response_type": "ephemeral",
    "replace_original": false,
    "text": "Something went wrong."
  });
});

module.exports = router;
