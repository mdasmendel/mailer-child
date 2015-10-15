/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');

var bodyParser = require('body-parser');
//
//request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
//    if (!error && response.statusCode == 200) {
//        console.log(body) // Show the HTML for the Google homepage.
//    }
//});


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

var express = require('express');

// Constants
var PORT = 8080;

// App
var app = express();

app.use(bodyParser.json());
app.use(allowCrossDomain);

app.get('/', function (req, res) {
    res.send('Hello world\n');
});

app.post('/config-mailer', function (req, res) {

    res.send('Hello world\n');
});

app.get('/config', function (req, res) {
    request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
    });

});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);