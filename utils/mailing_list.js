/**
 * Created by Mihai on 27.10.2015.
 */
var r = require('rethinkdb');
var async = require('async');
var send = require(__dirname + '/send');
Q = require('q');

var compileString = require(__dirname + '/compile-string');

function addMember(members, list, connn, cb) {

    if (members.length === 0) {
        cb()
    } else {
        var member = members[0];
        members.splice(0, 1);
        r.branch(r.table(list).getAll(member.address, {index: "address"}).isEmpty(),
            r.table(list).insert(member),
            {}).run(connn, function (err, result) {
                if (err) {
                    cb(err);
                    member = null;
                    list = null;
                    connn = null;
                } else {
                    setTimeout(function () {
                        console.log('remain: ', members.length);
                        addMember(members, list, connn, cb);
                        member = null;
                        list = null;
                        connn = null;
                    })
                }

            })
        ;
    }
}

function deleteList(req, res, next) {
    r.tableDrop(req.params.listName).run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }
        r.tableDrop(req.params.listName + "_logs").run(req.app._rdbConn);
        res.send('list ' + req.params.listName + ' was deleted');

    });
}

function addMembers(req, res, next) {

    var members = req.body.members;

    addMember(members, req.params.listName, req.app._rdbConn, function (err) {
        if (err) {
            res.status(400).send(err)
        } else {
            res.send('ok')
        }
    })
}

function getLists(req, res, next) {
    r.tableList().run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }

        res.json(result);
    });
}

function getLogLists(req, res, next) {
    r.tableList().run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }
        var logLists = [];
        for (var i = 0; i < result.length; i++) {
            if (result[i].match(/_logs$/)) {
                logLists.push(result[i])
            }
        }
        res.json(logLists);
    });
}

function createList(req, res, next) {
    console.log(req.body);
    r.tableCreate(req.body.address).run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }
        r.table(req.body.address).indexCreate('address').run(req.app._rdbConn, function (err, cursor) {
            if (err) {
                return next(err);
            }
            res.json(cursor);
        });
    });
}

/*
 * Get items.
 */
function getMembers(req, res, next) {
    r.table(req.params.listName).run(req.app._rdbConn, function (err, cursor) {
        if (err) {
            return next(err);
        }

        //Retrieve all the todos in an array.
        cursor.toArray(function (err, result) {
            if (err) {
                return next(err);
            }

            res.json(result);
        });
    });
}

function getLogsByList(req, res, next) {
    r.table(req.params.listName + '_logs').run(req.app._rdbConn, function (err, cursor) {
        if (err) {
            return next(err);
        }

        //Retrieve all the todos in an array.
        cursor.toArray(function (err, result) {
            if (err) {
                return next(err);
            }

            res.json(result);
        });
    });
}

function sendFunc(data, cb) {
    var start = new Date().getTime();
    var message = {
        from: data.letter.from,
        to: data.recipient.address,
        subject: compileString(data.letter.subject, data.recipient.vars),
        html: compileString(data.letter.html, data.recipient.vars)
    };
    console.log(data.recipient.address);
    send.sendEmailCampaign(data.hostname, message)
        .then(function () {
            r.table(data.logList).insert({
                status: 'success',
                head: 'Delivered',
                Recipient: data.recipient.address
            }).run(data.conn);
            var end = new Date().getTime();
            if(end - start < 60000){
                console.log('waite ' + (end - start))
                setTimeout(function(){
                    cb()
                }, end - start)
            } else {
                cb()
            }

        }, function (err) {
            r.table(data.logList).insert({
                status: 'error',
                head: err.toString(),
                Recipient: data.recipient.address,
                content: JSON.parse(JSON.stringify(err))
            }).run(data.conn);
            var end = new Date().getTime();
            if(end - start < 60000){
                console.log('waite ' + (end - start));
                setTimeout(function(){
                    cb()
                }, end - start)
            } else {
                cb()
            }
        })
}

function nextReecipient(recipients, letter, hostname, logList, conn, cb) {
    if (recipients.length === 0) {
        cb()
    } else {
        var recipient = recipients[0];
        recipients.splice(0, 1);
        console.log(recipient);
        var message = {
            from: letter.from,
            to: recipient.address,
            subject: compileString(letter.subject, recipient.vars),
            html: compileString(letter.html, recipient.vars)
        };
        send.sendEmailCampaign(hostname, message)
            .then(function () {
                r.table(logList).insert({
                    status: 'success',
                    head: 'Delivered',
                    Recipient: recipient.address
                }).run(conn);
                setTimeout(function () {
                    nextReecipient(recipients, letter, hostname, logList, conn, cb);
                    recipients = null;
                    letter = null;
                }, 500)
            }, function (err) {
                r.table(logList).insert({
                    status: 'error',
                    head: err.toString(),
                    Recipient: recipient.address,
                    content: JSON.parse(JSON.stringify(err))
                }).run(conn);


                setTimeout(function () {
                    nextReecipient(recipients, letter, hostname, logList, conn, cb);
                    recipients = null;
                    letter = null;
                }, 500)
            })
    }
}

function creteLogList(name, conn) {
    var deferred = Q.defer();
    r.tableCreate(name + '_logs').run(conn, function (err) {
        if (err) {
            deferred.reject(err)
        } else {
            deferred.resolve(name + '_logs')
        }

    });
    return deferred.promise

}

function sendCampaign(req, res, next) {
    console.log(req.body);
    var letter = req.body.message;
    creteLogList(letter.to, req.app._rdbConn)
        .then(function (logList) {
            r.table(letter.to).run(req.app._rdbConn, function (err, cursor) {
                if (err) {
                    return next(err);
                }

                //Retrieve all the members in an array.

                var hostname = req.body.hostname;
                cursor.toArray(function (err, results) {
                    if (err) {
                        return next(err);
                    }
                    var campaignFunc = async.queue(sendFunc, req.body.sendPerMinute);

                    campaignFunc.drain = function () {
                        console.log('sent');
                    };

                    for (var i = 0; i < results.length; i++) {
                        campaignFunc.push({
                            recipient: results[i],
                            letter: letter,
                            hostname: hostname,
                            logList: logList,
                            conn: req.app._rdbConn
                        })
                    }
                    //nextReecipient(results, letter, hostname, logList, req.app._rdbConn, function (error) {
                    //    if (error) {
                    //        return next(error);
                    //    }
                    //});
                    res.status(200).send('sending');

                });
            });
        }, function (err) {
            return next(err);
        })

}

module.exports = {
    addMembers: addMembers,
    getLists: getLists,
    getLogLists: getLogLists,
    getLogsByList: getLogsByList,
    createList: createList,
    deleteList: deleteList,
    getMembers: getMembers,
    sendCampaign: sendCampaign
};