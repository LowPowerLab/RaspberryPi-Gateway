/* eslint-disable no-console */

var express = require('express');
var debug = {
  app: require('debug')('moteino-gateway'),
  error: require('debug')('moteino-gateway:error')
};
debug.error.log = console.error.bind(console);


module.exports = {
  //Factory method for creating expressJS app.
  createExpressApp: function createExpressApp(options) {

    var path = require('path');
    var favicon = require('serve-favicon');
    var logger = require('morgan');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var auth = require('http-auth');
    var forceSSL = require('express-force-ssl');
    var compression = require('compression');

    var app = express();

    //Check for invalid authfile
    if (options.httpauthfile) {
      var authbasic = auth.basic({
        realm: 'Moteino-Gateway Restricted',
        file: options.httpauthfile
      });
    } else {
      throw new Error('Missing http auth file.');
    }

    app.set('forceSSLOptions', options.forceSSLOptions);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    if (app.get('env') === 'development') {
      app.use(logger('dev'));
    } else {
      app.use(logger('combined'));
    }
    app.use(forceSSL);
    app.use(auth.connect(authbasic));
    app.use(compression());
    app.use(favicon(path.join(__dirname, '/www/images/favicon.ico')));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'www')));


    /// catch 404 and forwarding to error handler
    app.get('*',function(req, res, next) {
      var err = new Error('Not Found');

      err.status = 404;
      next(err);
    });

    /// error handlers
/* eslint-disable no-unused-vars */
    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
      app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
          title: 'Error',
          message: err.message,
          error: err
        });
      });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        title: 'Error',
        message: err.message,
        error: {}
      });
    });
/* eslint-enable no-unused-vars */

    return app;
  },


//Factory method for creating https server.
  createServer: function createServer(options, callback) {
    var path = require('path');
    var fs = require('fs');
    var http = require('http');
    var https = require('https');
    //Set configuration values
    var expressopts = {
      forceSSLOptions: {
        httpsPort: options.httpsport.value
      },
      httpauthfile: path.resolve(__dirname, options.httpauthfile.value)
    };

    var expressApp = module.exports.createExpressApp(expressopts);

    //Configure location of the TLS certificates for the HTTPS server.
    var httpsoptions = {
      key: fs.readFileSync(path.resolve(__dirname, options.tls.key.value)),
      cert: fs.readFileSync(path.resolve(__dirname, options.tls.cert.value))
    };

    function httpsListenCB(next) {
      debug.app('Express HTTPS server listening on port ' + options.httpsport.value);
      //Probably should drop privilege a different way. Its possible to have out
      //of order execution and drop privilege before http listen has attached.

      //Move to next callback.
      return next();
    }

    function netServerErrCB(err) {
      if (err.code == 'EACCES') {
        debug.error(err.code + ' ' + err.syscall);
        debug.error('Error: Insufficient access to bind to port. Running as root?');
        console.log('Error: Insufficient access to bind to port. Running as root?');
        process.exit(1);
      } else if (err.code == 'EADDRINUSE') {
        debug.error(err.code + ' ' + err.syscall);
        debug.error('Error: Someone is already bound to our port.');
        console.log('Error: Someone is already bound to our port.');
        process.exit(1);
      }

      //generic handler
      debug.app(err.code + ' ' + err.syscall);
      process.exit(1);
    }


    //Create the HTTP server. Redirecting to HTTPS is managed by the forceSSL middleware.
    var httpSrv = http.createServer(expressApp)
      .on('error', netServerErrCB)
      .listen(options.httpport.value, function httpListenCB() {
        debug.app('Express HTTP server listening on port ' + options.httpport.value);
      });

    //Setup HTTPS server
    var httpsSrv = https.createServer(httpsoptions, expressApp)
      .on('error', netServerErrCB)
      .on('close', function () {httpSrv.close()})
      .listen(options.httpsport.value, function () {httpsListenCB(callback)});

    return httpsSrv;
  }
};
