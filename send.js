
fs = require('fs');
Q = require('q');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var dkim = require('nodemailer-dkim');
var hbs = require('nodemailer-express-handlebars');


var validateDkim = function () {
    var deferred = Q.defer();
    //dkim.verifyKeys({
    //    domainName: 'emarketing-uk.com',
    //    keySelector: 'mail',
    //    privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    //}, function (err, success) {
    //    if (err) {
    //        console.log('Verification failed');
    //        deferred.reject(err);
    //    } else if (success) {
            deferred.resolve()

        //}
    //});
    return deferred.promise
};

var readLetter = function () {
    var deferred = Q.defer();
    fs.readFile(__dirname + '/test.html', 'utf8', function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data)
        }
    });
    return deferred.promise
};

var sendEmail = function () {

    var optionsSigner = {
        domainName: 'emarketing-uk.com',
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

    //transporter.use('stream', dkim.signer(optionsSigner));

    transporter.use('compile', hbs(optionsHbs));

    transporter.use('compile', htmlToText());

    transporter.sendMail(optionsEmail);
};

validateDkim()
    .then(readLetter)
    .then(sendEmail)
    .then(function () {
        console.log('sent')
    }, function (err) {
        console.log(err)
    });
