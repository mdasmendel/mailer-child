/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var config = require(__dirname + '/utils/config');

var app = express();



app.use(bodyParser.json());


app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
});

app.get('/', function (req, res) {
    res.send('Hello world\n');
});

app.post('/config-mailer', function (req, res) {
    console.log(req.body.hostname)
    if (!req.body.hostname){
        res.status(400).send('hostname is empty');
    } else {
        config.configPostfix(req.body.hostname)
            .then(config.connectMilterToPostfix)
            .then(config.connectPostfixToMilter)
            .then(config.generateDkym)
            .then(config.copyInPostfix)
            .then(function () {
                res.send('ok');
            }, function (err) {
                res.status(400).send(err);
            })
    }
});

app.get('/config', function (req, res) {
    request.get('http://45.55.33.155/api/domain-name', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        } else {
            res.status(400).send(error)
        }
    });

});
var PORT = 8080;

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);