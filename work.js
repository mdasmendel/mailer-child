var fs = require('fs');
var Q = require('q');
var cmd = require('child_process');

var genrateKeyCommand = 'opendkim-genkey -t -s mail -d '
var copyKeyCommand = 'cp mail.txt  /etc/postfix/dkim.key'


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

var generateDkym = function(name){
    var deferred = Q.defer();
    cmd.exec(
        genrateKeyCommand +
        name,
        function (error, stdout, stderr) {
            //console.log(1,error);
            //console.log(2, stdout);
            //console.log(3, stderr);
            if (error) {
                deferred.reject(stderr)
            } else {
                deferred.resolve()

            }
        });
    return deferred.promise
};

var copyInPostfix = function(){
    var deferred = Q.defer();
    cmd.exec(
        copyKeyCommand,
        function (error, stdout, stderr) {
            if (error) {
                deferred.reject(stderr)
            } else {
                deferred.resolve()

            }
        });
    return deferred.promise
};

generateDkym('mailo')
.then(copyInPostfix)
.then(function () {
        console.log('ok');
    }, function (err) {
        console.log(err);
    })