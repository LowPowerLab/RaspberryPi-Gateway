// **********************************************************************************
// Websocket backend for the Moteino IoT Gateway
// http://lowpowerlab.com/gateway
// **********************************************************************************
// This is the metrics definitions file containing the definitions of token matches
// for each possible metric coming from any remote Moteino.
// It also contains the specific node definitions that describe behavior of individual motes.
// Examples are given for such motes like the Mailbox Notifier, WeatherMote, MotionMote,
// GarageMote, SwitchMote, Sump Pump distance sensor, Water Meter reader, etc.
// This is a work in progress and updates and fixes will be added as they come up
// and time permits. Contributions are encouraged.
// ********************************************************************************************
// Copyright Felix Rusu, Low Power Lab LLC (2018), http://lowpowerlab.com/contact
// ********************************************************************************************
// Great reference on Javascript Arrays: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
// Great reference on Javascript Objects: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects
// Great reference on Javascript Regular Expressions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
// Great sandbox to test your Regular Expressions: http://regexr.com/
// JqueryMobile generic icons: http://api.jquerymobile.com/icons/
// FLOT graphs API & customizations: https://github.com/flot/flot/blob/master/API.md
//                                   http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html
var request = require('request');
var config = require('nconf');
var JSON5 = require('json5');
var suncalc = require('suncalc'); //https://github.com/mourner/suncalc
config.argv().file({ file: require('path').resolve(__dirname, 'settings.json5'), format: JSON5 });
var settings = config.get('settings'); //these are local to avoid runtime errors but in events they will reference the global settings declared in gateway.js

// ******************************************************************************************************************************************
//                                            SAMPLE METRICS DEFINITIONS
// ******************************************************************************************************************************************
// The metrics definitions use [regular expressions] to match an incoming metric token
// The metrics tokens have a pattern that must be followed:
// - a packet received from a node can contain multiple metrics (ie temperature, humidity, motion etc.)
// - metrics are separated by space (not by comma, or other characters, ex:  "T:42 H:50")
// - each metric that has a name/value pair is defined as NAME:VALUE (metric name, colon, metric value)
// - each metric that simply defines a status can be standalone without a value (ex: "MOTION")
// ******************************************************************************************************************************************
// These metrics definitions consist of a regular expression that will be attempted to be matched to any incoming tokens from the gateway (ie. Moteino, MightyHat, etc.) serial port
// If one matches you should see a new node/metric show up in the UI or be updated if previously matched
// Other parameters:
//     - value - this can be hardcoded, or if left blank the value will be the first captured parentheses from the regex expression
//     - pin:1/0 - if '1' then by default this metric will show up in the main homepage view for that node, otherwise it will only show in the node page; it can then manually be flipped in the UI
//     - graph:1/0 - if '1' then by default this metric will be logged in gatewayLog.db every time it comes in
//                 - if '0' then this would not be logged but can be turned on from the metric details page
//                 - if not defined then metric is not logged and toggle button is hidden in metric detail page
//     - logValue - you can specify a hardcoded value that should be logged instead of the captured metric (has to always be numeric!)
//     - graphOptions - this is a javascript object that when presend is injected directly into the FLOT graph for the metric - you can use this to highly customize the appearance of any metric graph
//                    - it should only be specified one per each metric - the first one (ie one for each set of metrics that have multiple entries with same 'name') - ex: GarageMote 'Status' metric
//                    - this object is overlapped over the default 'graphOptions' defined in index.html
//                    - for more details how to customize FLOT graphs see this: http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html
// ******************************************************************************************************************************************
// Important Notes:
//     - the same node can have any number of metrics (only limited by the packet max length - ex. 61 chars in the RFM69 library)
//     - each related metric should have the same name - for instance look at GarageMote - all the regex expressions actually update the same metric specified by name='Status'
//       so when garage goes through different states it will update a single metric called 'Status'
//       Another good example is SwitchMote where we have 6 different metric definitions here but only 3 resultant actual metrics (Button1, Button2 and Button3)
// ******************************************************************************************************************************************
exports.metrics = {
  //GarageMote
  //NOTE the \b word boundary is used to avoid matching "OPENING" (ie OPEN must be followed by word boundary/end of word)
  open : { name:'Status', regexp:/(?:STS\:)?(OPN|OPEN)\b/i, value:'OPEN', pin:1, graph:1, logValue:2, graphOptions:{ legendLbl:'Garage door events', yaxis: {ticks:0}, colors:['#4a0'], /*lines: { lineWidth:1 }*/}},
  opening : { name:'Status', regexp:/(?:STS\:)?(OPNING|OPENING)/i, value:'OPENING..', pin:1, graph:1, logValue:1 },
  closed : { name:'Status', regexp:/(?:STS\:)?(CLS|CLOSED)/i, value:'CLOSED', pin:1, graphValPrefix:' Door: ', graph:1, logValue:0 },
  closing : { name:'Status', regexp:/(?:STS\:)?(CLSING|CLOSING)/i, value:'CLOSING..', pin:1, graph:1, logValue:1.1 }, //1.1 to avoid a match with "OPENING"
  unknown : { name:'Status', regexp:/(?:STS\:)?(UNK|UNKNOWN)/i, value:'UNKNOWN!', pin:1, graph:1, logValue:0.5 },

  //MotionMote and Mailbox notifier
  motion : { name:'M', regexp:/\bMOTION\b/i, value:'MOTION', pin:1, graph:1, logValue:1, graphValSuffix:' detected!', graphOptions:{ legendLbl:'Motion', lines: { show:false, fill:false }, points: { show:true, radius:8, fill:false }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { ticks: 0 }}},
  lastMotion : { name:'LO', regexp:/(?:LO|LM)\:((?:\d+h)?\d{1,2}m|\d{1,2}s)/i, value:'', pin:1 },
  debug : { name:'DEBUG', regexp:/\[(?:DEBUG)\:([^\]]+)\]/i, value:''},

  //SwitchMote buttons
  SMB0_OFF : { name:'B0', regexp:/BTN0\:0/i, value:'OFF'},
  SMB0_ON  : { name:'B0', regexp:/BTN0\:1/i, value:'ON'},
  SMB1_OFF : { name:'B1', regexp:/(BTN1|SSR|RLY)\:0/i, value:'OFF', pin:1, graph:1, logValue:0, graphOptions:{ yaxis: {ticks:0, min:0, autoscaleMargin:0.5 }, colors:['#4a0']}},
  SMB1_ON  : { name:'B1', regexp:/(BTN1|SSR|RLY)\:1/i, value:'ON', pin:1, graph:1, logValue:1, graphOptions: { /* already defined above for 'B1', no need to repeat */ }},
  SMB2_OFF : { name:'B2', regexp:/BTN2\:0/i, value:'OFF'},
  SMB2_ON  : { name:'B2', regexp:/BTN2\:1/i, value:'ON'},

  //Door Bell Mote
  ring : { name:'RING', regexp:/\bRING\b/i, value:'RING', pin:1, graph:1, logValue:1, graphValSuffix:'!', graphOptions:{ legendLbl:'Doorbell rings', lines: { show:false, fill:false }, points: { show:true, radius:8, fill:false }, grid: { backgroundColor: {colors:['#000', '#a40']}}, yaxis: { ticks: 0 }}},
  BELL_DISABLED : { name:'Status', regexp:/\bBELL\:0\b/i, value:'OFF'},
  BELL_ENABLED  : { name:'Status', regexp:/\bBELL\:1\b/i, value:'ON'},

  //WeatherShield metrics
  //uncomment FtoC if you want a F:1234 to be valuated as a Centigrade isntead of F (the first match is picked up and will evaluate, any following defs are ignored)
  //FtoC : { name:'C', regexp:/F\:(-?\d+\.\d+)/i, value:'', duplicateInterval:3600, valuation:function(value) {return ((value - 32) * 5/9).toFixed(2);}, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}},
  F : { name:'F', regexp:/\bF\:(-?\d+\.\d+)\b/i, value:'', duplicateInterval:3600, unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 } }},
  //uncomment FHtoC if you want a F:1234 to be valuated as a Centigrade isntead of F (the first match is picked up and will evaluate, any following defs are ignored)
  //FHtoC : { name:'C', regexp:/\bF\:(-?\d+)\b/i, value:'', duplicateInterval:3600, valuation:function(value) {return ((value/100 - 32) * 5/9).toFixed(2);}, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}}
  FH : { name:'F', regexp:/\bF\:(-?\d+)\b/i, value:'', duplicateInterval:3600, valuation:function(value) {return value/100;}, unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}},
  C : { name:'C', regexp:/\bC\:([-\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature' }},
  H : { name:'H', regexp:/\bH\:([\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'%', pin:1, graph:1, graphOptions:{ legendLbl:'Humidity', lines: { lineWidth:1 }}},
  P : { name:'P', regexp:/\bP\:([\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'"', pin:1, },

  //SprinklerMote
  SPRKL_ZONE : { name:'ZONE', regexp:/ZONE\:([\d\.]+)/i, value:'', pin:1, graph:1, logValue:'', graphValPrefix:'Zone ', graphValSuffix:' running!',  graphOptions:{ legendLbl:'Zone', colors:['#4a0']}}, //this captures zone messages and extracts the ID of the active zone
  SPRKL_OFF : { name:'ZONE', regexp:/ZONES\:OFF/i, value:'OFF', pin:1, graph:1, logValue:0, graphValPrefix:'', graphValSuffix:''},

  //SonarMote
  sonar : { name:'CM', regexp:/\b([\d\.]+)cm?\b/i, value:'', unit:'cm', pin:1, graph:1,  graphOptions: { legendLbl:'Level', lines: { lineWidth:1 }, colors:['#09c']} },

  //WattMote
  VRMS : { name:'VRMS', regexp:/VRMS\:([\d\.]+)(?:V)?/i, value:'', unit:'V', },
  IRMS : { name:'IRMS', regexp:/IRMS\:([\d\.]+)(?:A)?/i, value:'', unit:'A', },
  WATT : { name:'W', regexp:/W\:([\d\.]+)(?:W)/i, value:'', unit:'W', pin:1, },

  //WaterMote
  GPM : { name:'GPM', regexp:/GPM\:([\d\.]+)/i, value:'', unit:'gpm', graph:1,  graphOptions : { legendLbl:'Gallons/min', lines: { lineWidth:1 }, colors:['#09c'], tickDecimals: 2} },
  GLM : { name:'GLM', regexp:/GLM\:([\d\.]+)/i, value:'', unit:'glm', },
  GAL : { name:'GAL', regexp:/GAL\:([\d\.]+)/i, value:'', unit:'gal', pin:1, },

  //Thermostat specific
  HOLD : { name:'HOLD', regexp:/HOLD\:(ON|OFF)/i, value:''},
  MODE : { name:'MODE', regexp:/MODE\:(COOL|HEAT|AUTO|OFF)/i, value:''},
  TARGET : { name:'TARGET', regexp:/TARGET\:([-\d\.]+)/i, value:'', unit:'°'},
  TSTATE : { name:'TSTATE', regexp:/TSTATE\:(COOLING|HEATING|OFF)/i, value:''},
  FSTATE : { name:'FSTATE', regexp:/FSTATE\:(AUTO|AUTOCIRC|ON)/i, value:''},

  //special metrics
  V : { name:'V', regexp:/\b(?:V?BAT|VOLTS|V)\:([\d\.]+)v?\b/i, value:'', duplicateInterval:3600, unit:'v', graph:1, graphOptions:{ legendLbl:'Voltage', lines: { lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { min: 0, autoscaleMargin: 0.25, autoscaleBottom:false }}},
  RSSI : { name:'RSSI', regexp:/\[(?:RSSI|SS)\:(-?\d+)[^\s]*\]/i, value:'', duplicateInterval:3600, unit:'db', graph:1, graphOptions:{ legendLbl:'Signal strength', lines: { lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { min:-99, max:-20 }, colors:['#0f0']}},
  START : { name:'START', regexp:/\bSTART\b/i, value:'Started'}, //useful to track when a node comes online
  //saved directly into node.type - valid values come from the exports.motes collection below
  TYPE : { name:'TYPE', regexp:/\[(?:TYPE)\:(\w+)[^\s]*\]/i, value:'', duplicateInterval:3600, unit:'db', graph:1, graphOptions:{ legendLbl:'Signal strength', lines: { lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { min:-99, max:-20 }, colors:['#0f0']}},
  //RF Transmit Level (ex: X:31 is max transmit level with RFM69_ATC
  X : { name:'TXLVL', regexp:/\bX\:(\d+)\b/i, value:'', duplicateInterval:3600, graph:1, graphOptions:{ legendLbl:'RFTX Level', lines: { lineWidth:1 }, yaxis: { min:0, max:32 }, colors:['#09c']}},
  //catchAll : { name:'CatchAll', regexp:/(\w+)\:(\w+)/i, value:''},
};

// ******************************************************************************************************************************************
//                                            SAMPLE EVENTS/ALERTS
// ******************************************************************************************************************************************
// define custom actions/events
// IMPORTANT: actions that require comparing time need to run at the server since the client time can be off significantly even if the timezone is the same
//   serverExecute is an action meant to be executed only at the server side (ex sending an email when a condition is met), must be defined as a function
//   Server side execution for events is recommended since you can have multiple clients and you don't want to trigger SMS messages from each one, instead only one SMS message should be sent when an event happens
//   default out-of-box jquery mobile icons are listed here: https://api.jquerymobile.com/icons/
// ******************************************************************************************************************************************
exports.events = {
  motionAlert : { label:'Motion : Alert', icon:'audio', descr:'Alert sound when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/alert.wav'); }; } },
  mailboxAlert : { label:'Mailbox Open Alert!', icon:'audio', descr:'Message sound when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/incomingmessage.wav'); }; } },
  motionEmail : { label:'Motion : Email', icon:'mail', descr:'Send email when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendEmail('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  motionSMS : { label:'Motion : SMS', icon:'comment', descr:'Send SMS when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  
  motionSMSLimiter : { label:'Motion : SMS Limited', icon:'comment', descr:'Send SMS when MOTION is detected, once per time limit (setting)', 
    serverExecute:function(node) {
      if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - node.metrics['M'].updated < 2000)) /*check if M metric exists and value is MOTION, received less than 2s ago*/
      {
        var approveSMS = false;
        
        if (node.metrics['M'].lastSMS) /*check if lastSMS value is not NULL ... */
        {
          var repeatLimit = settings.general.smsRepeatLimit != undefined ? settings.general.smsRepeatLimit.value : 0;
          if (Date.now() - node.metrics['M'].lastSMS > repeatLimit) /*check if lastSMS timestamp is more than 1hr ago*/
          {
            approveSMS = true;
          }
        }
        else
        {
          approveSMS = true;
        }
        
        if (approveSMS)
        {
          node.metrics['M'].lastSMS = Date.now();
          sendSMS('MOTION!', 'MOTION DETECTED ON NODE [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString());
          db.update({ _id: node._id }, { $set : node}, {}, function (err, numReplaced) { console.log('   ['+node._id+'] DB-Updates:' + numReplaced);}); /*save lastSMS timestamp to DB*/
        }
        else console.log('   ['+node._id+'] MOTION SMS skipped.');
      };
    }
  },
  
  motionEmailSnapshot : { label:'Motion : Email+IPCam Snapshot', icon:'camera', descr:'Send email when MOTION is detected, with snapshot from IPCamera',
    serverExecute:function(node) {
      if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (exports.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
          sendEmail('MOTION DETECTED', 'MOTION DETECTED ON NODE: [' + dbNode._id + ':' + dbNode.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
        });
      }
    } 
  },

  temperatureSMSLimiter : { label:'THAlert : SMS Limited', icon:'comment', descr:'Send SMS when F>75°, once per hour', 
    serverExecute:function(node) { 
      if (node.metrics['F'] && node.metrics['F'].value > 75 && (Date.now() - node.metrics['F'].updated < 2000)) /*check if M metric exists and value is MOTION, received less than 2s ago*/
      {
        var approveSMS = false;
        if (node.metrics['F'].lastSMS) /*check if lastSMS value is not NULL ... */
        {
          if (Date.now() - node.metrics['F'].lastSMS > 1800000) /*check if lastSMS timestamp is more than 1hr ago*/
          {
            approveSMS = true;
          }
        }
        else
        {
          approveSMS = true;
        }
        
        if (approveSMS)
        {
          node.metrics['F'].lastSMS = Date.now();
          sendSMS('Temperature > 75° !', 'Temperature alert (>75°F!): [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString());
          db.update({ _id: node._id }, { $set : node}, {}, function (err, numReplaced) { console.log('   ['+node._id+'] DB-Updates:' + numReplaced);}); /*save lastSMS timestamp to DB*/
        }
        else console.log('   ['+node._id+'] THAlert SMS skipped.');
      };
    }
  },

  mailboxSMS : { label:'Mailbox open : SMS', icon:'comment', descr:'Send SMS when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MAILBOX OPENED', 'Mailbox opened [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  motionLightON23 : { label:'Motion: SM23 ON!', icon:'action', descr:'Turn SwitchMote:23 ON when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendMessageToNode({nodeId:23, action:'MOT:1'}); }; } },

  doorbellSound : { label:'Doorbell : Sound', icon:'audio', descr:'Play sound when doorbell rings', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/doorbell.wav'); }; } },
  doorbellSMS : { label:'Doorbell : SMS', icon:'comment', descr:'Send SMS when Doorbell button is pressed', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { sendSMS('DOORBELL', 'DOORBELL WAS RINGED: [' + node._id + '] ' + node.label.replace(/\{.+\}/ig, '') + ' @ ' + new Date().toLocaleTimeString()); }; } },
  
  doorbellSnapshot : { label:'Doorbell : Snapshot', icon:'camera', descr:'Send IPCamera snapshot when Doorbell is pressed pressed',
    serverExecute:function(node) {
      if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (exports.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
          sendEmail('Someone at the door!', 'Someone rang the doorbell! @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
        });
      }
    }
  },
  
  sumpSMS : { label:'SumpPump : SMS (below 20cm)', icon:'comment', descr:'Send SMS if water < 20cm below surface', serverExecute:function(node) { if (node.metrics['CM'] && node.metrics['CM'].value < 20 && (Date.now() - new Date(node.metrics['CM'].updated).getTime() < 2000)) { sendSMS('SUMP PUMP ALERT', 'Water is only 20cm below surface and rising - [' + node._id + '] ' + node.label.replace(/\{.+\}/ig, '') + ' @ ' + new Date().toLocaleTimeString()); }; } },

  garageSMS : { label:'Garage : SMS', icon:'comment', descr:'Send SMS when garage is OPENING', serverExecute:function(node) { if (node.metrics['Status'] && (node.metrics['Status'].value.indexOf('OPENING')>-1) && (Date.now() - new Date(node.metrics['Status'].updated).getTime() < 2000)) { sendSMS('Garage event', 'Garage was opening on node : [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  garagePoll: { label:'Garage : POLL Status', icon:'comment', descr:'Poll Garage Status', nextSchedule:function(nodeAtScheduleTime) { return 30000; }, scheduledExecute:function(nodeAtScheduleTime) { db.findOne({ _id : nodeAtScheduleTime._id }, function (err, nodeRightNow) { if (nodeRightNow) { /*just emit a log the status to client(s)*/ io.sockets.emit('LOG', 'GARAGE POLL STATUS: ' + nodeRightNow.metrics['Status'].value ); } }); } },
  
  garageSnapshotEmail : { label:'Garage : Snapshot', icon:'camera', descr:'Send IPCam snapshot when garage is OPENING',
    serverExecute: function(node) { 
      if (node.metrics['Status'] && (node.metrics['Status'].value.indexOf('OPENING')>-1) && (Date.now() - new Date(node.metrics['Status'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (exports.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
          sendEmail('GARAGE OPENING', 'GARAGE IS OPENING: [' + dbNode._id + ':' + dbNode.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
        });
      }
    }
  },

  switchMoteON_PM : { label:'SwitchMote ON at sunset!', icon:'clock', descr:'Turn this switch ON at sunset', nextSchedule:function(node) { return exports.millisToFutureDate(exports.nextSunriseOrSunset(0), exports.ONEDAY*2); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:1'}); } },
  switchMoteOFF_AM : { label:'SwitchMote OFF at sunrise!', icon:'clock', descr:'Turn this switch OFF at sunrise', nextSchedule:function(node) { return exports.millisToFutureDate(exports.nextSunriseOrSunset(1), exports.ONEDAY*2); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:0'}); } },
  switchMoteONBUZZ : { label:'SwitchMote ON Buzzer beep!', icon:'clock', descr:'Buzz gateway when switchmote is ON',  serverExecute:function(node) { if (node.metrics['B1'] && node.metrics['B1'].value == 'ON' && (Date.now() - new Date(node.metrics['B1'].updated).getTime() < 2000)) { setTimeout(function() { sendMessageToGateway('BEEP'); }, 5); } }},

  //for the sprinkler events, rather than scheduling with offsets, its much easier to run them every day, and check the odd/even/weekend condition in the event itself
  sprinklersOddDays : { label:'Odd days @ 2:30AM', icon:'clock', descr:'Run this sprinkler program on odd days at 2:30AM', nextSchedule:function(node) { return exports.timeoutOffset(2,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==1) sendMessageToNode({nodeId:node._id, action:'PRG 1:300 2:300 3:300 4:300 5:300' /*runs stations 1-5 (300sec each))*/}); } },
  sprinklersEvenDays : { label:'Even days @ 2:30AM', icon:'clock', descr:'Run this sprinkler program on even days at 2:30AM', nextSchedule:function(node) { return exports.timeoutOffset(2,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==0) sendMessageToNode({nodeId:node._id, action:'PRG 1:300 2:300 3:300 4:300 5:300' /*runs stations 1-5 (300sec each)*/}); } },
  sprinklersWeekends : { label:'Weekends @ 2:30AM)', icon:'clock', descr:'Run this sprinkler program on weekend days at 2:30AM', nextSchedule:function(node) { return exports.timeoutOffset(2,30); }, scheduledExecute:function(node) { if ([0,6].indexOf(new Date().getDay())>-1 /*Saturday=6,Sunday=0,*/) sendMessageToNode({nodeId:node._id, action:'PRG 1:180 2:180 3:180 4:180 5:180' /*runs stations 1-5 (180sec each)*/}); } },

  //thermostat poll event
  thermostatPoll : { label:'Thermostat status poll', icon:'fa-heartbeat', descr:'Poll thermostat status (HTTP GET)',
    nextSchedule:function(node) { return 30000; },
    scheduledExecute:function(node) {
      exports.tstatPoll(node._id);
    }
  },
  //END thermostat poll event

  thermostat_H68_AM : { label:'Thermostat heat 68° @ 8AM weekdays', icon:'clock', descr:'Request heat point of 68° weekdays at 8am',
    nextSchedule:function(node) { return exports.timeoutOffset(8,0); }, //ie 8:00 (8am)
    scheduledExecute:function(node) {
      if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1..Friday=5,*/)
      {
        var targetNow=0, modeNow='';
        // if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
        // if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
        // if (targetNow == 68 && modeNow=='HEAT') return;
        var thejson = { 'tmode':1, 't_heat':68, 'hold':1 };
        exports.tstatRequest(thejson, node._id);
      }
      else console.log('thermostat_H73_PM IF(FAIL): day=' + (new Date().getDay()));
    }
  },

  thermostat_H73_PM : { label:'Thermostat heat 73° @ 4:00PM weekdays', icon:'clock', descr:'Request heat point of 73° weekdays at 4pm',
    nextSchedule:function(node) { return exports.timeoutOffset(16,0); }, //ie 16:00 (4pm)
    scheduledExecute:function(node) {
      if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1..Friday=5,*/)
      {
        var targetNow=0, modeNow='';
        //if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
        //if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
        //if (targetNow == 73 && modeNow=='HEAT') return;
        var thejson = { 'tmode':1, 't_heat':73, 'hold':1 };
        exports.tstatRequest(thejson, node._id);
      }
      else console.log('thermostat_H73_PM IF(FAIL): day=' + (new Date().getDay()));
    }
  },
};

// ******************************************************************************************************************************************
//                                            DEFAULT MOTE DEFINITIONS
// ******************************************************************************************************************************************
//NOTE: all condition functions expect a node parameter and must be passed as strings otherwise they cannot be sent over websockets JSON
//      hence the following conditions are defined like this (empty string concatenated with the function definition):
//      condition:''+function(node){...}
// icons are actual files in the www images subfolder
// controls: define a set of controls that can trigger actions on listening Nodes.
//           Simple example: doorbell listens for 'RING' tokens and will ring the bell when one is received.
//           Complex example: GarageMote has different states for the same 'Status' metric and we need a button to open the garage but it should only
//                work when the garage is OPEN or closed, otherwise it should do nothing and wait for these 2 valid states to occur
//           The 'condition' property is a stringified function that is eval-ed at the client side when displaying the control (first control with condition evaluating to TRUE will be displayed)
//           The 'css' property allows you to style the control buttons differently for each state, also the states icons are jquery mobile standard icons you can specify
//           The 'action' property is a string message that will be sent to that node when the control is clicked
//           The 'serverExecute' property is a server side function that if defined, will be called when the control is clicked (ie it can do anything like triggering an HTTP request like in the case of an IP thermostat)
//           The 'breakAfter' property, if set to 'true', will insert a page break after the control it's specified for. This is useful for nodes that have many of controls, to break them apart on the page
// ******************************************************************************************************************************************
exports.motes = {
  DoorBellMote: {
    label  : 'DoorBell',
    icon   : 'icon_doorbell.png',
    settings: { ipcam_snapURL: '' },
    controls : { ring : { states: [{ label:'Ring it!', action:'RING', icon:'audio' }]},
                 status :  { states: [{ label:'Disabled', action:'BELL:1', css:'background-color:#FF9B9B;', icon:'fa-bell-slash', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OFF'; }},
                                      { label:'Enabled',  action:'BELL:0', css:'background-color:#9BFFBE;color:#000000', icon:'fa-bell', condition:''+function(node) { return node.metrics['Status']==null || node.metrics['Status'].value == 'ON'; }}]},
    },
  },
  GarageMote : {
    label    : 'Garage Opener',
    icon     : 'icon_garage.png',
    settings : { ipcam_snapURL: '' },
    controls : { refresh : { states: [{ label:'Refresh', action:'STS', icon:'refresh' }]},
                 opencls : { states: [{ label:'Open!', action:'OPN', icon:'arrow-u', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'CLOSED';}},
                                      { label:'Opening..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OPENING';}},
                                      { label:'Close!', action:'CLS', icon:'arrow-d', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OPEN';}},
                                      { label:'Closing..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'CLOSING';}}]
                           }
              }
  },
  MotionMote: {
    label  : 'Motion Sensor',
    icon   : 'icon_motion.png',
    settings: { lowVoltageValue: '', ipcam_snapURL: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
  Mailbox: {
    label   : 'Mailbox',
    icon : 'icon_mailbox.png',
    settings: { lowVoltageValue: '', ipcam_snapURL: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
  SwitchMote: {
    label   : 'Light Switch',
    icon : 'icon_switchmote.png',
    controls : { B0 : { states: [{ label:'B0 (off)', action:'BTN0:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B0'] ? node.metrics['B0'].value == 'OFF' : false; }},  //http://api.jquerymobile.com/icons/
                                { label:'B0 (on)',  action:'BTN0:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B0'] ? node.metrics['B0'].value == 'ON' : false; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B0', Object.keys(node.metrics))>-1);}},
                B1 : { states: [{ label:'Off', action:'BTN1:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B1'] ? node.metrics['B1'].value == 'OFF' : false; }},
                                { label:'On',  action:'BTN1:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B1'] ? node.metrics['B1'].value == 'ON' : false; }}]},
                B2 : { states: [{ label:'B2 (off)', action:'BTN2:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B2'] ? node.metrics['B2'].value == 'OFF' : false; }},
                                { label:'B2 (on)',  action:'BTN2:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B2'] ? node.metrics['B2'].value == 'ON' : false; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B2', Object.keys(node.metrics))>-1);}},
               },
    settings: { ipcam_snapURL: '' }, //blank will make it inherit setting value from global settings.json, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
  SonarMote: {
    label  : 'Sonar Mote (Distance Sensor)',
    icon   : 'icon_sonar.png',
    settings: { lowVoltageValue: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
  SprinklerMote: {
    label  : 'Sprinkler Controller',
    icon   : 'icon_sprinklers.png',
    controls : {
      Z1 : { states: [{ label:'1', action:'ON:1', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '1'; }},
                      { label:'1', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '1'; }}]},
      Z2 : { states: [{ label:'2', action:'ON:2', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '2'; }},
                      { label:'2', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '2'; }}]},
      Z3 : { states: [{ label:'3', action:'ON:3', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '3'; }},
                      { label:'3', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '3'; }}]},
      Z4 : { states: [{ label:'4', action:'ON:4', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '4'; }},
                      { label:'4', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '4'; }}]},
      Z5 : { states: [{ label:'5', action:'ON:5', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '5'; }},
                      { label:'5', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '5'; }}]},
      Z6 : { states: [{ label:'6', action:'ON:6', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '6'; }},
                      { label:'6', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '6'; }}]},
      Z7 : { states: [{ label:'7', action:'ON:7', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '7'; }},
                      { label:'7', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '7'; }}]},
      Z8 : { states: [{ label:'8', action:'ON:8', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '8'; }},
                      { label:'8', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '8'; }}]},
      Z9 : { states: [{ label:'9', action:'ON:9', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE']!=null && node.metrics['ZONE'].value != '9'; }},
                      { label:'9', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE']==null || node.metrics['ZONE'].value == '9'; }}], breakAfter:true},
      MN : { states: [{ label:'Run Z1-8 5min', action:'PRG 1:300 2:300 3:300 4:200 5:300 5:300 6:300 7:300 8:300'}]},
    },
  },
  WeatherMote: {
    label  : 'Weather Sensor',
    icon   : 'icon_weather.png',
    settings: { lowVoltageValue: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },

  WaterMeter: {
    label  : 'Water Meter',
    icon   : 'icon_watermeter.png',
  },

  RadioThermostat: { //for Radio Thermostat CT50
    label  : 'Thermostat (CT-50)',
    icon   : 'icon_thermostat_ct50.png',
    controls : {
      //decrease target temperature by 1°
      COOLER : { states: [{ label:'Cooler', action:'', icon:'fa-chevron-down', //css:'background-color:#0077ff;color:#fff',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow <= 0 || (modeNow!='COOL' && modeNow != 'HEAT')) return;
                              var thejson = (modeNow=='COOL' ? { 't_cool' : --targetNow } : { 't_heat' : --targetNow });
                              exports.tstatRequest(thejson, node._id);
                            },
                          }]
                 },
      //increase target temperature by 1°
      WARMER : { states: [{ label:'Warmer', action:'', icon:'fa-chevron-up', //css:'background-color:#ff1100;color:#fff',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow <= 0 || (modeNow!='COOL' && modeNow != 'HEAT')) return;
                              var thejson = (modeNow=='COOL' ? { 't_cool' : ++targetNow } : { 't_heat' : ++targetNow });
                              exports.tstatRequest(thejson, node._id);
                            },
                         }],
               },
      //example presets (set specific warm/cold hold temperature in 1 click)
      COOL78 : { states: [{ label:'Cool:78°', action:'', icon:'fa-ge',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow == 78 && modeNow=='COOL') return;
                              var thejson = { 'tmode':2, 't_cool':78, 'hold':1 };
                              exports.tstatRequest(thejson, node._id);
                            },
                         }],
               },
      HEAT78 : { states: [{ label:'Heat:73°', action:'', icon:'fa-fire',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow == 73 && modeNow=='HEAT') return;
                              var thejson = { 'tmode':1, 't_heat':73, 'hold':1 };
                              exports.tstatRequest(thejson, node._id);
                            },
                         }],
                  breakAfter:true,
               },
      //switch to COOL mode
      COOL : { states: [{ label:'Cool', action:'', icon:'fa-ge', css:'background-color:#0077ff;color:#fff',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                            if (targetNow <= 0 || modeNow=='COOL') return;
                            var thejson = { 'tmode':2, 't_cool' : ++targetNow };
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'COOL'; }
                        },
                        { label:'Cool', action:'', icon:'fa-ge',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                            if (targetNow <= 0 || modeNow=='COOL') return;
                            var thejson = { 'tmode':2, 't_cool' : ++targetNow };
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value != 'COOL'; }
                        }]
               },
      //switch to HEAT mode
      HEAT : { states: [{ label:'Heat', action:'', icon:'fa-fire', css:'background-color:#ff1100;color:#fff',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (node.metrics['F']) targetNow = node.metrics['F'].value;
                            if (targetNow <= 0 || modeNow=='HEAT') return;
                            var thejson = { 'tmode':1, 't_heat' : --targetNow };
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'HEAT'; }
                        },
                        { label:'Heat', action:'', icon:'fa-fire',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                            if (targetNow <= 0 || modeNow=='HEAT') return;
                            var thejson = { 'tmode':1, 't_heat' : --targetNow };
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value != 'HEAT'; }
                        }]
               },
      //switch to AUTO mode
      AUTO : { states: [{ label:'Auto', action:'', icon:'fa-balance-scale', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='AUTO') return;
                            exports.tstatRequest({ 'tmode':3 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'AUTO'; }
                        },
                        { label:'Auto', action:'', icon:'fa-balance-scale',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='AUTO') return;
                            exports.tstatRequest({ 'tmode':3 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value != 'AUTO'; }
                        }]
               },
      //switch thermostat OFF
      OFF : { states: [{ label:'Off', action:'', icon:'fa-power-off', css:'background-color:#ff1100;color:#fff',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='OFF') return;
                            exports.tstatRequest({ 'tmode':0 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'OFF'; }
                        },
                        { label:'Off', action:'', icon:'fa-power-off',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='OFF') return;
                            exports.tstatRequest({ 'tmode':0 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value != 'OFF'; }
                        }],
                breakAfter:true,
              },
      //toggle the fan mode
      FAN : { states: [{ label:'Turn fan ON', action:'', icon:'fa-unlock-alt', //css:'background-color:#FF9B9B',
                          serverExecute:function(node){
                            var fanNow='';
                            if (node.metrics['FSTATE']) fanNow = node.metrics['FSTATE'].value;
                            if (fanNow != 'AUTO' && fanNow != 'ON') return;
                            var thejson = (fanNow == 'AUTO' ? { 'fmode':2 } : { 'fmode':0 }); //toggle between ON and AUTO
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['FSTATE']!=null && node.metrics['FSTATE'].value == 'AUTO'; }
                        },
                        { label:'Turn fan AUTO', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var fanNow='';
                            if (node.metrics['FSTATE']) fanNow = node.metrics['FSTATE'].value;
                            if (fanNow != 'AUTO' && fanNow != 'ON') return;
                            var thejson = (fanNow == 'AUTO' ? { 'fmode':2 } : { 'fmode':0 }); //toggle between ON and AUTO
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['FSTATE']!=null && node.metrics['FSTATE'].value == 'ON'; }
                        }],
             },
      //toggle HOLD on/off
      HOLD : { states: [{ label:'HOLD', action:'', icon:'fa-unlock-alt', css:'background-color:#FF9B9B',
                          serverExecute:function(node){
                            var holdNow='';
                            if (node.metrics['HOLD']) holdNow = node.metrics['HOLD'].value;
                            if (holdNow != 'ON' && holdNow != 'OFF') return;
                            var thejson = (holdNow == 'OFF' ? { 'hold':1 } : { 'hold':0 });
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['HOLD']!=null && node.metrics['HOLD'].value == 'OFF'; }
                        },
                        { label:'HOLD', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var holdNow='';
                            if (node.metrics['HOLD']) holdNow = node.metrics['HOLD'].value;
                            if (holdNow != 'ON' && holdNow != 'OFF') return;
                            var thejson = (holdNow == 'OFF' ? { 'hold':1 } : { 'hold':0 });
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['HOLD']!=null && node.metrics['HOLD'].value == 'ON'; }
                        }],
             },
    },
    settings: { ip:'' } //blank will inherit ip value from global settings.json
  }
}

// ******************************************************************************************************************************************
//                                            GENERAL HELPER FUNCTIONS
// ******************************************************************************************************************************************
exports.ONEDAY = 86400000;

exports.isNumeric =  function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n); //http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric/1830844#1830844
}

//validate ipv4/ipv6/hostname/word - test here: http://jsfiddle.net/AJEzQ/
exports.isValidIP = function(str) {
  //IPs only:
  return /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/.test(str);
  //IPs/hostnames/alphanumeric: return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(str);
}

//a numeric ID (for RF nodes), or a valid IPV4/IPV6/host
exports.isValidNodeId = function(id) {
  return (exports.isNumeric(id) || exports.isValidIP(id));
}

//extracts the value of a given metric based on the regular expression and any valuation function defined for that metric
exports.determineValue = function(matchingMetric, matchingToken) {
  var actualValueToProcess = matchingToken[1] || matchingToken[0]; //attempt to get first captured group if any, else fall back to entire match
  var result;
  if (matchingMetric.valuation != undefined)
  {
    //console.log('Valuating: ' + actualValueToProcess);
    result = matchingMetric.valuation(actualValueToProcess);
  }
  else result = matchingMetric.value || actualValueToProcess;
  if (exports.isNumeric(result))
    return Number(result);
  else return result;
};

//extracts the value of a given metric based on the regular expression
exports.determineGraphValue = function(matchingMetric, matchingToken) {
  var actualValueToProcess = matchingToken[2] || matchingToken[1] || matchingToken[0]; //attempt to get second captured group if any, else first group if any, else fall back to entire match
  var result;
  if (matchingMetric.valuation != undefined)
  {
    //console.log('Valuating: ' + actualValueToProcess);
    result = matchingMetric.valuation(actualValueToProcess);
  }
  else result = matchingMetric.value || actualValueToProcess;
  if (exports.isNumeric(result))
    return Number(result);
  else return result;
}

//calculates the milliseconds timeout remaining until a given time of the day (if it's 8AM now and time given was 3AM, it will calculate to the next day 3AM)
//offset can be used to add more time to the calculated timeout, for instance to delay by one day: pass offset=86400000
exports.timeoutOffset = function(hour, minute, second, offset) {
  var result = new Date().setHours(hour,minute,second || 0, 0);
  result = result < new Date().getTime() ? (result + exports.ONEDAY) : result;
  result -= new Date().getTime();
  if (exports.isNumeric(offset)) result += offset;
  return result;
}

//calculates the milliseconds timeout remaining until a given date in the future
exports.millisToFutureDate = function(futureDate, failSafe) {
  var now = new Date();
  return (now < futureDate) ? (futureDate-now) : (failSafe || 3000);
}

// ******************************************************************************************************************************************
//                                            RADIO THERMOSTAT SPECIFIC HELPER FUNCTIONS 
// ******************************************************************************************************************************************
// *** these are implemented for Radio Thermostat model CT50
// ******************************************************************************************************************************************
//this function sends an HTTP GET request to the thermostat to refresh metrics like current temperature, target temp, mode (heat/cool), hold etc.
exports.tstatPoll = function(nodeId) {
  db.findOne({ _id : nodeId }, function (err, dbNode) {
    var thermostatIP = dbNode.settings && dbNode.settings.ip ? dbNode.settings.ip : settings.radiothermostat.ip.value;
    var requestJson = 'http://'+thermostatIP+'/tstat';
    request(requestJson, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        var target = info.t_cool || info.t_heat || undefined;
        var fakeSerialMsg = '['+nodeId+'] '+'F:'+(info.temp*100) + (target ? ' TARGET:'+target : '') + ' HOLD:'+(info.hold==1?'ON':'OFF')+' TSTATE:'+(info.tstate==0?'OFF':(info.tstate==1?'HEATING':'COOLING'))+' FSTATE:'+(info.fstate==0?'AUTO':(info.fstate==1?'ON':'AUTOCIRC'))+' MODE:'+(info.tmode==3?'AUTO':(info.tmode==2?'COOL':(info.tmode==1?'HEAT':'OFF')));
        processSerialData(fakeSerialMsg);
        //io.sockets.emit('LOG', fakeSerialMsg);
      }
      else io.sockets.emit('LOG', 'THERMOSTAT STATUS GET FAIL for request \''+requestJson+'\':' + error);
    });
  });
}

//this function sends an HTTP POST request to the thermostat (usually to change temperature/mode etc).
exports.tstatRequest = function(thejson, nodeId) {
  //console.log('tstatRequest:' + JSON.stringify(thejson));
  db.findOne({ _id : nodeId }, function (err, dbNode) {
    var thermostatIP = dbNode.settings && dbNode.settings.ip ? dbNode.settings.ip : settings.radiothermostat.ip.value;
    request.post({ url:'http://'+thermostatIP+'/tstat', json: thejson},
              function(error,response,body){
                //console.log('BODY: ' + JSON.stringify(body));
                if (error) console.log('ERROR in tstatRequest(): ' + JSON.stringify(thejson) + ' nodeId:' + nodeId + ' - ' + error);
                else exports.tstatPoll(nodeId); //now ask for a refresh of status from thermostat (HTTP GET)
              }
    );
  });
}

// ******************************************************************************************************************************************
//                                            SUNRISE-SUNSET HELPER FUNCTIONALITY
// ******************************************************************************************************************************************
// find your lat/long at: http://www.latlong.net/
// sunrise-sunset api at: http://api.sunrise-sunset.org/  --> more events available in this API (solarNoon, nadir, sunrise, sunset, sunriseEnd, sunsetStart, dawn, dusk, nauticalDawn, nauticalDusk, nightEnd, night, goldenHourEnd, goldenHour)
// ******************************************************************************************************************************************
exports.nextSunriseOrSunset = function(getSunrise) { //0=sunset, 1=sunrise
  var latitude = settings.location != undefined ? settings.location.latitude.value : 51.51;  //fallback to London if setting not defined
  var longitude = settings.location != undefined ? settings.location.longitude.value : -0.12;
  now = new Date();
  var times = suncalc.getTimes(now, latitude, longitude);
  var whichEvent =  getSunrise ? times.sunrise : times.sunset;
  
  if (whichEvent > now)
  {
    if (whichEvent - now < 600000)
    {
      //if next sunrise/sunset is less than 10 minutes in the future and gateway just started
      if(process.uptime() < 600) return whichEvent;
    }
    else return whichEvent;
  }
   
  //get next day's sunrise/sunset
  whichEvent.setDate(whichEvent.getDate()+1);
  return getSunrise ? suncalc.getTimes(whichEvent, latitude, longitude).sunrise
                    : suncalc.getTimes(whichEvent, latitude, longitude).sunset;
}