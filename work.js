var fs = require('fs');
var Q = require('q');

var socket = 'SOCKET="inet:12301@localhost"\n';
var posfixMilter = '# DKIM\n' +
    'milter_protocol = 2\n' +
    'milter_default_action = accept\n' +
    'smtpd_milters = inet:localhost:12301\n' +
    'non_smtpd_milters = inet:localhost:12301\n';
var postfixConf = '/etc/postfix/main.cf';
var milterConf = '/etc/default/opendkim';

var connectMilterToPostfix = function(){
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
    var deferred = Q.defer();
    fs.readFile(name, 'utf8', function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data)
        }
    });
    return deferred.promise
};

var configPostfix = function (hostname) {
    var deferred = Q.defer();
    readFile(postfixConf)
        .then(function () {
            var destination = hostname + ', localhost.localdomain, , localhost';
            data = data.replace(/myhostname = [^\n]+/gi, 'myhostname = ' + hostname);
            data = data.replace(/mydestination = [^\n]+/gi, 'mydestination = ' + destination);
            fs.writeFile(postfixConf, data, function(err) {
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
readFile(postfixConf)
    .then(changeConf)
