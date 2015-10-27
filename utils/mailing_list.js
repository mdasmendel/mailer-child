/**
 * Created by Mihai on 27.10.2015.
 */
var r = require('rethinkdb');



function addMember(members, list, connn, cb) {

    if(members.length === 0){
        cb()
    } else {
        var member = members[0];
        members.splice(0,1);
        r.branch(
            r.table(list).getAll(member.email, {index: "email"}).isEmpty(),
            r.table(list).insert(member),
            {})
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
        r.table(req.body.address).indexCreate('email').run(req.app._rdbConn,function (err, cursor) {
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

module.exports = {
    addMembers: addMembers,
    getLists: getLists,
    createList: createList,
    deleteList: deleteList,
    getMembers: getMembers
};