/**
 * Created by Mihai on 26.10.2015.
 */
module.exports = {
    rethinkdb: {
        host: process.env.DB_PORT_28015_TCP_ADDR,
        port: 28015,
        authKey: '',
        db: 'rethinkdb_ex'
    },
    express: {
        port: 9000
    }
};