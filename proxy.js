/**
 * Created by Mihai on 07.10.2015.
 */
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var config = require(__dirname + '/utils/config');
var send = require(__dirname + '/utils/send');
var async = require('async');
var r = require('rethinkdb');
var dbConfig = require(__dirname + '/utils/db_config.js');
var mailingListApi = require(__dirname + '/utils/mailing_list.js');

var app = express();


app.use(bodyParser.json());


app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    next();
});

app.route('/api/v1/lists/:listName?')
    .get(mailingListApi.getLists)
    .post(mailingListApi.createList)
    .delete(mailingListApi.deleteList);

app.route('/api/v1/log-lists')
    .get(mailingListApi.getLogLists);

app.route('/api/v1/log-lists/:listName')
    .get(mailingListApi.getLogsByList);

app.route('/api/v1/:listName/members')
    .get(mailingListApi.getMembers)
    .post(mailingListApi.addMembers);

app.post('/api/v1/send-campaign', mailingListApi.sendCampaign);
app.get('/', function (req, res) {
    res.send('Hello world\n');
});
app.get('/tracking-image/:email', function (req, res) {
    console.log('mail ' + req.params.email + ' was open');
    res.send('');
});

app.post('/send-test', function (req, res) {
    var hostname = req.body.hostname;
    var checkDkim = req.body.checkDkim;
    console.log(hostname);
    if (!hostname) {
        res.status(400).send('hostname is empty');
    } else {
        if (checkDkim) {
            send.validateDkim(hostname)
                .then(send.sendTestEmail)
                .then(function () {
                    res.send('sent')
                }, function (err) {
                    res.status(400).send(err)
                });
        } else {
            send.sendTestEmail(hostname)
                .then(function () {
                    res.send('sent')
                }, function (err) {
                    res.status(400).send(err)
                });
        }

    }

});

app.post('/send-message', function (req, res) {
    var hostname = req.body.hostname;
    var checkDkim = req.body.checkDkim;
    var message = req.body.message;
    message.html += '<img src="http://46.101.201.43:9090/tracking-image/mihai@mihai.com"/>';
    //console.log(req.body);
    if (!hostname) {
        res.status(400).send('hostname is empty');
    } else {
        send.sendEmail(hostname, message)
            .then(function () {
                res.status(200).send('sent')
            }, function (err) {
                res.status(400).send(err)
            });
    }

});

app.post('/config-mailer', function (req, res) {
    console.log(req.body.hostname);
    if (!req.body.hostname) {
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
app.get('/get-dkym', function (req, res) {
    config.getDkym()
        .then(function (data) {
            res.send(data);
        }, function (err) {
            res.status(400).send(err);
        })

});
function startExpress(connection) {
    app._rdbConn = connection;
    app.listen(dbConfig.express.port);
    console.log('Listening on port ' + dbConfig.express.port);

}

/*
 * Connect to rethinkdb, create the needed tables/indexes and then start express.
 * Create tables/indexes then start express
 */
async.waterfall([
    function connect(callback) {
        r.connect(dbConfig.rethinkdb, callback);
    },
    function createDatabase(connection, callback) {
        //Create the database if needed.
        r.dbList().contains(dbConfig.rethinkdb.db).do(function (containsDb) {
            return r.branch(
                containsDb,
                {created: 0},
                r.dbCreate(dbConfig.rethinkdb.db)
            );
        }).run(connection, function (err) {
            callback(err, connection);
        });
    },
    function createTable(connection, callback) {
        //Create the table if needed.
        r.tableList().contains('todos').do(function (containsTable) {
            return r.branch(
                containsTable,
                {created: 0},
                r.tableCreate('todos')
            );
        }).run(connection, function (err) {
            callback(err, connection);
        });
    },
    function createIndex(connection, callback) {
        //Create the index if needed.
        r.table('todos').indexList().contains('createdAt').do(function (hasIndex) {
            return r.branch(
                hasIndex,
                {created: 0},
                r.table('todos').indexCreate('createdAt')
            );
        }).run(connection, function (err) {
            callback(err, connection);
        });
    },
    function waitForIndex(connection, callback) {
        //Wait for the index to be ready.
        r.table('todos').indexWait('createdAt').run(connection, function (err, result) {
            callback(err, connection);
        });
    }
], function (err, connection) {
    if (err) {
        console.error(err);
        process.exit(1);
        return;
    }

    startExpress(connection);
});



