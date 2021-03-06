/**
 * Created by Mihai on 16.10.2015.
 */

fs = require('fs');
Q = require('q');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var dkim = require('nodemailer-dkim');
var hbs = require('nodemailer-express-handlebars');
var compileString = require(__dirname + '/compile-string');
var config = require(__dirname + '/config');

var r = require('rethinkdb');
var cheerio = require('cheerio');


var dkimKeySelector = 'mail';

var validateDkim = function (domainName) {
    var deferred = Q.defer();
    console.log(domainName);
    dkim.verifyKeys({
        domainName: domainName,
        keySelector: dkimKeySelector,
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    }, function (err, success) {
        if (err) {
            console.log('Verification failed');
            console.log(err);
            var errContent = err.toString() + '\n';
            errContent += 'dkim key: ' + dkimKeySelector + '\n';
            errContent += 'host name: ' + domainName + '\n';
            errContent += fs.readFileSync('/etc/postfix/dkim.key') + '\n';
            deferred.reject(errContent);
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

var sendTestEmail = function (hostname) {
    var deferred = Q.defer();
    var optionsSigner = {
        domainName: hostname,
        keySelector: dkimKeySelector,
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    };

    var optionsHbs = {
        'viewEngine': '.html',
        'viewPath': __dirname + '/',
        'extName': '.html'
    };

    var optionsEmail = {
        from: 'kligler.j@' + hostname,
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

    transporter.sendMail(optionsEmail, function(err){
        if(err){
            deferred.reject(err);
        } else {
            deferred.resolve(hostname);
        }
    });
    return deferred.promise
};

var sendEmail = function (hostname, message, conn) {

    var deferred = Q.defer();
    var optionsSigner = {
        domainName: hostname,
        keySelector: dkimKeySelector,
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    };

    var html = compileString(message.html, JSON.parse(message.vars)[message.to]);
    var subject = compileString(message.subject, JSON.parse(message.vars)[message.to]);
    var optionsEmail = {
        from: message.from,
        to: message.to,
        subject: subject,
        html: html
    };

    var transporter = nodemailer.createTransport();

    transporter.use('stream', dkim.signer(optionsSigner));

    transporter.use('compile', htmlToText());

    transporter.sendMail(optionsEmail, function(err){
        if(err){
            r.table('nocampaign_logs').insert({
                status: 'error',
                head: err.toString(),
                Recipient: message.to,
                content: JSON.parse(JSON.stringify(err)),
                createdAt: new Date()
            }).run(conn);
            deferred.reject(err);
        } else {
            r.table('nocampaign_logs').insert({
                status: 'success',
                head: 'delivered',
                Recipient: message.to,
                createdAt: new Date()
            }).run(conn);
            deferred.resolve(hostname);
        }
    });
    return deferred.promise
};

var sendEmailCampaign = function (hostname, message) {

    var deferred = Q.defer();
    var optionsSigner = {
        domainName: hostname,
        keySelector: dkimKeySelector,
        privateKey: fs.readFileSync('/etc/postfix/dkim.key')
    };

    var transporter = nodemailer.createTransport();

    transporter.use('stream', dkim.signer(optionsSigner));

    transporter.use('compile', htmlToText());

    transporter.sendMail(message, function(err){
        if(err){
            deferred.reject(err);
        } else {
            deferred.resolve(hostname);
        }
    });
    return deferred.promise
};
var addClickTracking = function (domain, message, logList) {
    $ = cheerio.load(message.html);
    var jwt = require('jwt-simple');

    var link = $('a');

    link.attr('href', function (i, href) {
        //var link = href.replace(domain, 'email')
        var payload = {
            domain: domain,
            link: href,
            email: message.to,
            logList: logList
        };
        return href.replace(/.+/, 'http://email.' + domain + '/' + jwt.encode(payload, config.jwtSecret))
    });

    return $.html()

}

module.exports = {
    validateDkim: validateDkim,
    readLetter: readLetter,
    sendTestEmail: sendTestEmail,
    sendEmail: sendEmail,
    sendEmailCampaign: sendEmailCampaign,
    addClickTracking: addClickTracking
};

