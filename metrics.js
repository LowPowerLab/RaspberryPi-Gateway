// **********************************************************************************
// Websocket backend for the Moteino IoT Framework
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
// Copyright Felix Rusu, Low Power Lab LLC (2015), http://lowpowerlab.com/contact
// ********************************************************************************************
// Great reference on Javascript Arrays: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
// Great reference on Javascript Objects: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects
// Great reference on Javascript Regular Expressions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
// Great sandbox to test your Regular Expressions: http://regexr.com/
// JqueryMobile generic icons: http://api.jquerymobile.com/icons/
// FLOT graphs customizations: http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html
// ******************************************************************************************************************************************
//                                            SAMPLE METRIC DEFINITIONS
// ******************************************************************************************************************************************
// These metrics definitions consist of a regular expression that will be attempted to be matched to any incoming tokens from the gateway Moteino serial port
// If one matches you should see a new node/metric show up in the UI or be updated if previously matched
// Other parameters:
//     - value - this can be hardcoded, or if left blank the value will be the first captured parentheses from the regex expression
//     - pin:1/0 - if '1' then by default this metric will show up in the main homepage view for that node, otherwise it will only show in the node page; it can then manually be flipped in the UI
//     - graph:1/0 - if '1' then by default this metric will be logged in gatewayLog.db every time it comes in
//     - logValue - you can specify a hardcoded value that should be logged instead of the captured metric (has to always be numeric!)
//     - graphOptions - this is a javascript object that when presend is injected directly into the FLOT graph for the metric - you can use this to highly customize the appearance of any metric graph
//                    - it should only be specified one per each metric - the first one (ie one for each set of metrics that have multiple entries with same 'name') - ex: GarageMote 'Status' metric
//                    - this object is overlapped over the default 'graphOptions' defined in index.html
//                    - for more details how to customize FLOT graphs see this: http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html
// Important Notes:
//     - the same node can have any number of metrics
//     - each related metric should have the same name - for instance look at GarageMote - all the regex expressions actually update the same metric specified by name='Status'
//       so when garage goes through different states it will update a single metric called 'Status'
//       Another good example is SwitchMote where we have 6 different metric definitions here but only 3 resultant actual metrics (Button1, Button2 and Button3)
var request = require('request');
var config = require('nconf');
var JSON5 = require('json5');
config.argv().file({ file: require('path').resolve(__dirname, 'settings.json5'), format: JSON5 }); //old settings using exports: //var settings = require('./settings.js');
var settings = config.get('settings');

exports.metrics = {
  //GarageMote
  //NOTE the \b word boundary is used to avoid matching "OPENING" (ie OPEN must be followed by word boundary/end of word)
  open : { name:'Status', regexp:/(?:STS\:)?(OPN|OPEN)\b/i, value:'OPEN', pin:1, graph:1, logValue:2, graphOptions:{ legendLbl:'Garage door events', yaxis: {ticks:0}, colors:['#4a0'], /*lines: { lineWidth:1 }*/}},
  opening : { name:'Status', regexp:/(?:STS\:)?(OPNING|OPENING)/i, value:'OPENING..', pin:1, graph:1, logValue:1 },
  closed : { name:'Status', regexp:/(?:STS\:)?(CLS|CLOSED)/i, value:'CLOSED', pin:1, graphValPrefix:' Door: ', graph:1, logValue:0 },
  closing : { name:'Status', regexp:/(?:STS\:)?(CLSING|CLOSING)/i, value:'CLOSING..', pin:1, graph:1, logValue:1.1 }, //1.1 to avoid a match with "OPENING"
  unknown : { name:'Status', regexp:/(?:STS\:)?(UNK|UNKNOWN)/i, value:'UNKNOWN!', pin:1, graph:1, logValue:0.5 },

  //MotionMote and Mailbox notifier
  motion : { name:'M', regexp:/MOTION/i, value:'MOTION', pin:1, graph:1, logValue:1, graphValSuffix:' detected!', graphOptions:{ legendLbl:'Motion', lines: { show:false, fill:false }, points: { show: true, radius: 5, lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { ticks: 0 }}},
  lastMotion : { name:'LO', regexp:/(?:LO|LM)\:((?:\d+h)?\d{1,2}m|\d{1,2}s)/i, value:'', pin:1 },
  debug : { name:'DEBUG', regexp:/\[(?:DEBUG)\:([^\]]+)\]/i, value:''},

  //SwitchMote buttons
  SMB0_OFF : { name:'B0', regexp:/BTN0\:0/i, value:'OFF'},
  SMB0_ON  : { name:'B0', regexp:/BTN0\:1/i, value:'ON'},
  SMB1_OFF : { name:'B1', regexp:/(BTN1|SSR|RLY)\:0/i, value:'OFF', pin:1, graph:1, logValue:0, graphOptions:{ yaxis: {ticks:0}, colors:['#4a0']}},
  SMB1_ON  : { name:'B1', regexp:/(BTN1|SSR|RLY)\:1/i, value:'ON', pin:1, graph:1, logValue:1, graphOptions: { /* already defined above for 'B1', no need to repeat */ }},
  SMB2_OFF : { name:'B2', regexp:/BTN2\:0/i, value:'OFF'},
  SMB2_ON  : { name:'B2', regexp:/BTN2\:1/i, value:'ON'},

  //Door Bell Mote
  ring : { name:'RING', regexp:/RING/i, value:'RING', pin:1, graph:1, logValue:1, graphValSuffix:'!', graphOptions:{ legendLbl:'Doorbell rings', lines: { show:false, fill:false }, points: { show: true, radius: 5,  lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#a40']}}, yaxis: { ticks: 0 }}},
  BELL_DISABLED : { name:'Status', regexp:/BELL\:0/i, value:'OFF'},
  BELL_ENABLED  : { name:'Status', regexp:/BELL\:1/i, value:'ON'},
  START         : { name:'START', regexp:/START/i, value:'Started'},

  //WeatherShield metrics
  F : { name:'F', regexp:/F\:(-?\d+\.\d+)/i, value:'', unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 } }},
  FH : { name:'F', regexp:/F\:(-?\d+)/i, value:'', valuation:function(value) {return value/100;}, unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}},
  C : { name:'C', regexp:/C\:([-\d\.]+)/i, value:'', unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature' }},
  H : { name:'H', regexp:/H\:([\d\.]+)/i, value:'', unit:'%', pin:1, graph:1, graphOptions:{ legendLbl:'Humidity', lines: { lineWidth:1 }}},
  P : { name:'P', regexp:/P\:([\d\.]+)/i, value:'', unit:'"', pin:1, },

  //SprinklerMote
  SPRKL_ZONE : { name:'ZONE', regexp:/ZONE\:([\d\.]+)/i, value:'', pin:1, graph:1, logValue:'', graphValPrefix:'Zone ', graphValSuffix:' running!',  graphOptions:{ legendLbl:'Zone', colors:['#4a0']}}, //this captures zone messages and extracts the ID of the active zone
  SPRKL_OFF : { name:'ZONE', regexp:/ZONES\:OFF/i, value:'OFF', pin:1, graph:1, logValue:0, graphValPrefix:'', graphValSuffix:''},

  //SonarMote
  sonar : { name:'CM', regexp:/([\d\.]+)cm?/i, value:'', unit:'cm', pin:1, graph:1,  graphOptions: { legendLbl:'Level', lines: { lineWidth:1 }, colors:['#09c']} },

  //WattMote
  VRMS : { name:'VRMS', regexp:/VRMS\:([\d\.]+)(?:V)?/i, value:'', unit:'V', },
  IRMS : { name:'IRMS', regexp:/IRMS\:([\d\.]+)(?:A)?/i, value:'', unit:'A', },
  WATT : { name:'W', regexp:/W\:([\d\.]+)(?:W)/i, value:'', unit:'W', pin:1, },

  //WaterMote
  GPM : { name:'GPM', regexp:/GPM\:([\d\.]+)/i, value:'', unit:'gpm', graph:1,  graphOptions : { legendLbl:'Gallons/min', lines: { lineWidth:1 }, colors:['#09c'],  /*yaxis: { ticks: [1,5,20], transform:  function(v) {return v==0?v:Math.log(v); //log scale },*/ tickDecimals: 2} },
  GLM : { name:'GLM', regexp:/GLM\:([\d\.]+)/i, value:'', unit:'glm', },
  GAL : { name:'GAL', regexp:/GAL\:([\d\.]+)/i, value:'', unit:'gal', pin:1, },

  //Thermostat specific
  HOLD : { name:'HOLD', regexp:/HOLD\:(ON|OFF)/i, value:''},
  MODE : { name:'MODE', regexp:/MODE\:(COOL|HEAT|AUTO|OFF)/i, value:''},
  TARGET : { name:'TARGET', regexp:/TARGET\:([-\d\.]+)/i, value:'', unit:'°'},
  TSTATE : { name:'TSTATE', regexp:/TSTATE\:(COOLING|HEATING|OFF)/i, value:''},
  FSTATE : { name:'FSTATE', regexp:/FSTATE\:(AUTO|AUTOCIRC|ON)/i, value:''},

  //special metrics
  V : { name:'V', regexp:/(?:V?BAT|VOLTS|V)\:(\d\.\d+)v?/i, value:'', unit:'v'},
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
exports.events = {
  motionAlert : { label:'Motion : Alert', icon:'audio', descr:'Alert sound when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/alert.wav'); }; } },
  mailboxAlert : { label:'Mailbox Open Alert!', icon:'audio', descr:'Message sound when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/incomingmessage.wav'); }; } },
  motionEmail : { label:'Motion : Email', icon:'mail', descr:'Send email when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendEmail('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label + '] @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },
  motionSMS : { label:'Motion : SMS', icon:'comment', descr:'Send SMS when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label + '] @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },
  mailboxSMS : { label:'Mailbox open : SMS', icon:'comment', descr:'Send SMS when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MAILBOX OPENED', 'Mailbox opened [' + node._id + ':' + node.label + '] @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },
  motionLightON23 : { label:'Motion: SM23 ON!', icon:'action', descr:'Turn SwitchMote:23 ON when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendMessageToNode({nodeId:23, action:'MOT:1'}); }; } },
  doorbellSound : { label:'Doorbell : Sound', icon:'audio', descr:'Play sound when doorbell rings', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/doorbell.wav'); }; } },
  doorbellSMS : { label:'Doorbell : SMS', icon:'comment', descr:'Send SMS when Doorbell button is pressed', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { sendSMS('DOORBELL', 'DOORBELL WAS RINGED: [' + node._id + '] ' + node.label + ' @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },
  sumpSMS : { label:'SumpPump : SMS (below 20cm)', icon:'comment', descr:'Send SMS if water < 20cm below surface', serverExecute:function(node) { if (node.metrics['CM'] && node.metrics['CM'].value < 20 && (Date.now() - new Date(node.metrics['CM'].updated).getTime() < 2000)) { sendSMS('SUMP PUMP ALERT', 'Water is only 20cm below surface and rising - [' + node._id + '] ' + node.label + ' @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },

  garageSMS : { label:'Garage : SMS', icon:'comment', descr:'Send SMS when garage is OPENING', serverExecute:function(node) { if (node.metrics['Status'] && node.metrics['Status'].value == 'OPENING' && (Date.now() - new Date(node.metrics['Status'].updated).getTime() < 2000)) { sendSMS('Garage event', 'Garage was opening on node : [' + node._id + ':' + node.label + '] @ ' + (new Date().toLocaleTimeString() + (new Date().getHours() > 12 ? 'PM':'AM'))); }; } },

  switchMoteON_PM : { label:'SwitchMote ON at 5:30PM!', icon:'clock', descr:'Turn this switch ON every evening', nextSchedule:function(node) { return exports.timeoutOffset(17,30); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:1'}); } },
  switchMoteOFF_AM : { label:'SwitchMote OFF at 7:30AM!', icon:'clock', descr:'Turn this switch OFF every morning', nextSchedule:function(node) { return exports.timeoutOffset(7,30); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:0'}); } },
  //for the sprinkler events, rather than scheduling with offsets, its much easir we run them every day, and check the odd/even/weekend condition in the event itself
  sprinklersOddDays : { label:'Odd days @ 6:30AM', icon:'clock', descr:'Run this sprinkler program on odd days at 6:30AM', nextSchedule:function(node) { return exports.timeoutOffset(6,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==1) sendMessageToNode({nodeId:node._id, action:'PRG 2:300 3:300 1:300 4:300 5:300' /*runs stations 1-5 (300sec each))*/}); } },
  sprinklersEvenDays : { label:'Even days @ 6:30AM', icon:'clock', descr:'Run this sprinkler program on even days at 6:30AM', nextSchedule:function(node) { return exports.timeoutOffset(6,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==0) sendMessageToNode({nodeId:node._id, action:'PRG 2:300 3:300 1:300 4:300 5:300' /*runs stations 1-5 (300sec each)*/}); } },
  sprinklersWeekends : { label:'Weekends @ 6:30AM)', icon:'clock', descr:'Run this sprinkler program on weekend days at 6:30AM', nextSchedule:function(node) { return exports.timeoutOffset(6,30); }, scheduledExecute:function(node) { if ([0,6].indexOf(new Date().getDay())>-1 /*Saturday=6,Sunday=0,*/) sendMessageToNode({nodeId:node._id, action:'PRG 2:180 3:180 1:180 4:180 5:180' /*runs stations 1-5 (180sec each)*/}); } },

  //thermostat poll event
  thermostatPoll : { label:'Thermostat status poll', icon:'fa-heartbeat', descr:'Poll thermostat status (HTTP GET)',
    nextSchedule:function(node) { return 30000; },
    scheduledExecute:function(node) {
      exports.tstatPoll(node._id);
    }},
  //END thermostat poll event
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
exports.motes = {
  DoorBellMote: {
    label  : 'DoorBell',
    icon   : 'icon_doorbell.png',
    controls : { ring : { states: [{ label:'Ring it!', action:'RING', icon:'audio' }]},
                 status :  { states: [{ label:'Disabled', action:'BELL:1', css:'background-color:#FF9B9B;', icon:'fa-bell-slash', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OFF'; }},
                                      { label:'Enabled',  action:'BELL:0', css:'background-color:#9BFFBE;color:#000000', icon:'fa-bell', condition:''+function(node) { return node.metrics['Status']==null || node.metrics['Status'].value == 'ON'; }}]},
    },
  },

  GarageMote : {
    label   : 'Garage Opener',
    icon : 'icon_garage.png',
    controls : { refresh : { states: [{ label:'Refresh', action:'STS', icon:'refresh' }]},
                 opencls : { states: [{ label:'Open!', action:'OPN', icon:'arrow-u', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['Status'].value == 'CLOSED';}},
                                      { label:'Opening..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status'].value == 'OPENING';}},
                                      { label:'Close!', action:'CLS', icon:'arrow-d', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['Status'].value == 'OPEN';}},
                                      { label:'Closing..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status'].value == 'CLOSING';}}]
                           }
              }
  },
  MotionMote: {
    label  : 'Motion Sensor',
    icon   : 'icon_motion.png',
  },
  Mailbox: {
    label   : 'Mailbox',
    icon : 'icon_mailbox.png',
  },
  SwitchMote: {
    label   : 'Light Switch',
    icon : 'icon_switchmote.png',
    controls : { B0 : { states: [{ label:'B0 (off)', action:'BTN0:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B0'].value == 'OFF'; }},  //http://api.jquerymobile.com/icons/
                                { label:'B0 (on)',  action:'BTN0:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B0'].value == 'ON'; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B0', Object.keys(node.metrics))>-1);}},
                B1 : { states: [{ label:'Off', action:'BTN1:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B1'].value == 'OFF'; }},
                                { label:'On',  action:'BTN1:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B1'].value == 'ON'; }}]},
                B2 : { states: [{ label:'B2 (off)', action:'BTN2:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B2'].value == 'OFF'; }},
                                { label:'B2 (on)',  action:'BTN2:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B2'].value == 'ON'; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B2', Object.keys(node.metrics))>-1);}},
               },
  },
  SonarMote: {
    label  : 'Distance Sensor',
    icon   : 'icon_sonar.png',
  },
  SprinklerMote: {
    label  : 'Sprinkler Controller',
    icon   : 'icon_sprinklers.png',
    controls : {
      Z1 : { states: [{ label:'1', action:'ON:1', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '1'; }},
                      { label:'1', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '1'; }}]},
      Z2 : { states: [{ label:'2', action:'ON:2', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '2'; }},
                      { label:'2', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '2'; }}]},
      Z3 : { states: [{ label:'3', action:'ON:3', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '3'; }},
                      { label:'3', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '3'; }}]},
      Z4 : { states: [{ label:'4', action:'ON:4', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '4'; }},
                      { label:'4', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '4'; }}]},
      Z5 : { states: [{ label:'5', action:'ON:5', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '5'; }},
                      { label:'5', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '5'; }}]},
      Z6 : { states: [{ label:'6', action:'ON:6', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '6'; }},
                      { label:'6', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '6'; }}]},
      Z7 : { states: [{ label:'7', action:'ON:7', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '7'; }},
                      { label:'7', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '7'; }}]},
      Z8 : { states: [{ label:'8', action:'ON:8', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '8'; }},
                      { label:'8', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '8'; }}]},
      Z9 : { states: [{ label:'9', action:'ON:9', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['ZONE'].value != '9'; }},
                      { label:'9', action:'OFF', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['ZONE'].value == '9'; }}], breakAfter:true},
      MN : { states: [{ label:'Run z1-5 3min', action:'PRG 1:180 2:180 3:180 4:180 5:180'}]},
    },
  },
  WeatherMote: {
    label  : 'Weather Sensor',
    icon   : 'icon_weather.png',
  },

  WaterMeter: {
    label  : 'Water Meter',
    icon   : 'icon_watermeter.png',
  },

  RadioThermostat: { //for Radio Thermostat CT50
    label  : 'Thermostat (WiFi)',
    icon   : 'icon_thermostat.png',
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
                          condition:''+function(node) { return node.metrics['MODE'].value == 'COOL'; }
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
                          condition:''+function(node) { return node.metrics['MODE'].value != 'COOL'; }
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
                          condition:''+function(node) { return node.metrics['MODE'].value == 'HEAT'; }
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
                          condition:''+function(node) { return node.metrics['MODE'].value != 'HEAT'; }
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
                          condition:''+function(node) { return node.metrics['MODE'].value == 'AUTO'; }
                        },
                        { label:'Auto', action:'', icon:'fa-balance-scale',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='AUTO') return;
                            exports.tstatRequest({ 'tmode':3 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE'].value != 'AUTO'; }
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
                          condition:''+function(node) { return node.metrics['MODE'].value == 'OFF'; }
                        },
                        { label:'Off', action:'', icon:'fa-power-off',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='OFF') return;
                            exports.tstatRequest({ 'tmode':0 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE'].value != 'OFF'; }
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
                          condition:''+function(node) { return node.metrics['FSTATE'].value == 'AUTO'; }
                        },
                        { label:'Turn fan AUTO', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var fanNow='';
                            if (node.metrics['FSTATE']) fanNow = node.metrics['FSTATE'].value;
                            if (fanNow != 'AUTO' && fanNow != 'ON') return;
                            var thejson = (fanNow == 'AUTO' ? { 'fmode':2 } : { 'fmode':0 }); //toggle between ON and AUTO
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['FSTATE'].value == 'ON'; }
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
                          condition:''+function(node) { return node.metrics['HOLD'].value == 'OFF'; }
                        },
                        { label:'HOLD', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var holdNow='';
                            if (node.metrics['HOLD']) holdNow = node.metrics['HOLD'].value;
                            if (holdNow != 'ON' && holdNow != 'OFF') return;
                            var thejson = (holdNow == 'OFF' ? { 'hold':1 } : { 'hold':0 });
                            exports.tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['HOLD'].value == 'ON'; }
                        }],
             },
    },
  }
}

// ******************************************************************************************************************************************
//                                            GENERAL HELPER FUNCTIONS
// ******************************************************************************************************************************************
exports.ONEDAY = 86400000;
exports.isNumeric =  function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n); //http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric/1830844#1830844
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
};

//calculates the milliseconds timeout remaining until a given time of the day (if it's 8AM now and time given was 3AM, it will calculate to the next day 3AM)
//offset can be used to add more time to the calculated timeout, for instance to delay by one day: pass offset=86400000
exports.timeoutOffset = function(hour, minute, second, millisecond, offset) {
  var result = new Date().setHours(hour,minute,second || 0, millisecond || 0);
  result = result < new Date().getTime() ? (result + exports.ONEDAY) : result;
  result -= new Date().getTime();
  if (exports.isNumeric(offset)) result += offset;
  return result;
};

// ******************************************************************************************************************************************
//                                            RADIO THERMOSTAT SPECIFIC HELPER FUNCTIONS
// ******************************************************************************************************************************************
// *** these are implemented for Radio Thermostat CT50
// ******************************************************************************************************************************************
//this function sends an HTTP GET request to the thermostat to refresh metrics like current temperature, target temp, mode (heat/cool), hold etc.
exports.tstatPoll = function(nodeId) {
  request('http://'+settings.radiothermostat.ip+'/tstat', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      var target = info.t_cool || info.t_heat || undefined;
      var fakeSerialMsg = '['+nodeId+'] '+'F:'+(info.temp*100) + (target ? ' TARGET:'+target : '') + ' HOLD:'+(info.hold==1?'ON':'OFF')+' TSTATE:'+(info.tstate==0?'OFF':(info.tstate==1?'HEATING':'COOLING'))+' FSTATE:'+(info.fstate==0?'AUTO':(info.fstate==1?'ON':'AUTOCIRC'))+' MODE:'+(info.tmode==3?'AUTO':(info.tmode==2?'COOL':(info.tmode==1?'HEAT':'OFF')));
      processSerialData(fakeSerialMsg);
      io.sockets.emit('LOG', fakeSerialMsg);
    }
    else io.sockets.emit('LOG', 'THERMOSTAT STATUS GET FAIL:' + error);
  });
}

//this function sends an HTTP POST request to the thermostat (usually to change temperature/mode etc).
exports.tstatRequest = function(thejson, nodeId) {
  //console.log('tstatRequest:' + JSON.stringify(thejson));
  request.post({ url:'http://'+settings.radiothermostat.ip+'/tstat', json: thejson},
                function(error,response,body){
                  //console.log('BODY: ' + JSON.stringify(body));
                  if (error) console.log('ERROR in tstatRequest(): ' + JSON.stringify(thejson) + ' nodeId:' + nodeId + ' - ' + error);
                  else exports.tstatPoll(nodeId); //now ask for a refresh of status from thermostat (HTTP GET)
                }
  );
}
// ******************************************************************************************************************************************
//                                            END RADIO THERMOSTAT SPECIFIC HELPER FUNCTIONS
// ******************************************************************************************************************************************
