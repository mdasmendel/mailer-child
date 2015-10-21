var fs = require('fs');
var Q = require('q');
var request = require('request');

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


//readFile(dkym)
//    .then(function (data) {
//        data = data.replace(/^[^\(]+\(|\).+|\"/gi,'');
//        data = data.replace(/\s+/gi,' ');
//        console.log(data);
//    }, function (err) {
//        console.log(err);
//    });

var options = {
    url: 'http://emarketing-fr.emarketing-uk.com:9090/send-test',
    method: "POST",
    headers: {
        Authorization: 'Bearer 21f6f91da0712806233747761b0e0ca53d52cd054a42d1ce42516310402428c0'
    },
    json:{"hostname":"emarketing-fr.com","checkDkim":false}
};
console.log('test req to: ' + options.url);
request(options, function (err, httpResponse, body) {
    if(err){
        console.log(err)
    } else if(httpResponse.statusCode != 200){
        console.log(body)
    } else {
        console.log('ok')
    }
});