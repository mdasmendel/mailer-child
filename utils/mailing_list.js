/**
 * Created by Mihai on 27.10.2015.
 */
var r = require('rethinkdb');
var send = require(__dirname + '/send');

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

function nextReecipient(recipients, hostname, letter, cb){
    if(members.length === 0){
        cb()
    } else {
        var recipient = recipients[0];

        var message = {
            from: letter.from,
            to: recipient.address,
            subject: compileString(letter.html, recipient.vars),
            html: compileString(letter.html, recipient.vars)
        };
        send.sendEmailCampaign(hostname, message)
            .then(function () {
                nextReecipient(recipients, letter, cb);
                recipients = null;
                letter = null;
            }, function (err) {
                cb(err);
                recipients = null;
                letter = null;
            })
    }
}

function sendCampaign(req, res, next) {
    console.log(req.body);
    var letter = req.body.message;
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
            nextReecipient(results, letter, hostname, function(error){
                if (error) {
                    return next(error);
                }
                res.status(200).send('sent')
            })
        });
    });
}

module.exports = {
    addMembers: addMembers,
    getLists: getLists,
    createList: createList,
    deleteList: deleteList,
    getMembers: getMembers,
    sendCampaign: sendCampaign
};