
'use strict';

var moment = require('moment-timezone');

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

  console.log(req.body);

  var payload = {};

  if (req.body['actions']['value'] == "no") {
    payload = {
      "response_type": "ephemeral",
      "replace_original": false,
      "text": "Thanks. You can check out the added posting on Webflow Editor."
    };

  } else if (req.body['actions']['value'] == "publish") {
    payload = {
      "response_type": "ephemeral",
      "replace_original": false,
      "text": "Published!"
    };

    /*// Publish on Webflow
    var publish = webflow.publishSite({
      siteId: '58be0ec3d9b8619b4a64d0d3',
      domains: ['mtg2017.webflow.io']
    });

    publish.then(p => console.log(p));
    */
  } else {
    payload = {
      "response_type": "ephemeral",
      "replace_original": false,
      "text": "Sorry, that didn't work. Please check Webflow for errors."
    };

  }

  request({
    url: req.body['response_url'],
    method: "POST",
    json: true,
    body: payload,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
      }
    }
  });

  res.send(req.body);
});

module.exports = router;
