var mysql      = require('mysql');

exports.connect = connect;
exports.query = query;
exports.end = end;

function connect(config) {
  conn = mysql.createConnection(config);
  conn.connect();
  return conn;
}

function end(conn) {
  return ! conn ? true : conn.end(function(err) { if (err) throw err;});
}

function query() {
  if ( ! app.db.conn && ! (app.db.conn = connect(app.config.db)))
    throw new Error("Can't connect to database!");

  app.db.conn.query.apply(app.db.conn, arguments);

  // end(app.db.conn);
}
