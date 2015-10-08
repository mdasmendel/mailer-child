/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');
//
//request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
//    if (!error && response.statusCode == 200) {
//        console.log(body) // Show the HTML for the Google homepage.
//    }
//});
var express = require('express');

// Constants
var PORT = 8080;

// App
var app = express();
app.get('/', function (req, res) {
    res.send('Hello world\n');
});
app.get('/config', function (req, res) {
    request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send('Hello world\n');res.send('Hello world\n');
        }
    });

});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);