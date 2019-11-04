// **********************************************************************************
// Websocket server backend for the Moteino IoT Gateway
// Hardware and software stack details: http://lowpowerlab.com/gateway
// This is a work in progress and is released without any warranties expressed or implied.
// See license.txt for license and limitations of use of this software.
// **********************************************************************************
// Based on Node.js, and following node packages:
//      socket.io, node-serialport, neDB, nodemailer, console-stamp
// **********************************************************************************
//                    BEFORE THE FIRST USE:
//       Adjust settings in settings.json5 and read the rest of this readme.
// **********************************************************************************
// NeDB is Node Embedded Database - a persistent database for Node.js, with no dependency
// Specs and documentation at: https://github.com/louischatriot/nedb
//
// Under the hood, NeDB's persistence uses an append-only format, meaning that all updates
// and deletes actually result in lines added at the end of the datafile. The reason for
// this is that disk space is very cheap and appends are much faster than rewrites since
// they don't do a seek. The database is automatically compacted (i.e. put back in the
// one-line-per-document format) everytime your application restarts.
//
// This script is configured to compact the database every 24 hours since time of start.
// ********************************************************************************************
// Copyright Felix Rusu, Low Power Lab LLC (2018), http://lowpowerlab.com/contact
// ********************************************************************************************
// IMPORTANT details about NeDB:
// _id field is special - if not used it is automatically added and used as unique index
//                      - we can set that field when inserting to use it as an automatic unique index for fast lookups of nodes (by node Id)
// ********************************************************************************************
var nconf = require('nconf');                                   //https://github.com/indexzero/nconf
var JSON5 = require('json5');                                   //https://github.com/aseemk/json5
var path = require('path');
var dbDir = 'data/db';
var packageJson = require('./package.json')
var metricsFile = 'metrics.js';
var userMetricsDir = 'userMetrics';
nconf.argv().file({ file: path.resolve(__dirname, 'settings.json5'), format: JSON5 });
settings = nconf.get('settings');
var dbLog = require(path.resolve(__dirname,'logUtil.js'));
io = require('socket.io').listen(settings.general.socketPort.value);
var serialport = require("serialport");                         //https://github.com/node-serialport/node-serialport
var Datastore = require('nedb');                                //https://github.com/louischatriot/nedb
var nodemailer = require('nodemailer');                         //https://github.com/andris9/Nodemailer
var request = require('request');
var http = require('http');
var url = require('url');
db = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.name.value), autoload: true });       //used to keep all node/metric data
var dbunmatched = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.nonMatchesName.value), autoload: true });
var dbCompacted = Date.now();
fs = require('fs');

//old: port = new serialport.SerialPort(settings.serial.port.value, { baudrate : settings.serial.baud.value, parser: serialport.parsers.readline("\n") }, false);
var port = new serialport(settings.serial.port.value, {baudRate : settings.serial.baud.value});
var Readline = serialport.parsers.Readline;
var parser = new Readline();
port.pipe(parser);

port.on('error', function serialErrorHandler(error) {
  //Send serial error messages to console. Better error handling needs to be here in the future.
  console.error(error.message);
});

port.on('close', function serialCloseHandler(error) {
  //Give user a sane error message and exit. Future possibilities could include sending message to front end via socket.io & setup timer to retry opening serial.
  console.error(error.message);
  process.exit(1);
});

parser.on("data", function(data) { processSerialData(data); });

require("console-stamp")(console, settings.general.consoleLogDateFormat.value); //timestamp logs - https://github.com/starak/node-console-stamp

//HTTP ENDPOINT - accept HTTP: data from the internet/LAN
http.createServer(httpEndPointHandler).listen(8081);

//LOAD NODE/METRICS DEFINITIONS:
// - First load main metrics.js definitions (metrics, motes, events etc)
metricsDef = require(path.resolve(__dirname, metricsFile));
// - Then load user metrics which can override default metrics
try {
  console.info('LOADING USER METRICS...');
  merge = require('merge');
  if (fs.existsSync(__dirname + '/' + userMetricsDir))
  {
    fs.readdirSync(__dirname + '/' + userMetricsDir).forEach(function(file) {
      if (file.match(/\.js$/) !== null) {
        console.info('LOADING USER METRICS MODULE [' + file + ']');
        try {
          var tmp = require(__dirname + '/' + userMetricsDir + '/' + file);
          metricsDef.metrics = merge(true, metricsDef.metrics, tmp.metrics);
          metricsDef.motes = merge(true, metricsDef.motes, tmp.motes);
          metricsDef.events = merge(true, metricsDef.events, tmp.events);
          delete tmp.metrics;
          delete tmp.motes;
          delete tmp.events;
          metricsDef = merge(true, metricsDef, tmp); //merge anything else (properties, variables, objects, functions)
          //console.info('USER METRICS MERGE RESULT V: ' + JSON.stringify(metricsDef.metrics.V)); //verify that a custom metric was loaded
          //console.info('USER METRICS MERGE RESULT VAR: ' + JSON.stringify(metricsDef.ONEDAYHOURS)); //verify that a custom variable was loaded
          //console.info('USER METRICS MERGE RESULT FUNC: ' + metricsDef.secondsInOneDay.toString()); //verify that a custom function was loaded
        } catch (ex) {
          console.error('FAIL LOADING USER METRICS MODULE ['+ file + ']: ' + ex.message);
        }
      }
    });
  } else console.info('NO USER METRICS DEFINED (dir: /' + userMetricsDir + '), SKIPPING');
}
catch (ex) {
  console.error('FAIL ACCESSING USER METRICS: '+ ex.message);
}

db.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value); //compact the database every 24hrs

var transporter = nodemailer.createTransport({
  service: settings.credentials.emailservice.value, //"gmail" is preconfigured by nodemailer, but you can setup any other email client supported by nodemailer
  auth: {
    user: settings.credentials.email.value,
    pass: settings.credentials.emailpass.value,
  }
});

global.sendEmail = function(SUBJECT, BODY, ATTACHMENTS) {
  var mailOptions = {
    from: 'Moteino Gateway <gateway@moteino.com>',
    to: settings.credentials.emailAlertsTo.value, // list of receivers, comma separated
    subject: SUBJECT,
    text: BODY,
    attachments: ATTACHMENTS
    //html: '<b>Hello world ?</b>' // html body
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if(error) console.error('SENDEMAIL ERROR: ' + error);
    else console.log('SENDEMAIL SUCCESS: ' + info.response);
  });
}

global.sendSMS = function(SUBJECT, BODY) {
  
  smsToList = settings.credentials.smsAlertsTo.value.split(',');
  
  for (var smsTo in smsToList) {

      var mailOptions = {
        from: 'Gateway <gateway@moteino.com>',
        to: smsToList[smsTo], //your mobile carrier should have an email address that will generate a SMS to your phone
        subject: SUBJECT,
        text: BODY
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if(error) console.error('SENDSMS error: ' + error);
        else console.log('SENDSMS SUCCESS: ' + info.response);
      });
  }
  
}

global.sendMessageToNode = function(node) {
  if (metricsDef.isValidNodeId(node.nodeId) && node.action)
  {
    if (metricsDef.isNumeric(node.nodeId)) //numeric ID - send to serial port (RF network)
    {
      port.write(node.nodeId + ':' + node.action + '\n', function () { port.drain(); });
      console.log('NODEACTION: ' + JSON.stringify(node));
    }
    else if (metricsDef.isValidIP()) //IP address, send via HTTP
    {
      console.warning('NODEACTION FAIL: http sending not implemented yet. Request: ' + JSON.stringify(node));
    }
  }
  else if (node.action)
  {
    port.write(node.action + '\n', function () { port.drain(); });
    console.log('NODEACTION: ' + JSON.stringify(node));
  }
}

global.sendMessageToGateway = function(msg) {
  port.write(msg + '\n', function () { port.drain(); });
}

global.handleNodeEvents = function(node) {
  if (node.events)
  {
    for (var key in node.events)
    {
    try {
      if (node.events[key] && node.events[key].enabled)
      {
        var evt = metricsDef.events[key];
        if (evt.serverExecute!=undefined)
          try {
            evt.serverExecute(node);
          }
          catch(ex) {console.warn('Event ' + key + ' execution failed: ' + ex.message);}
      }
    } catch(ex) {console.warn('-------> EXCEPTION: nodeId:' + node._id + ' key:' + key + ' JSON: ' + JSON.stringify(node)); throw ex;}
    }
  }
}

global.getGraphData = function(nodeId, metricKey, start, end, exportMode) {
  var sts = Math.floor(start / 1000); //get timestamp in whole seconds
  var ets = Math.floor(end / 1000); //get timestamp in whole seconds
  var logfile = path.join(__dirname, dbDir, dbLog.getLogName(nodeId,metricKey));
  var graphData = dbLog.getData(logfile, sts, ets, exportMode ? 100000 : settings.general.graphMaxPoints.value); //100k points when exporting, more points is really pointless
  var graphOptions={};
  for(var k in metricsDef.metrics)
  {
    if (metricsDef.metrics[k].name == metricKey)
    {
      if (metricsDef.metrics[k].graphOptions != undefined)
        graphOptions = metricsDef.metrics[k].graphOptions;
      break;
    }
  }
  graphOptions.metricName=metricKey;
  return { graphData:graphData, options : graphOptions };
}

global.getNodeIcons = function(dir, files_, steps){
  files_ = files_ || [];
  dir = dir || __dirname + '/www/images';
  steps = steps || 0;
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory() && steps==0) //recurse 1 level only
      getNodeIcons(name, files_, steps+1);
    else if (files[i].match(/^icon_.+\.(bmp|png|jpg|jpeg|ico)$/ig)) //images only
      files_.push(name.replace(__dirname+'/www/images/',''));
  }
  return files_;
}

//authorize handshake - make sure the request is proxied from localhost, not from the outside world
//if you comment out this section, you will be able to hit this socket directly at the port it's running at, from anywhere!
//this was tested on Socket.IO v1.2.1 and will not work on older versions
io.use(function(socket, next) {
  var handshakeData = socket.request.connection;
  console.info('AUTHORIZING CONNECTION FROM ' + handshakeData.remoteAddress + ':' + handshakeData.remotePort);
  if (handshakeData.remoteAddress == "localhost" || handshakeData.remoteAddress == "127.0.0.1" || handshakeData.remoteAddress == "::1" || handshakeData.remoteAddress == "::ffff:127.0.0.1")
  {
    next();
    return;
  }
  else
  {
    var msg = 'REJECTED IDENTITY [' + handshakeData.remoteAddress + '], not coming from localhost';
    console.error(msg);
    next(new Error(msg));
  }
});

io.sockets.on('connection', function (socket) {
  var address = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  //var port = socket.request.connection.remotePort;
  console.info("NEW CONNECTION FROM " + address /*+ ":" + port*/);
  socket.emit('MOTESDEF', metricsDef.motes);
  socket.emit('METRICSDEF', metricsDef.metrics);
  socket.emit('EVENTSDEF', metricsDef.events);
  socket.emit('SETTINGSDEF', settings);
  socket.emit('SERVERTIME', Date.now());
  socket.emit('SERVERINFO', { uptime:(Date.now() - process.uptime()*1000), version: packageJson.version });
  socket.emit('DBCOMPACTED', dbCompacted);
  socket.emit('NODEICONS', getNodeIcons());

  //pull all nodes from the database and send them to client
  db.find({ _id : { $exists: true } }, function (err, entries) {
    socket.emit('UPDATENODES', sortNodes(entries));
  });
  
  socket.on('COMPACTDB', function () {
    console.log('**** DB COMPACTION REQUESTED');
    db.persistence.compactDatafile();
  });
  db.on('compaction.done', function(){
    dbCompacted = Date.now();
    socket.emit('DBCOMPACTED', dbCompacted);
    console.log('**** DB COMPACTION DONE');
  });
  
  socket.on('REFRESHICONS', function () {
    io.sockets.emit('NODEICONS', getNodeIcons());
  });
  
  socket.on('UPDATENODELISTORDER', function (newOrder) {
    db.findOne({_id:'NODELISTORDER'}, function (err, doc) {
      var entry = {_id:'NODELISTORDER', order:newOrder};
      if (doc == null)
        db.insert(entry);
      else
        db.update({ _id: 'NODELISTORDER' }, { $set : entry});
      io.sockets.emit('NODELISTREORDER', newOrder);
    });
  });

  socket.on('UPDATENODESETTINGS', function (node) {
    db.find({ _id : node._id }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        dbNode.type = node.type||undefined;
        dbNode.label = node.label||undefined;
        dbNode.descr = node.descr||undefined;
        dbNode.icon = node.icon||undefined;
        dbNode.settings = node.settings||undefined;
        dbNode.hidden = (node.hidden == 1 ? 1 : undefined);
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATENODESETTINGS records replaced:' + numReplaced);*/ });
        socket.broadcast.emit('UPDATENODE', dbNode); //sent changes to all clients except sender socket
      }
    });
  });

  socket.on('UPDATEMETRICSETTINGS', function (nodeId, metricKey, metric) {
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        dbNode.metrics[metricKey].label = metric.label;
        dbNode.metrics[metricKey].pin = metric.pin;
        dbNode.metrics[metricKey].graph = metric.graph;
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATEMETRICSETTINGS records replaced:' + numReplaced);*/ });
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
      }
    });
  });

  socket.on('EDITNODEEVENT', function (nodeId, eventKey, enabled, remove) {
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];

        //cross check key to ensure it exists, then add it to the node events collection and persist to DB
        for(var key in metricsDef.events)
          if (eventKey == key)
          {
            if (!dbNode.events) dbNode.events = {};
            if (!remove)
              dbNode.events[eventKey] = { enabled: (enabled ? 1 : 0) };
            else
              dbNode.events[eventKey] = undefined;

            scheduled = false;
            if (!remove && metricsDef.events[eventKey] && metricsDef.events[eventKey].scheduledExecute)
            {
              if (enabled && !remove)
              {
                schedule(dbNode, eventKey);
                scheduled = true;
              }
              else //either disabled or removed
              {
                for(var s in scheduledEvents)
                {
                  if (scheduledEvents[s].nodeId == nodeId && scheduledEvents[s].eventKey == eventKey)
                  {
                    console.log('**** REMOVING SCHEDULED EVENT - nodeId:' + nodeId + ' event:' + eventKey);
                    clearTimeout(scheduledEvents[s].timer);
                    scheduledEvents.splice(scheduledEvents.indexOf(scheduledEvents[s]), 1)
                    dbNode.events[eventKey].executeDateTime=undefined;
                  }
                }
              }
            }

            if (!scheduled)
            {
              db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATEMETRICSETTINGS records replaced:' + numReplaced);*/ });
              io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
            }
            return;
          }
      }
    });
  });
  
  socket.on('ADDNODEGRAPH', function (nodeId, selectedMetrics) {
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        var newGraph = [];
        if (!dbNode.multiGraphs) dbNode.multiGraphs = []; //an array of metric-key arrays eg. [['Temp','RSSI'], ['Temp', 'Humidity', 'Voltage'], ...]
        for(var arrayKey in selectedMetrics)
        {
          var metricKey = selectedMetrics[arrayKey];
          if (Object.keys(dbNode.metrics).includes(metricKey)) //verify node metrics contains selected metric
          {
            newGraph.push(metricKey);
            //console.log(' ************** ADDNODEGRAPH REQUEST: ' + nodeId + ' - ' + dbNode.metrics[selectedMetrics[key]].label);
          }
        }
        dbNode.multiGraphs.push(newGraph);
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATEMETRICSETTINGS records replaced:' + numReplaced);*/ });
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
      }
    });
  });
  
  socket.on('DELETENODEGRAPH', function (nodeId) {
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        dbNode.multiGraphs = undefined;
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATEMETRICSETTINGS records replaced:' + numReplaced);*/ });
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
      }
    });
  });  

  socket.on('DELETENODE', function (nodeId) {
    //delete all node-metric log files
    if (settings.general.keepMetricLogsOnDelete.value != 'true')
      db.find({ _id : nodeId }, function (err, entries) {
        if (entries.length == 1)
        {
          var dbNode = entries[0];
          Object.keys(dbNode.metrics).forEach(function(mKey,index) { //syncronous/blocking call
            if (dbNode.metrics[mKey].graph == 1)
              dbLog.removeMetricLog(path.join(__dirname, dbDir, dbLog.getLogName(dbNode._id, mKey)));
          });
        }
      });

    //delete the node from the DB
    db.remove({ _id : nodeId }, function (err, removedCount) {
      console.log('DELETED entries: ' + removedCount);

      //pull all nodes from the database and send them to client
      db.find({ _id : { $exists: true } }, function (err, entries) {
        io.sockets.emit('UPDATENODES', sortNodes(entries));
      });
    });

    //remove scheduled events associated with the deleted node
    for(var s in scheduledEvents)
      if (scheduledEvents[s].nodeId == nodeId)
      {
        console.log('**** REMOVING SCHEDULED EVENT FOR DELETED NODE - NodeId:' + nodeId + ' event:' + scheduledEvents[s].eventKey);
        clearTimeout(scheduledEvents[s].timer);
        scheduledEvents.splice(scheduledEvents.indexOf(scheduledEvents[s]), 1);
      }
  });

  socket.on('DELETENODEMETRIC', function (nodeId, metricKey) {
    db.find({ _id : nodeId }, function (err, entries) {
      console.log('DELETENODEMETRIC '+nodeId+': DB found : ' + entries.length + ' err: ' + err);
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        delete(dbNode.metrics[metricKey]);
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { console.log('DELETENODEMETRIC DB-Replaced:' + numReplaced); });
        if (settings.general.keepMetricLogsOnDelete.value != 'true')
          dbLog.removeMetricLog(path.join(__dirname, dbDir, dbLog.getLogName(dbNode._id, metricKey)));
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
      }
    });
  });
  
  socket.on('DELETEMETRICDATA', function (nodeId, metricKey, start, end) {
    var sts = Math.floor(start / 1000); //get timestamp in whole seconds
    var ets = Math.floor(end / 1000); //get timestamp in whole seconds
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        var logfile = path.join(__dirname, dbDir, dbLog.getLogName(dbNode._id, metricKey));
        var count = dbLog.deleteData(logfile, sts, ets);
        console.log('DELETEMETRICDATA DB-Removed points:' + count);
        //if (settings.general.keepMetricLogsOnDelete.value != 'true')
        socket.emit('DELETEMETRICDATA_OK', count); //post it back to requesting client only
      }
    });
  });

  socket.on('EDITMETRICDATA', function (nodeId, metricKey, start, end, newValue) {
    var sts = Math.floor(start / 1000); //get timestamp in whole seconds
    var ets = Math.floor(end / 1000); //get timestamp in whole seconds
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        var logfile = path.join(__dirname, dbDir, dbLog.getLogName(dbNode._id, metricKey));
        var count = dbLog.editData(logfile, sts, ets, newValue);
        console.log('EDITMETRICDATA DB-Updated points:' + count +' to: ' + newValue);
        socket.emit('EDITMETRICDATA_OK', count); //post it back to requesting client only
      }
    });
  });

  socket.on('CONTROLCLICK', function (control) {
    if (control.action) sendMessageToNode({nodeId:control.nodeId, action:control.action});
    //console.log('CONTROLCLICK:' + JSON.stringify(control));
    if (control.nodeType && control.controlKey && control.stateKey)
      if (metricsDef.motes[control.nodeType].controls[control.controlKey].states[control.stateKey].serverExecute != null)
      {
        db.findOne({ _id : control.nodeId }, function (err, node) {
          if (node)
          {
            //console.log('CONTROLCLICK running node:' + JSON.stringify(node));
            metricsDef.motes[control.nodeType].controls[control.controlKey].states[control.stateKey].serverExecute(node);
          }
        });
      }
  });

  socket.on('NODEMESSAGE', function (msg) {
    sendMessageToNode(msg);
  });

  socket.on('GATEWAYMESSAGE', function (msg) {
    sendMessageToGateway(msg);
  });

  socket.on('INJECTNODE', function(node) {
    if (metricsDef.isValidNodeId(node.nodeId))
    {
      node.nodeId = parseInt(node.nodeId);
      //only add node if given ID does not already exist in the DB
      db.findOne({_id:node.nodeId}, function (err, doc) {
        if (doc == null)
        {
          var entry = { _id:node.nodeId, updated:Date.now(), label:node.label || 'NEW NODE', metrics:{} };
          db.insert(entry);
          console.log('   ['+node.nodeId+'] DB-Insert new _id:' + node.nodeId);
          socket.emit('LOG', 'NODE INJECTED, ID: ' + node.nodeId);
          io.sockets.emit('UPDATENODE', entry);
        }
        else
          socket.emit('LOG', 'CANNOT INJECT NODE, ID ALREADY EXISTS: ' + node.nodeId);
      });
    }
    else socket.emit('LOG', 'CANNOT INJECT NODE, INVALID NEW ID: ' + node.nodeId);
  });

  socket.on('GETGRAPHDATA', function (nodeId, metricKey, start, end, exportMode) {
    var graphData = getGraphData(nodeId, metricKey, start, end, exportMode);
    socket.emit(exportMode ? 'EXPORTGRAPHDATAREADY' : 'GRAPHDATAREADY', graphData);
  });
  
  socket.on('GETMULTIGRAPHDATA', function (nodeId, multiGraphId, start, end, exportMode) {
    var sts = Math.floor(start / 1000); //get timestamp in whole seconds
    var ets = Math.floor(end / 1000); //get timestamp in whole seconds
    var series = [];
    
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        if (dbNode.multiGraphs && dbNode.multiGraphs[multiGraphId])
        {
          var multiGraphKeysArray = dbNode.multiGraphs[multiGraphId];
          Object.keys(dbNode.metrics).forEach(function(mKey,index) { //syncronous/blocking call
            if (multiGraphKeysArray.includes(mKey) && dbNode.metrics[mKey].graph == 1) {
              var graphData = getGraphData(nodeId, mKey, start, end, exportMode);
              series.push(graphData);
            }
          });
          socket.emit(exportMode ? 'EXPORTMULTIGRAPHDATAREADY' : 'MULTIGRAPHDATAREADY', series);
        }
      }
    });
  });

  socket.on('EXPORTNODELOGSCSV', function (nodeId, start, end, howManyPoints) {
    var sts = Math.floor(start / 1000); //get timestamp in whole seconds
    var ets = Math.floor(end / 1000); //get timestamp in whole seconds
    var sets = [];
    
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        Object.keys(dbNode.metrics).forEach(function(mKey,index) { //syncronous/blocking call
          if (dbNode.metrics[mKey].graph == 1) {
            var logfile = path.join(__dirname, dbDir, dbLog.getLogName(dbNode._id, mKey));
            var theData = dbLog.getData(logfile, sts, ets, howManyPoints /*settings.general.graphMaxPoints.value*/);
            theData.label = dbNode.metrics[mKey].label || mKey;
            sets.push(theData); //100k points when exporting, more points is really pointless
          }
        });
        socket.emit('EXPORTNODELOGSCSVREADY', { sets:sets });
      }
    });
  });
  
  socket.on('UPDATESETTINGSDEF', function (newSettings) {
    var settings = nconf.get('settings');

    for(var sectionName in settings)
    {
      var sectionSettings = settings[sectionName];
      if (sectionSettings.exposed===false || sectionSettings.editable===false) continue;
      for(var settingName in sectionSettings)
      {
        var setting = sectionSettings[settingName];
        if (setting.exposed===false || setting.editable===false) continue
        if (setting.value == undefined || newSettings[sectionName][settingName].value == undefined) continue;
        setting.value = newSettings[sectionName][settingName].value;
      }
    }

    global.settings = settings;

    nconf.save(function (err) {
      if (err !=null)
        socket.emit('LOG', 'UPDATESETTINGSDEF ERROR: '+err);
      else
      {
        global.metricsDef = require(path.resolve(__dirname, metricsFile))
        io.sockets.emit('SETTINGSDEF', settings);
      }
    });
  });

  socket.on('PROCESSEXIT', function () {
    console.log('PROCESS EXIT REQUESTED from ' + address);
    process.exit();
  });
});

//entries should contain the node list and also a node that contains the order (if this was ever added)
function sortNodes(entries) {
  var orderCSV;
  for (var i = entries.length-1; i>=0; i--)
    if (!metricsDef.isValidNodeId(entries[i]._id)) //remove non-numeric id nodes
    {
      if ((entries[i]._id).toString().toUpperCase() == 'NODELISTORDER') //if node order entry was found, remember it
        orderCSV = entries[i].order.split(',');
      entries.splice(i,1);
    }

  //sort the list if nodes order entry was found, otherwise do a default ordering by label or by id when no label is set
  entries.sort(orderCSV !== undefined ?
    function (a, b) { return orderCSV.indexOf(a._id.toString()) - orderCSV.indexOf(b._id.toString()); }
    : //else:
    function(a,b){ if (a.label && b.label) return a.label < b.label ? -1 : 1; if (a.label) return -1; if (b.label) return 1; return a._id.toString() > b._id.toString(); }
  );
  return entries;
}

global.msgHistory = new Array();
global.processSerialData = function (data) {
  var regexMaster = /\[(\d+)\]([^\n]+)/gi; //modifiers: g:global i:caseinsensitive
  var match = regexMaster.exec(data);
  console.log('>: ' + data)

  if (match != null)
  {
    var msgTokens = match[2];
    var id = parseInt(match[1]); //get ID of node

    db.find({ _id : id }, function (err, entries) {
      var existingNode = {};
      var hasMatchedMetrics = false;
      if (entries.length == 1) existingNode = entries[0]; //update

      //check for duplicate messages - this can happen when the remote node sends an ACK-ed message but does not get the ACK so it resends same message repeatedly until it receives an ACK
      if (existingNode.updated != undefined && (Date.now() - existingNode.updated < 500) && msgHistory[id] == msgTokens)
      {
        console.log("   DUPLICATE, skipping...");
        return;
      }

      msgHistory[id] = msgTokens;
      existingNode._id = id;
      existingNode.updated = Date.now(); //update timestamp we last heard from this node, regardless of any matches
      if (existingNode.metrics == undefined) existingNode.metrics = {};

      var regexpTokens = /[\w\:\.\$\!\\\'\"\?\[\]\-\(\)@%^&#+\/<>*~=,|]+/ig; //match (almost) any non space human readable character
      while (match = regexpTokens.exec(msgTokens)) //extract each token/value pair from the message and process it
      {
        var matchingMetric;
        for(var metric in metricsDef.metrics) //try to match a metric definition
        {
          if (metricsDef.metrics[metric].regexp.test(match[0]))
          {
            //found matching metric, add/update the node with it
            var tokenMatch = metricsDef.metrics[metric].regexp.exec(match[0]);
            matchingMetric = metricsDef.metrics[metric];
            if (metric == 'TYPE') {
              nodetype = metricsDef.determineValue(matchingMetric, tokenMatch);
              //console.log(" %%%%%% TYPE METRIC - metricsDef.motes["+nodetype+"]=" + JSON.stringify(metricsDef.motes[nodetype]));
              if (metricsDef.motes[nodetype]) {
                existingNode.type = nodetype;
                existingNode.icon = metricsDef.motes[nodetype].icon || existingNode.icon;
              }
              continue;
            }
            if (existingNode.metrics[matchingMetric.name] == null) existingNode.metrics[matchingMetric.name] = {};
            existingNode.metrics[matchingMetric.name].label = existingNode.metrics[matchingMetric.name].label || matchingMetric.name;
            existingNode.metrics[matchingMetric.name].descr = existingNode.metrics[matchingMetric.name].descr || matchingMetric.descr || undefined;
            existingNode.metrics[matchingMetric.name].value = matchingMetric.value || metricsDef.determineValue(matchingMetric, tokenMatch);
            existingNode.metrics[matchingMetric.name].unit = matchingMetric.unit || undefined;
            existingNode.metrics[matchingMetric.name].updated = existingNode.updated;
            existingNode.metrics[matchingMetric.name].pin = existingNode.metrics[matchingMetric.name].pin != undefined ? existingNode.metrics[matchingMetric.name].pin : matchingMetric.pin;
            existingNode.metrics[matchingMetric.name].graph = existingNode.metrics[matchingMetric.name].graph != undefined ? existingNode.metrics[matchingMetric.name].graph : matchingMetric.graph;

            //log data for graphing purposes, keep labels as short as possible since this log will grow indefinitely and is not compacted like the node database
            if (existingNode.metrics[matchingMetric.name].graph==1)
            {
              var graphValue = metricsDef.isNumeric(matchingMetric.logValue) ? matchingMetric.logValue : metricsDef.determineGraphValue(matchingMetric, tokenMatch); //existingNode.metrics[matchingMetric.name].value;
              if (metricsDef.isNumeric(graphValue))
              {
                var ts = Math.floor(Date.now() / 1000); //get timestamp in whole seconds
                var logfile = path.join(__dirname, dbDir, dbLog.getLogName(id, matchingMetric.name));
                try {
                  console.log('post: ' + logfile + '[' + ts + ','+graphValue + ']');
                  dbLog.postData(logfile, ts, graphValue, matchingMetric.duplicateInterval || null);
                } catch (err) { console.error('   POST ERROR: ' + err.message); /*console.log('   POST ERROR STACK TRACE: ' + err.stack); */ } //because this is a callback concurrent calls to the same log, milliseconds apart, can cause a file handle concurrency exception
              }
              else console.log('   METRIC NOT NUMERIC, logging skipped... (extracted value:' + graphValue + ')');
            }

            if (matchingMetric.name != 'RSSI') hasMatchedMetrics = true; //excluding RSSI because noise can produce a packet with a valid RSSI reading
            break; //--> this stops matching as soon as 1 metric definition regex is matched on the data. You could keep trying to match more definitions and that would create multiple metrics from the same data token, but generally this is not desired behavior.
          }
        }
      }

      //prepare entry to save to DB, undefined values will not be saved, hence saving space
      var entry = {
        _id:id,
        updated:existingNode.updated,
        type:existingNode.type||undefined,
        label:existingNode.label||undefined,
        descr:existingNode.descr||undefined,
        hidden:existingNode.hidden||undefined,
        rssi:existingNode.rssi,
        metrics:Object.keys(existingNode.metrics).length > 0 ? existingNode.metrics : {},
        events:existingNode.events,
        settings:existingNode.settings,
        multiGraphs:existingNode.multiGraphs,
        icon:existingNode.icon||undefined
      };

      //save to DB
      db.findOne({_id:id}, function (err, doc) {
        if (doc == null)
        {
          if (settings.general.genNodeIfNoMatch.value == true || settings.general.genNodeIfNoMatch.value == 'true' || hasMatchedMetrics)
          {
            db.insert(entry);
            console.log('   ['+id+'] DB-Insert new _id:' + id);
          }
          else return;
        }
        else
          db.update({ _id: id }, { $set : entry}, {}, function (err, numReplaced) { console.log('   ['+id+'] DB-Updates:' + numReplaced);});

        //publish updated node to clients
        io.sockets.emit('UPDATENODE', entry);
        //handle any server side events (email, sms, custom actions)
        handleNodeEvents(entry);
      });
    });
  }
  else
  {
    //console.log('no match: ' + data);
    dbunmatched.insert({_id:Date.now(), data:data});
  }
}

function httpEndPointHandler(req, res) {
  var queryString = url.parse(req.url, true).query; //parse query string
  var ip = req.headers['x-forwarded-for'] /*|| req.connection.remoteAddress*/; //appended by nginx proxy
  var id = queryString.id || ip;

  if (metricsDef.isValidNodeId(id))
  {
    if (metricsDef.isNumeric(id)) id = parseInt(id);
    db.find({ _id : id }, function (err, entries) {
      var existingNode = {};
      var matchedMetrics = 0;
      if (entries.length == 1) existingNode = entries[0]; //update
      existingNode._id = id;
      if (metricsDef.isNumeric(id)) existingNode._ip = ip; //add/override IP address for HTTP requests, if node ID was specified as a number (so we know what IP to send requests back to)
      existingNode.updated = Date.now(); //update timestamp we last heard from this node, regardless of any matches
      if (existingNode.metrics == undefined) existingNode.metrics = {};

      for (var queryStringKey in queryString)
      {
        var matchingMetric;
        var token;
        for(var metric in metricsDef.metrics) //try to match a metric definition
        {
          token = queryStringKey.trim()+':'+queryString[queryStringKey].trim();
          if (metricsDef.metrics[metric].regexp.test(token))
          {
            var tokenMatch = metricsDef.metrics[metric].regexp.exec(queryStringKey+':'+queryString[queryStringKey]);
            matchingMetric = metricsDef.metrics[metric];
            if (existingNode.metrics[matchingMetric.name] == null) existingNode.metrics[matchingMetric.name] = {};
            existingNode.metrics[matchingMetric.name].label = existingNode.metrics[matchingMetric.name].label || matchingMetric.name;
            existingNode.metrics[matchingMetric.name].descr = existingNode.metrics[matchingMetric.name].descr || matchingMetric.descr || undefined;
            existingNode.metrics[matchingMetric.name].value = matchingMetric.value || metricsDef.determineValue(matchingMetric, tokenMatch);
            existingNode.metrics[matchingMetric.name].unit = matchingMetric.unit || undefined;
            existingNode.metrics[matchingMetric.name].updated = existingNode.updated;
            existingNode.metrics[matchingMetric.name].pin = existingNode.metrics[matchingMetric.name].pin != undefined ? existingNode.metrics[matchingMetric.name].pin : matchingMetric.pin;
            existingNode.metrics[matchingMetric.name].graph = existingNode.metrics[matchingMetric.name].graph != undefined ? existingNode.metrics[matchingMetric.name].graph : matchingMetric.graph;

            //log data for graphing purposes, keep labels as short as possible since this log will grow indefinitely and is not compacted like the node database
            if (existingNode.metrics[matchingMetric.name].graph==1)
            {
              var graphValue = metricsDef.isNumeric(matchingMetric.logValue) ? matchingMetric.logValue : metricsDef.determineGraphValue(matchingMetric, tokenMatch); //existingNode.metrics[matchingMetric.name].value;
              if (metricsDef.isNumeric(graphValue))
              {
                var ts = Math.floor(Date.now() / 1000); //get timestamp in whole seconds
                var logfile = path.join(__dirname, dbDir, dbLog.getLogName(id, matchingMetric.name));
                try {
                  console.log('post: ' + logfile + '[' + ts + ','+graphValue + ']');
                  dbLog.postData(logfile, ts, graphValue, matchingMetric.duplicateInterval || null);
                } catch (err) { console.error('   POST ERROR: ' + err.message); /*console.log('   POST ERROR STACK TRACE: ' + err.stack); */ } //because this is a callback concurrent calls to the same log, milliseconds apart, can cause a file handle concurrency exception
              }
              else console.log('   METRIC NOT NUMERIC, logging skipped... (extracted value:' + graphValue + ')');
            }

            if (matchingMetric.name != 'RSSI') matchedMetrics++; //excluding RSSI because noise can produce a packet with a valid RSSI reading
            break; //--> this stops matching as soon as 1 metric definition regex is matched on the data. You could keep trying to match more definitions and that would create multiple metrics from the same data token, but generally this is not desired behavior.
          }
        }
      }

      //prepare entry to save to DB, undefined values will not be saved, hence saving space
      var entry = {
        _id:id,
        _ip:existingNode._ip,
        updated:existingNode.updated,
        type:existingNode.type||undefined,
        label:existingNode.label||undefined,
        descr:existingNode.descr||undefined,
        hidden:existingNode.hidden||undefined,
        rssi:existingNode.rssi,
        metrics:Object.keys(existingNode.metrics).length > 0 ? existingNode.metrics : {},
        events: existingNode.events,
        settings: existingNode.settings,
        multiGraphs:existingNode.multiGraphs,
        icon: existingNode.icon||undefined
      };

      //console.log('HTTP REQUEST MATCH from: ' + id + ' : ' + JSON.stringify(entry));
      
      //save to DB
      db.findOne({_id:id}, function (err, doc) {
        if (doc == null)
        {
          if (settings.general.genNodeIfNoMatch.value == true || settings.general.genNodeIfNoMatch.value == 'true' || matchedMetrics)
          {
            db.insert(entry);
            console.log('   ['+id+'] DB-Insert new _id:' + id);
          }
          else return;
        }
        else
          db.update({ _id: id }, { $set : entry}, {}, function (err, numReplaced) { console.log('   ['+id+'] DB-Updates:' + numReplaced);});

        //publish updated node to clients
        io.sockets.emit('UPDATENODE', entry);
        //handle any server side events (email, sms, custom actions)
        handleNodeEvents(entry);
      });

      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify({status:'success', message: 'SUCCESS!', matchedMetrics:matchedMetrics}));
      res.end();
    });
  }
  else
  {
    res.writeHead(406, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({status:'error', message: 'FAIL, invalid id:'+id}));
    res.end();
  }
}


//keep track of scheduler based events - these need to be kept in sych with the UI - if UI removes an event, it needs to be cancelled from here as well; if UI adds a scheduled event it needs to be scheduled and added here also
scheduledEvents = []; //each entry should be defined like this: {nodeId, eventKey, timer}

//schedule and register a scheduled type event
function schedule(node, eventKey) {
  var nextRunTimeout = metricsDef.events[eventKey].nextSchedule(node);
  if (nextRunTimeout < 1000)
  {
    console.error('**** SCHEDULING EVENT ERROR - nodeId:' + node._id+' event:'+eventKey+' cannot schedule event in ' + nextRunTimeout + 'ms (less than 1s)');
    return;
  }
  var hrs = parseInt(nextRunTimeout/3600000);
  var min = parseInt((nextRunTimeout - hrs*3600000) / 60000);
  var sec = parseInt((nextRunTimeout - hrs*3600000 - min*60000) / 1000);
  var timeoutStr = (hrs > 0 ? hrs+'h': '') + (min>0?min+'m':'') + (sec>0&&hrs==0?sec+'s':'');
  console.log('**** SCHEDULING EVENT - nodeId:' + node._id+' event:'+eventKey+' to run in ~' + timeoutStr);

  //clear any previous instances of the event
  for(var s in scheduledEvents)
    if (scheduledEvents[s].nodeId == node._id && scheduledEvents[s].eventKey == eventKey)
    {
      clearTimeout(scheduledEvents[s].timer);
      scheduledEvents.splice(scheduledEvents.indexOf(scheduledEvents[s]), 1);
    }

  //schedule event in the future at calculated timer delay
  var theTimer = setTimeout(runAndReschedule, nextRunTimeout, metricsDef.events[eventKey].scheduledExecute, node, eventKey); //http://www.w3schools.com/jsref/met_win_settimeout.asp

  //remember the timer ID so we can clear it later
  scheduledEvents.push({nodeId:node._id, eventKey:eventKey, timer:theTimer}); //save nodeId, eventKey and timer (needs to be removed if the event is disabled/removed from the UI)
  node.events[eventKey].executeDateTime = new Date(Date.now() + nextRunTimeout); //actual datetime when this is scheduled to execute

  //save to DB
  db.findOne({_id:node._id}, function (err, dbNode) {
    dbNode.events = node.events;
    db.update({_id:dbNode._id}, { $set : dbNode }, {}, function (err, numReplaced) { console.log('   ['+dbNode._id+'] DB-Updates:' + numReplaced);});
    //publish updated node to clients
    io.sockets.emit('UPDATENODE', dbNode);
  });
}

//run a scheduled event and reschedule it
function runAndReschedule(functionToExecute, node, eventKey) {
  console.log('**** RUNNING SCHEDULED EVENT - nodeId:' + node._id + ' event:' + eventKey + '...');
  db.findOne({_id:node._id}, function (err, dbNode) {
    try
    {
      functionToExecute(dbNode, eventKey);
    }
    catch (ex)
    {
      var msg = 'Event ' + eventKey + ' execution failed: ' + ex.message;
      console.error(msg);
      io.sockets.emit('LOG', msg);
    }
    schedule(dbNode, eventKey);    
  });
}

//this runs once at startup: register scheduled events that are enabled
db.find({ events : { $exists: true } }, function (err, entries) {
  var count=0;

  for (var k in entries)
    for (var i in entries[k].events)
    {
      if (entries[k].events[i].enabled) //enabled events only
      {
        if (metricsDef.events[i] && metricsDef.events[i].nextSchedule && metricsDef.events[i].scheduledExecute)
        {
          schedule(entries[k], i);
          count++;
        }
      }
    }
});
