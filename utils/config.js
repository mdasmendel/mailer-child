/**
 * Created by Mihai on 15.10.2015.
 */
var fs = require('fs');
var Q = require('q');
var cmd = require('child_process');

var genrateKeyCommand = 'opendkim-genkey -t -s mail -d '
var copyKeyCommand = 'cp mail.txt  /etc/postfix/dkim.key'

var socket = '\nSOCKET="inet:12301@localhost"\n';
var posfixMilter = '\n# DKIM\n' +
    'milter_protocol = 2\n' +
    'milter_default_action = accept\n' +
    'smtpd_milters = inet:localhost:12301\n' +
    'non_smtpd_milters = inet:localhost:12301\n';
var postfixConf = '/etc/postfix/main.cf';
var milterConf = '/etc/default/opendkim';

var connectMilterToPostfix = function(hostname){
    console.log('connectMilterToPostfix')
    var deferred = Q.defer();
    fs.appendFile(milterConf, socket, function (err) {
        if (err){
            deferred.reject(err)
        } else {
            deferred.resolve(hostname)
        }
    });

    return deferred.promise;

};


var connectPostfixToMilter = function(hostname){
    console.log('connectPostfixToMilter')
    var deferred = Q.defer();
    fs.appendFile(postfixConf, posfixMilter, function (err) {
        if (err){
            deferred.reject(err)
        } else {
            deferred.resolve(hostname)
        }
    });

    return deferred.promise;

};

var readFile = function(name){
    console.log('readFile: ' + name);
    var deferred = Q.defer();
    fs.readFile(name, 'utf8', function (err, data) {
        console.log('Readed : ' + JSON.stringify(err));
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
        .then(function (data) {
            var destination = hostname + ', localhost.localdomain, , localhost';
            data = data.replace(/myhostname = [^\n]+/gi, 'myhostname = ' + hostname);
            data = data.replace(/mydestination = [^\n]+/gi, 'mydestination = ' + destination);
            console.log('write file')
            fs.writeFile(postfixConf, data, function(err) {
                console.log('Writed : ' + postfixConf);
                if(err) {
                    deferred.reject(err)
                } else {
                    deferred.resolve(hostname)
                }
            });
        }, function (err) {
            deferred.reject(err)
        });
    return deferred.promise;
};

var generateDkym = function(hostname){
    var deferred = Q.defer();
    cmd.exec(
        genrateKeyCommand +
        hostname,
        function (error, stdout, stderr) {
            //console.log(1,error);
            //console.log(2, stdout);
            //console.log(3, stderr);
            if (error) {
                deferred.reject(stderr)
            } else {
                deferred.resolve(hostname)

            }
        });
    return deferred.promise
};

var copyInPostfix = function(hostname){
    var deferred = Q.defer();
    cmd.exec(
        copyKeyCommand,
        function (error, stdout, stderr) {
            if (error) {
                deferred.reject(stderr)
            } else {
                deferred.resolve(hostname)

            }
        });
    return deferred.promise
};

module.exports = {
    configPostfix: configPostfix,
    connectPostfixToMilter: connectPostfixToMilter,
    connectMilterToPostfix: connectMilterToPostfix,
    generateDkym: generateDkym,
    copyInPostfix: copyInPostfix
}