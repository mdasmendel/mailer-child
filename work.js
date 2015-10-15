var fs = require('fs');
var Q = require('q');

var dkym = '/etc/postfix/dkim.key'


var readFile = function (name) {
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


readFile(dkym)
    .then(function (data) {
        data = data.replace(/^[^\(]+\(|\).+$|\"|\n/gi,'');
        console.log(data);
    }, function (err) {
        console.log(err);
    });