var express    = require('express'),
    url        = require('url'),
    bodyParser = require('body-parser'),
    multer     = require('multer'),
    async      = require('async');

app = express();

// simple debug function
p = function(x) {console.log(x);};

// configs(such as database)
app.config = require('./config');

// some common utils
utils = require('./utils');

// mysql utilities
app.db = require('./db-utils');

// set template engine and static file directory
app.set('view engine', 'jade');
app.use(express.static('public'));

// for parsing post data in different formats
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());


// request router and handler
app.get('/', function (req, res) {
  app.db.query('select * from user', null, function (err, rows, fields) {
    if (err) throw err;
    var data = {users: rows, fields: app.config.fields};
    res.render('index', data);
  });
});

// add data page
app.get('/add', function (req, res) {
  res.render('add-data', {fields: app.config.fields});
});

// add data api
app.post('/add', function (req, res) {
  // insert result container
  var post_data = req.body.data,
      insert_res = {success: [], fail: []};

  // validate data
  if (typeof post_data !== 'object')
    res.json(utils.gen_json(403, 'error data', insert_res));

  // data handling function
  var data_handler = function (item, cb) {
    // map input data to insert data
    var data_row = {};
    for (field in app.config.fields) {
      if (typeof item[field] === 'undefined') {
        insert_res.fail.push(item);
        cb(null);
      }
      data_row[field] = item[field];
    }

    // insert data into database
    app.db.query('insert into user set ?', data_row, function (err, rows, fields) {
      data_row.panel_id = item.panel_id;
      if (err) insert_res.fail.push(data_row);
      else insert_res.success.push(data_row);
      cb(null);
    });
  };

  // asynchronously handle all data
  async.each(post_data, data_handler, function (err) {
    if (err) res.send(utils.gen_json(501, 'unknown error', insert_res));
    else res.json(utils.gen_json(200, 'success', insert_res));
  });
});


/* delete or update */
app.post('/:var(del|modify)', function (req, res) {
  var action = {'del': 'delete', 'modify': 'update'}[req.path.substring(1)];
  var handle_list = req.body.data,
      msg = {
        succ: utils.gen_json(200, 'success'),
        fail: utils.gen_json(406, 'failed to ' + action + ' data'),
        err : {
          intern: utils.gen_json(501, 'internal error'),
          client: utils.gen_json(403, 'error data')
        }
      };

  if (typeof handle_list !== 'object')
    req.json(msg.err.client);

  app.db.conn = app.db.connect(app.config.db);
  app.db.conn.beginTransaction(function (err) {
    if (err) req.json(msg.err.intern);

    var data_handler = function (item, cb) {
      var sql = action === 'delete' ?
                      'delete from user where user = ?'
                    : 'update user set ? where user = ?';
      app.db.query(sql, [item, item.user], function (err, rows, fields) {
        if (err) throw err;
        cb(null);
      });
    };

    async.each(handle_list, data_handler, function (err) {
      var rollback = function () {
        app.db.conn.rollback(function () {
          res.json(msg.fail.intern);
        });
      };

      if (err) rollback();

      app.db.conn.commit(function(err) {
        if (err) rollback();
        res.json(msg.succ);
      });
    });
  });
});


//  start server
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('app listening at http://%s:%s', host, port);
});
