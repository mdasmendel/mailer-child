/**
 * Created by Mihai on 16.10.2015.
 */

fs = require('fs');
Q = require('q');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var dkim = require('nodemailer-dkim');
var hbs = require('nodemailer-express-handlebars');


var validateDkim = function (domainName) {
    var deferred = Q.defer();
    console.log(domainName)
    dkim.verifyKeys({
        domainName: domainName,
        keySelector: 'mail',
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    }, function (err, success) {
        if (err) {
            console.log('Verification failed');
            console.log(err);
            deferred.reject(err);
        } else if (success) {
            deferred.resolve(domainName);

        }
    });
    return deferred.promise
};

var readLetter = function (domainName) {
    var deferred = Q.defer();
    fs.readFile(__dirname + '/test.html', 'utf8', function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve({letter: data, domainName: domainName})
        }
    });
    return deferred.promise
};

var sendEmail = function (hostname) {

    var optionsSigner = {
        domainName: hostname,
        keySelector: 'mail',
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    };

    var optionsHbs = {
        'viewEngine': '.html',
        'viewPath': __dirname + '/',
        'extName': '.html'
    };

    var optionsEmail = {
        from: 'kligler.j@emarketing-uk.com',
        to: 'dascal.mi@gmail.com',
        subject: 'Action required - You\'ve reached your Mailgun email limit',
        template: 'test',
        context: {
            name: 'Dascal Mihai'
        }
    };

    var transporter = nodemailer.createTransport();

    transporter.use('stream', dkim.signer(optionsSigner));

    transporter.use('compile', hbs(optionsHbs));

    transporter.use('compile', htmlToText());

    transporter.sendMail(optionsEmail);
};

module.exports = {
    validateDkim: validateDkim,
    readLetter: readLetter,
    sendEmail: sendEmail
};

