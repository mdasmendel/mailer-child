/**
 * Created by Mihai on 27.10.2015.
 */
var r = require('rethinkdb');
var send = require(__dirname + '/send');
Q = require('q');

var compileString = require(__dirname + '/compile-string');

function addMember(members, list, connn, cb) {

    if(members.length === 0){
        cb()
    } else {
        var member = members[0];
        members.splice(0,1);
        r.branch(r.table(list).getAll(member.address, {index: "address"}).isEmpty(),
            r.table(list).insert(member),
            {}).run(connn, function (err, result) {
                if (err) {
                    cb(err);
                    member = null;
                    list = null;
                    connn = null;
                } else {
                    setTimeout(function(){
                        console.log('remain: ', members.length);
                        addMember(members,list,connn, cb);
                        member = null;
                        list = null;
                        connn = null;
                    })
                }

            })
        ;
    }
}

function deleteList(req, res, next){
    r.table(req.params.listName).delete().run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }

        res.send('list ' + req.params.listName + 'was deleted');
    });
}

function addMembers(req, res, next) {

    var members = req.body.members;

    addMember(members, req.params.listName, req.app._rdbConn, function(err){
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

function createList(req, res, next) {
    console.log(req.body);
    r.tableCreate(req.body.address).run(req.app._rdbConn, function (err, result) {
        if (err) {
            return next(err);
        }
        r.table(req.body.address).indexCreate('address').run(req.app._rdbConn,function (err, cursor) {
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

function nextReecipient(recipients, letter, hostname, logList, conn, cb){
    if(recipients.length === 0){
        cb()
    } else {
        var recipient = recipients[0];
        recipients.splice(0,1);
        console.log(recipient);
        var message = {
            from: letter.from,
            to: recipient.address,
            subject: compileString(letter.subject, recipient.vars),
            html: compileString(letter.html, recipient.vars)
        };
        send.sendEmailCampaign(hostname, message)
            .then(function () {
                console.log('sent ', message);
                r.table(logList).insert({
                    status: 'success',
                    head: 'Delivered',
                    content: 'Recipient ' + recipient.address
                }).run(conn);
                setTimeout(function(){
                    nextReecipient(recipients, letter, hostname, logList, conn,cb);
                    recipients = null;
                    letter = null;
                }, 500)
            }, function (err) {
                console.log('err ', message);
                console.log(1, err.toString());
                console.log(2, err);
                console.log(3, err.errors[0]);

                    r.table(logList).insert({
                       status: 'error',
                       head: err.toString(),
                       content: JSON.stringify(err)
                    }).run(conn);
                //if (err.errors[0]){
                //    r.table(logList).insert({
                //        code: err.errors[0].code,
                //        response: err.errors[0].response,
                //        responseCode: err.errors[0].responseCode,
                //        domain: err.errors[0].domain,
                //        exchange: err.errors[0].exchange,
                //        recipients: err.errors[0].recipients
                //    }).run(conn);
                //}



                setTimeout(function(){
                    nextReecipient(recipients, letter, hostname,logList, conn, cb);
                    recipients = null;
                    letter = null;
                }, 500)
            })
    }
}

function creteLogList(name, conn){
    var deferred = Q.defer();
    r.tableCreate(name + 'Log').run(conn, function (err) {
        if (err) {
            deferred.reject(err)
        } else {
            deferred.resolve(name + 'Log')
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

                    nextReecipient(results, letter, hostname,logList,req.app._rdbConn, function(error){
                        if (error) {
                            return next(error);
                        }
                    });
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
    createList: createList,
    deleteList: deleteList,
    getMembers: getMembers,
    sendCampaign: sendCampaign
};