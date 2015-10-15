/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var Q = require('q');

var app = express();

var socket = '\nSOCKET="inet:12301@localhost"\n';
var posfixMilter = '\n# DKIM\n' +
    'milter_protocol = 2\n' +
    'milter_default_action = accept\n' +
    'smtpd_milters = inet:localhost:12301\n' +
    'non_smtpd_milters = inet:localhost:12301\n';
var postfixConf = '/etc/postfix/main.cf';
var milterConf = '/etc/default/opendkim';

var connectMilterToPostfix = function(){
    console.log('connectMilterToPostfix')
    var deferred = Q.defer();
    fs.appendFile(milterConf, socket, function (err) {
        if (err){
            deferred.reject(err)
        } else {
            deferred.resolve()
        }
    });

    return deferred.promise;

};


var connectPostfixToMilter = function(){
    console.log('connectPostfixToMilter')
    var deferred = Q.defer();
    fs.appendFile(postfixConf, posfixMilter, function (err) {
        if (err){
            deferred.reject(err)
        } else {
            deferred.resolve()
        }
    });

    return deferred.promise;

};

var readFile = function(name){
    console.log('readFile: ' + name);
    var deferred = Q.defer();
    fs.readFile(name, 'utf8', function (err, data) {
        console.log('Readed : ' + name);
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data)
        }
    });
    return deferred.promise
};

var configPostfix = function (hostname) {
    console.log('configPostfix')
    var deferred = Q.defer();
    readFile(postfixConf)
        .then(function () {
            var destination = hostname + ', localhost.localdomain, , localhost';
            data = data.replace(/myhostname = [^\n]+/gi, 'myhostname = ' + hostname);
            data = data.replace(/mydestination = [^\n]+/gi, 'mydestination = ' + destination);
            console.log('write file')
            fs.writeFile(postfixConf, data, function(err) {
                console.log('Writed : ' + name);
                if(err) {
                    deferred.reject(err)
                } else {
                    deferred.resolve()
                }
            });
        }, function (err) {
            deferred.reject(err)
        });
    return deferred.promise;
};


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
        configPostfix(req.body.hostname)
            .then(connectMilterToPostfix)
            .then(connectPostfixToMilter)
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