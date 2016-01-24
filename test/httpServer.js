var chai = require('chai');
var spies = require('chai-spies');

chai.use(spies);

var expect = chai.expect;

var fs = require('fs');
var path = require('path');
//var testtype = ['production', 'development'];

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/* eslint-disable no-unused-vars, no-undef */
require = require('really-need');
/* eslint-enable no-unused-vars, no-undef */
if (process.env.COVERAGE) {
  require('blanket')({
    pattern: require('path').resolve('./httpServer.js')
  });
}


describe('AppServer', function() {
  describe('#createExpressApp', function(){
    var appfactory;
    var goodopts;
    var badfileopts;

    beforeEach(function() {
      goodopts = {
        forceSSLOptions: {
          httpsPort: 7443
        },
        httpauthfile: './test/testauthfile.txt'
      };
      badfileopts = {
        forceSSLOptions: {
          httpsPort: 7443
        },
        httpauthfile: './test/missingfile.txt'
      };
      appfactory = require('../httpServer.js', {
        bustCache: true});
    });

    afterEach( function() {
    });

    it('should return a function', function(){

      var app = appfactory.createExpressApp(goodopts);
      expect(app).to.be.a('function');
    });

    it('should return not be undefined', function(){
      var app = appfactory.createExpressApp(goodopts);
      expect(app).to.exist;
    });

    it('should not throw an error when called with options', function() {
      expect(function() {appfactory.createExpressApp(goodopts)}).to.not.throw(Error);
    });

    it('should throw an error when called without options', function(){
      expect(appfactory.createExpressApp).to.throw(Error);
    });

    it('should throw an error when called with a bad file location', function() {
      expect(function() {appfactory.createExpressApp(badfileopts)}).to.throw(Error);
    });

    it('should throw an error when called with badly formed options', function() {
      var badformfileopts = {
        forceSSLsOptions: {
          httpsPort: 7443
        },
        httpauhfile: './test/testauthfile.txt'
      };

      expect(function() {appfactory.createExpressApp(badformfileopts)}).to.throw(Error);

    });
  });

  describe('ExpressJS HTTPS requests', function() {
    var supertest;
    var appfactory;
    var goodopts = {
      forceSSLOptions: {
        httpsPort: 7443
      },
      httpauthfile: './test/testauthfile.txt'
    };
    var httpsoptions = {
      key: fs.readFileSync(path.resolve(__dirname, './dummytls.key')),
      cert: fs.readFileSync(path.resolve(__dirname, './dummytls.crt'))
    };

    var https;

    beforeEach(function(done) {

      appfactory = require('../httpServer.js', {
        bustCache: true});
      https = require('https',{
        bustCache: true}).createServer(httpsoptions, appfactory.createExpressApp(goodopts))
        .listen(goodopts.forceSSLOptions.httpsPort, done);
      supertest = require('supertest', {
        bustCache: true}).agent(https);
    });

    afterEach(function(done) {
      https.close(done);
    });

    it('should return 401 for failed authentications', function(done) {
      supertest
        .get('/')
        .expect(401, done);
    });
    it('should return 200 for authenticated requests to /', function(done) {
      supertest
        .get('/')
        .auth('admin', 'raspberry')
        .expect(200, done);
    });

    it('should return 404 for non-existent files', function(done) {
      supertest
        .get('/index2.html')
        .auth('admin', 'raspberry')
        .expect(404, done);
    });

  });

  describe('ExpressJS HTTP Requests', function(){
    var supertest;
    var appfactory;
    var goodopts = {
      forceSSLOptions: {
        httpsPort: 7443
      },
      httpauthfile: './test/testauthfile.txt'
    };

    beforeEach(function() {

      appfactory = require('../httpServer.js', {
        bustCache: true});
      supertest = require('supertest', {
        bustCache: true})(appfactory.createExpressApp(goodopts));
    });


    it('should redirect http to https port', function(done) {
      supertest
        .get('/')
        .expect(301, done);
    });
    it('should not require http-basic auth on http port', function(done) {

      function authCheck(res) {
        if (res.status === 401) {
          throw new Error('Incorrectly prompting for authentication.');
        }
      }

      supertest
        .get('/')
        .expect(authCheck)
        .end(done);
    });
  });
});

describe('HTTP(S) server factory requests', function() {
  var supertest;
  var httpstest;
  var options = {
    httpport: {
      value: 7880
    },
    httpsport: {
      value: 7443
    },
    user: {
      value:'moteino'
    },
    group: {
      value: 'moteino'
    },
    droppriv: {
      value: false
    },
    tls: {
      key: {
        value: './test/dummytls.key'
      },
      cert: {
        value: './test/dummytls.crt'
      }
    },
    httpauthfile: {
      value: './test/testauthfile.txt'
    }
  };

  beforeEach(function(done) {

    httpstest = require('../httpServer.js', {
      bustCache: true}).createServer(options, done);
    supertest = require('supertest', {
      bustCache: true}).agent(httpstest);
  });

  afterEach(function(done) {
    httpstest.close(done);
  });

  it('should allow connections on HTTP test port ' + options.httpport.value, function(done) {
    supertest = require('supertest', {
      bustCache: true})('http://localhost:' + options.httpport.value);
    supertest
      .get('/')
      .expect(301, done);
  });
  it('should allow connections on HTTPS test port ' + options.httpsport.value, function(done) {
    supertest
      .get('/index.html')
      .auth('admin', 'raspberry')
      .expect(200, done);
  });
  it('should return 401 for failed authentications', function(done) {
    supertest
      .get('/')
      .expect(401, done);
  });
  it('should return 200 for authenticated requests to /', function(done) {
    supertest
      .get('/')
      .auth('admin', 'raspberry')
      .expect(200, done);
  });
  it('should return 404 for non-existent files', function(done) {
    supertest
      .get('/index2.html')
      .auth('admin', 'raspberry')
      .expect(404, done);
  });

});
//Move to another file??
