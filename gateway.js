// **********************************************************************************
// Websocket server backend for the Moteino IoT Framework
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
// Copyright Felix Rusu, Low Power Lab LLC (2015), http://lowpowerlab.com/contact
// ********************************************************************************************
// IMPORTANT details about NeDB:
// _id field is special - if not used it is automatically added and used as unique index
//                      - we can set that field when inserting to use it as an automatic unique index for fast lookups of nodes (by node Id)
// ********************************************************************************************
var nconf = require('nconf');                                   //https://github.com/indexzero/nconf
var JSON5 = require('json5');                                   //https://github.com/aseemk/json5
var path = require('path');
var dbDir = 'data/db';
var metricsFile = 'metrics.js';
nconf.argv().file({ file: path.resolve(__dirname, 'settings.json5'), format: JSON5 });
settings = nconf.get('settings');
var dbLog = require(path.resolve(__dirname,'logUtil.js'));
io = require('socket.io').listen(settings.general.socketPort.value);
var serialport = require("serialport");                         //https://github.com/voodootikigod/node-serialport
var Datastore = require('nedb');                                //https://github.com/louischatriot/nedb
var nodemailer = require('nodemailer');                         //https://github.com/andris9/Nodemailer
var request = require('request');
var db = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.name.value), autoload: true });       //used to keep all node/metric data
var dbunmatched = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.nonMatchesName.value), autoload: true });
serial = new serialport.SerialPort(settings.serial.port.value, { baudrate : settings.serial.baud.value, parser: serialport.parsers.readline("\n") }, false);

serial.on('error', function serialError(error) {
    //Send serial error messages to console.
    //Better error handling needs to be here in the future.
    console.log(error.message);
});

serial.on("data", function(data) { processSerialData(data); });

serial.open();

metricsDef = require(path.resolve(__dirname, metricsFile));

require("console-stamp")(console, settings.general.consoleLogDateFormat.value); //timestamp logs - https://github.com/starak/node-console-stamp
db.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value); //compact the database every 24hrs

var transporter = nodemailer.createTransport({
    service: settings.credentials.emailservice.value, //"gmail" is preconfigured by nodemailer, but you can setup any other email client supported by nodemailer
    auth: {
        user: settings.credentials.email.value,
        pass: settings.credentials.emailpass.value,
    }
});

//global.LOG = function(data) { process.stdout.write(data || ''); }
//global.LOGln = function(data) { process.stdout.write((data || '') + '\n'); }
global.sendEmail = function(SUBJECT, BODY) {
  var mailOptions = {
      from: 'Moteino Gateway <gateway@moteino.com>',
      to: settings.credentials.emailAlertsTo.value, // list of receivers, comma separated
      subject: SUBJECT,
      text: BODY
      //html: '<b>Hello world ?</b>' // html body
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if(error) console.log('SENDEMAIL ERROR: ' + error);
    else console.log('SENDEMAIL SUCCESS: ' + info.response);
  });
}

global.sendSMS = function(SUBJECT, BODY) {
  var mailOptions = {
      from: 'Moteino Gateway <gateway@moteino.com>',
      to: settings.credentials.smsAlertsTo.value, //your mobile carrier should have an email address that will generate a SMS to your phone
      subject: SUBJECT,
      text: BODY
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if(error) console.log('SENDSMS error: ' + error);
    else console.log('SENDSMS SUCCESS: ' + info.response);
  });
}

global.sendMessageToNode = function(node) {
  if (metricsDef.isNumeric(node.nodeId) && node.action)
  {
    serial.write(node.nodeId + ':' + node.action + '\n', function () { serial.drain(); });
    console.log('NODEACTION: ' + JSON.stringify(node));
  }
  else if (node.action)
  {
    serial.write(node.action + '\n', function () { serial.drain(); });
    console.log('NODEACTION: ' + JSON.stringify(node));
  }
}

global.sendMessageToGateway = function(msg) {
  serial.write(msg + '\n', function () { serial.drain(); });
}

global.handleNodeEvents = function(node) {
  if (node.events)
  {
    for (var key in node.events)
    {
      var enabled = node.events[key];
      if (enabled)
      {
        var evt = metricsDef.events[key];
        if (evt.serverExecute!=undefined)
          try {
            evt.serverExecute(node);
          }
          catch(ex) {console.log('Event ' + key + ' execution failed: ' + ex.message);}
      }
    }
  }
  // if (metricsDef.motes[node.type] && metricsDef.motes[node.type].events)
    // for (var eKey in metricsDef.motes[node.type].events)
    // {
      // var nodeEvent = metricsDef.motes[node.type].events[eKey];
      // if (nodeEvent.serverExecute != undefined)
        // nodeEvent.serverExecute(node);
    // }
}

//authorize handshake - make sure the request is coming from nginx, not from the outside world
//if you comment out this section, you will be able to hit this socket directly at the port it's running at, from anywhere!
//this was tested on Socket.IO v1.2.1 and will not work on older versions
io.use(function(socket, next) {
  var handshakeData = socket.request;
  //console.log('\nAUTHORIZING CONNECTION FROM ' + handshakeData.connection.remoteAddress + ':' + handshakeData.connection.remotePort);
  if (handshakeData.connection.remoteAddress == "localhost" || handshakeData.connection.remoteAddress == "127.0.0.1")
    next();
  next(new Error('REJECTED IDENTITY, not coming from localhost'));
});

io.sockets.on('connection', function (socket) {
  var address = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  //var port = socket.request.connection.remotePort;
  console.log("NEW CONNECTION FROM " + address /*+ ":" + port*/);
  socket.emit('MOTESDEF', metricsDef.motes);
  socket.emit('METRICSDEF', metricsDef.metrics);
  socket.emit('EVENTSDEF', metricsDef.events);
  socket.emit('SETTINGSDEF', settings);

  db.find({ _id : { $exists: true } }, function (err, entries) {
    //console.log("New connection found docs: " + entries.length);
    socket.emit('UPDATENODES', entries);
  });

  socket.on('UPDATENODESETTINGS', function (node) {
    db.find({ _id : node._id }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        dbNode.type = node.type||undefined;
        dbNode.label = node.label||undefined;
        dbNode.descr = node.descr||undefined;
        dbNode.hidden = (node.hidden == 1 ? 1 : undefined);
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATENODESETTINGS records replaced:' + numReplaced);*/ });
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
        //console.log("UPDATE NODE SETTINGS found docs:" + entries.length);
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
    //console.log('**** EDITNODEEVENT  **** key:' + eventKey + ' enabled:' + enabled + ' remove:' + remove);
    db.find({ _id : nodeId }, function (err, entries) {
      if (entries.length == 1)
      {
        var dbNode = entries[0];

        //cross check key to ensure it exists, then add it to the node events collection and persist to DB
        for(var key in metricsDef.events)
          if (eventKey == key)
          {
            if (!dbNode.events) dbNode.events = {};
            dbNode.events[eventKey] = (remove ? undefined : (enabled ? 1 : 0));
            db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { /*console.log('UPDATEMETRICSETTINGS records replaced:' + numReplaced);*/ });

            if (metricsDef.events[eventKey] && metricsDef.events[eventKey].scheduledExecute)
              if (enabled && !remove)
                schedule(dbNode, eventKey);
              else //either disabled or removed
                for(var s in scheduledEvents)
                  if (scheduledEvents[s].nodeId == nodeId && scheduledEvents[s].eventKey == eventKey)
                  {
                    console.log('**** REMOVING SCHEDULED EVENT - nodeId:' + nodeId + ' event:' + eventKey);
                    clearTimeout(scheduledEvents[s].timer);
                    scheduledEvents.splice(scheduledEvents.indexOf(scheduledEvents[s]), 1)
                  }

            io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
            return;
          }
      }
    });
  });

  socket.on('DELETENODE', function (nodeId) {
    db.remove({ _id : nodeId }, function (err, removedCount) {
      console.log('DELETED entries: ' + removedCount);
      db.find({ _id : { $exists: true } }, function (err, entries) {
        io.sockets.emit('UPDATENODES', entries);
      });
    });

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
      if (entries.length == 1)
      {
        var dbNode = entries[0];
        dbNode.metrics[metricKey] = undefined;
        db.update({ _id: dbNode._id }, { $set : dbNode}, {}, function (err, numReplaced) { console.log('DELETENODEMETRIC DB-Replaced:' + numReplaced); });
        io.sockets.emit('UPDATENODE', dbNode); //post it back to all clients to confirm UI changes
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
    if (metricsDef.isNumeric(node.nodeId))
    {
      node.nodeId = parseInt(node.nodeId);
      //only add node if given ID does not already exist in the DB
      db.findOne({_id:node.nodeId}, function (err, doc) {
        if (doc == null)
        {
          var entry = { _id:node.nodeId, updated:(new Date).getTime(), label:node.label || 'NEW NODE', metrics:{} };
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

  socket.on('GETGRAPHDATA', function (nodeId, metricKey, start, end) {
    var sts = Math.floor(start / 1000); //get timestamp in whole seconds
    var ets = Math.floor(end / 1000); //get timestamp in whole seconds
    var logfile = path.join(__dirname, dbDir, dbLog.getLogName(nodeId,metricKey));
    var graphData = dbLog.getData(logfile, sts, ets);
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
    socket.emit('GRAPHDATAREADY', { graphData:graphData, options : graphOptions });
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

global.msgHistory = new Array();
global.processSerialData = function (data) {
  var regexMaster = /\[(\d+)\]([^\[\]\n]+)(?:\[(?:RSSI|SS)\:-?(\d+)\])?.*/gi; //modifiers: g:global i:caseinsensitive
  var match = regexMaster.exec(data);
  console.log('>: ' + data)

  if (match != null)
  {
    var msgTokens = match[2];
    var id = parseInt(match[1]); //get ID of node
    var rssi = match[3] != undefined ? parseInt(match[3]) : undefined; //get rssi (signal strength)

    db.find({ _id : id }, function (err, entries) {
      var existingNode = new Object();
      var hasMatchedMetrics = false;
      if (entries.length == 1)
      { //update
        existingNode = entries[0];
      }

      //check for duplicate messages - this can happen when the remote node sends an ACK-ed message but does not get the ACK so it resends same message repeatedly until it receives an ACK
      if (existingNode.updated != undefined && ((new Date) - new Date(existingNode.updated).getTime()) < 500 && msgHistory[id] == msgTokens)
      { console.log("   DUPLICATE, skipping..."); return; }

      msgHistory[id] = msgTokens;

      //console.log('FOUND ENTRY TO UPDATE: ' + JSON.stringify(existingNode));
      existingNode._id = id;
      existingNode.rssi = rssi; //update signal strength we last heard from this node, regardless of any matches
      existingNode.updated = new Date().getTime(); //update timestamp we last heard from this node, regardless of any matches
      if (existingNode.metrics == undefined)
        existingNode.metrics = new Object();
      if (existingNode.events == undefined)
        existingNode.events = new Object();

      var regexpTokens = /[\w\:\.\$\!\\\'\"\?\[\]\-\(\)@%^&#+\/<>*~=,|]+/ig; //match (almost) any non space human readable character
      while (match = regexpTokens.exec(msgTokens)) //extract each token/value pair from the message and process it
      {
        // //V/VBAT/VOLTS is special, applies to whole node so save it as a node level metric instead of in the node metric collection
        // if (metricsDef.metrics.V.regexp.test(match[0]))
        // {
          // var tokenMatch = metricsDef.metrics.V.regexp.exec(match[0]);
          // existingNode.V = tokenMatch[1] || tokenMatch[0]; //extract the voltage part
          // continue;
        // }

        var matchingMetric;
        //try to match a metric definition
        for(var metric in metricsDef.metrics)
        {
          if (metricsDef.metrics[metric].regexp.test(match[0]))
          {
            //found matching metric, add/update the node with it
            //console.log('TOKEN MATCHED: ' + metricsDef.metrics[metric].regexp);
            var tokenMatch = metricsDef.metrics[metric].regexp.exec(match[0]);
            matchingMetric = metricsDef.metrics[metric];
            if (existingNode.metrics[matchingMetric.name] == null) existingNode.metrics[matchingMetric.name] = new Object();
            existingNode.metrics[matchingMetric.name].label = existingNode.metrics[matchingMetric.name].label || matchingMetric.name;
            existingNode.metrics[matchingMetric.name].descr = existingNode.metrics[matchingMetric.name].descr || matchingMetric.descr || undefined;
            existingNode.metrics[matchingMetric.name].value = metricsDef.determineValue(matchingMetric, tokenMatch);
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
                  dbLog.postData(logfile, ts, graphValue);
                } catch (err) { console.log('   POST ERROR: ' + err.message); /*console.log('   POST ERROR STACK TRACE: ' + err.stack); */ } //because this is a callback concurrent calls to the same log, milliseconds apart, can cause a file handle concurrency exception
              }
              else console.log('   METRIC NOT NUMERIC, logging skipped... (extracted value:' + graphValue + ')');
            }

            //console.log('TOKEN MATCHED OBJ:' + JSON.stringify(existingNode));
            hasMatchedMetrics = true;
            break; //--> this stops matching as soon as 1 metric definition regex is matched on the data. You could keep trying to match more definitions and that would create multiple metrics from the same data token, but generally this is not desired behavior.
          }
        }
      }

      //prepare entry to save to DB, undefined values will not be saved, hence saving space
      var entry = {_id:id, updated:existingNode.updated, type:existingNode.type||undefined, label:existingNode.label||undefined, descr:existingNode.descr||undefined, hidden:existingNode.hidden||undefined, /*V:existingNode.V||undefined,*/ rssi:existingNode.rssi, metrics:Object.keys(existingNode.metrics).length > 0 ? existingNode.metrics : {}, events: Object.keys(existingNode.events).length > 0 ? existingNode.events : undefined };
      //console.log('UPDATING ENTRY: ' + JSON.stringify(entry));

      //save to DB
      db.findOne({_id:id}, function (err, doc) {
        if (doc == null)
        {
          if (settings.general.genNodeIfNoMatch.value == true || settings.general.genNodeIfNoMatch.value == 'true' || hasMatchedMetrics)
          {
            db.insert(entry);
            console.log('   ['+id+'] DB-Insert new _id:' + id);
          }
          else
          {
            return;
          }
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
    dbunmatched.insert({_id:(new Date().getTime()), data:data});
  }
}



//keep track of scheduler based events - these need to be kept in sych with the UI - if UI removes an event, it needs to be cancelled from here as well; if UI adds a scheduled event it needs to be scheduled and added here also
scheduledEvents = []; //each entry should be defined like this: {nodeId, eventKey, timer}

//schedule and register a scheduled type event
function schedule(node, eventKey) {
  var nextRunTimeout = metricsDef.events[eventKey].nextSchedule(node);
  console.log('**** SCHEDULING EVENT - nodeId:' + node._id+' event:'+eventKey+' to run in ~' + (nextRunTimeout/3600000).toFixed(2) + 'hrs');
  var theTimer = setTimeout(runAndReschedule, nextRunTimeout, metricsDef.events[eventKey].scheduledExecute, node, eventKey); //http://www.w3schools.com/jsref/met_win_settimeout.asp
  scheduledEvents.push({nodeId:node._id, eventKey:eventKey, timer:theTimer}); //save nodeId, eventKey and timer (needs to be removed if the event is disabled/removed from the UI)
}

//run a scheduled event and reschedule it
function runAndReschedule(functionToExecute, node, eventKey) {
  console.log('**** RUNNING SCHEDULED EVENT - nodeId:' + node._id + ' event:' + eventKey + '...');
  functionToExecute(node, eventKey);
  schedule(node, eventKey);
}

//this runs once at startup: register scheduled events that are enabled
db.find({ events : { $exists: true } }, function (err, entries) {
  var count=0;

  for (var k in entries)
    for (var i in entries[k].events)
    {
      if (entries[k].events[i]==1) //enabled events only
      {
        //console.log('Event for ' + JSON.stringify(entries[k].events) + ' : ' + metricsDef.events[i]);
        if (metricsDef.events[i] && metricsDef.events[i].nextSchedule && metricsDef.events[i].scheduledExecute)
        {
          schedule(entries[k], i);
          count++;
        }
      }
    }
  //console.log('*** Events Register db count: ' + count);
});
