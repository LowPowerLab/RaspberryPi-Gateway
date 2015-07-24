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
//                                    LICENSE
// ********************************************************************************************
// This source code is released under GPL 3.0 with the following ammendments:
// You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
// - You cannot sell this Software for profit while it was released freely to you by Low Power Lab LLC.
// - You may freely use this Software commercially only if you also release it freely,
//   without selling this Software portion of your system for profit to the end user or entity.
//   If this Software runs on a hardware system that you sell for profit, you must not charge
//   any fees for this Software, either upfront or for retainer/support purposes
// - If you want to resell this Software or a derivative you must get permission from Low Power Lab LLC.
// - You must maintain the attribution and copyright notices in any forks, redistributions and
//   include the provided links back to the original location where this work is published,
//   even if your fork or redistribution was initially an N-th tier fork of this original release.
// - You must release any derivative work under the same terms and license included here.
// - This Software is released without any warranty expressed or implied, and Low Power Lab LLC
//   will accept no liability for your use of the Software (except to the extent such liability
//   cannot be excluded as required by law).
// - Low Power Lab LLC reserves the right to adjust or replace this license with one
//   that is more appropriate at any time without any prior consent.
// Otherwise all other non-conflicting and overlapping terms of the GPL terms below will apply.
// ********************************************************************************************
// This program is free software; you can redistribute it and/or modify it under the terms 
// of the GNU General Public License as published by the Free Software Foundation;
// either version 3 of the License, or (at your option) any later version.                    
//                                                        
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details.
//                                                        
// You should have received a copy of the GNU General Public License along with this program.
// If not license can be viewed at: http://www.gnu.org/licenses/gpl-3.0.txt
//
// Please maintain this license information along with authorship
// and copyright notices in any redistribution of this code
// **********************************************************************************

//Great place to read on Javascript Arrays: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
//Great place to read on Javascript Objects: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects
//Great place to read on Javascript Regular Expressions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
//Great sandbox to test your Regular Expressions: http://regexr.com/
//JqueryMobile generic icons: http://api.jquerymobile.com/icons/
//FLOT graphs customizations: http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html

// ******************************************************************************************************************************************
//                                            SAMPLE EVENTS/ALERTS
// ******************************************************************************************************************************************
// These metrics definitions consist of a regular expression that will be attempted to be matched to any incoming tokens from the gateway Moteino serial port
// If one matches you should see a new node/metric show up in the UI or be updated if previously matched
// Other parameters:
//     - value - this can be hardcoded, or if left blank the value will be the first captured parentheses from the regex expression
//     - pin:1/0 - if '1' then by default this metric will show up in the main homepage view for that node, otherwise it will only show in the node page; it can then manually be flipped in the UI
//     - graph:1/0 - if '1' then by default this metric will be logged in gatewayLog.db every time it comes in
//     - graphValue - you can specify a hardcoded value that should be logged instead of the captured metric (ex for 'MOTION' it's more useful/efficient to log value '1' so we can graph it etc)
//     - graphOptions - this is a javascript object that when presend is injected directly into the FLOT graph for the metric - you can use this to highly customize the appearance of any metric graph
//                    - it should only be specified one per each metric - the first one (ie one for each set of metrics that have multiple entries with same 'name') - ex: GarageMote 'Status' metric
//                    - this object is overlapped over the default 'graphOptions' defined in index.php
//                    - for more details how to customize FLOT graphs see this: http://www.jqueryflottutorial.com/jquery-flot-customizing-data-series-format.html
// Important Notes:
//     - the same node can have any number of metrics
//     - each related metric should have the same name - for instance look at GarageMote - all the regex expressions actually update the same metric specified by name='Status'
//       so when garage goes through different states it will update a single metric called 'Status'
//       Another good example is SwitchMote where we have 6 different metric definitions here but only 3 resultant actual metrics (Button1, Button2 and Button3)
exports.metrics = {
  //GarageMote
  //NOTE the \b word boundary is used to avoid matching "OPENING" (ie OPEN must be followed by word boundary/end of word)
  open : { name:'Status', regexp:/(?:STS\:)?(OPN|OPEN)\b/i, value:'OPEN', pin:1, graph:1, graphValue:2, graphOptions:{ yaxis: {ticks:0}, colors:['#4a0'], /*lines: { lineWidth:1 }*/}},
  opening : { name:'Status', regexp:/(?:STS\:)?(OPNING|OPENING)/i, value:'OPENING..', pin:1, graph:1, graphValue:1 },
  closed : { name:'Status', regexp:/(?:STS\:)?(CLS|CLOSED)/i, value:'CLOSED', pin:1, graph:1, graphValue:0 },
  closing : { name:'Status', regexp:/(?:STS\:)?(CLSING|CLOSING)/i, value:'CLOSING..', pin:1, graph:1, graphValue:1 },
  unknown : { name:'Status', regexp:/(?:STS\:)?(UNK|UNKNOWN)/i, value:'UNKNOWN!', pin:1, graph:1, graphValue:-1 },

  //MotionMote and Mailbox notifier
  motion : { name:'M', regexp:/MOTION/i, value:'MOTION', pin:1, graph:1, graphValue:1, graphOptions:{ lines: { show:false, fill:false }, points: { show: true, radius: 5, lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { ticks: 0 }}},
  lastMotion : { name:'LO', regexp:/(?:LO|LM)\:((?:\d+h)?\d{1,2}m|\d{1,2}s)/i, value:'', pin:1 },
  debug : { name:'DEBUG', regexp:/\[(?:DEBUG)\:([^\]]+)\]/i, value:''},

  //SwitchMote buttons
  SMB0_OFF : { name:'B0', regexp:/BTN0\:0/i, value:'OFF'},
  SMB0_ON  : { name:'B0', regexp:/BTN0\:1/i, value:'ON'},
  SMB1_OFF : { name:'B1', regexp:/(BTN1|SSR|RLY)\:0/i, value:'OFF', pin:1, graph:1, graphValue:0, graphOptions:{ yaxis: {ticks:0}, colors:['#4a0']}},
  SMB1_ON  : { name:'B1', regexp:/(BTN1|SSR|RLY)\:1/i, value:'ON', pin:1, graph:1, graphValue:1, graphOptions: { /* already defined above for 'B1', no need to repeat */ }},
  SMB2_OFF : { name:'B2', regexp:/BTN2\:0/i, value:'OFF'},
  SMB2_ON  : { name:'B2', regexp:/BTN2\:1/i, value:'ON'},

  //Door Bell Mote
  ring : { name:'RING', regexp:/RING/i, value:'RING', pin:1, graph:1, graphValue:1, graphOptions:{ lines: { show:false, fill:false }, points: { show: true, radius: 5,  lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#a40']}}, yaxis: { ticks: 0 }}},
  BELL_DISABLED : { name:'Status', regexp:/BELL\:0/i, value:'OFF'},
  BELL_ENABLED  : { name:'Status', regexp:/BELL\:1/i, value:'ON'},
  START         : { name:'START', regexp:/START/i, value:'Started'},
  
  //WeatherShield metrics
  F : { name:'F', regexp:/F\:(-?\d+\.\d+)/i, value:'', unit:'°', pin:1 },
  FH : { name:'F', regexp:/F\:(-?\d+)/i, value:'', valuation:function(value) {return value/100;}, unit:'°', pin:1, graph:1 },
  C : { name:'C', regexp:/C\:([-\d\.]+)/i, value:'', unit:'°', pin:1, },
  H : { name:'H', regexp:/H\:([\d\.]+)/i, value:'', unit:'%', pin:1, graph:1 },
  P : { name:'P', regexp:/P\:([\d\.]+)/i, value:'', unit:'"', pin:1, },

  //SonarMote
  sonar : { name:'CM', regexp:/([\d\.]+)cm?/i, value:'', unit:'cm', pin:1, graph:1, graphOptions: { lines: { lineWidth:1 }, colors:['#09c']} },

  //WattMote
  VRMS : { name:'VRMS', regexp:/VRMS\:([\d\.]+)(?:V)?/i, value:'', unit:'V', },
  IRMS : { name:'IRMS', regexp:/IRMS\:([\d\.]+)(?:A)?/i, value:'', unit:'A', },
  WATT : { name:'W', regexp:/W\:([\d\.]+)(?:W)/i, value:'', unit:'W', pin:1, },

  //WaterMote
  GPM : { name:'GPM', regexp:/GPM\:([\d\.]+)/i, value:'', unit:'gpm', graph:1, graphOptions : { lines: { lineWidth:1 }, colors:['#09c'], /*yaxis: { ticks: [1,5,20], transform:  function(v) {return v==0?v:Math.log(v); //log scale },*/ tickDecimals: 2 } },
  GLM : { name:'GLM', regexp:/GLM\:([\d\.]+)/i, value:'', unit:'glm', },
  GAL : { name:'GAL', regexp:/GAL\:([\d\.]+)/i, value:'', unit:'gal', pin:1, },
    
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
  switchMoteON_PM : { label:'SwitchMote ON at 9PM!', icon:'clock', descr:'Turn this switch ON at 9PM sharp every day', nextSchedule:function(node) { return exports.timeoutOffset(21,15); /*run at 9:15PM*/ }, scheduledExecute:function(node) { if (node.metrics['B1'] && node.metrics['B1'].value == 'OFF') { sendMessageToNode({nodeId:node._id, action:'BTN1:1'}); }; } },
  switchMoteOFF_AM : { label:'SwitchMote OFF at 6:30AM!', icon:'clock', descr:'Turn this switch OFF at 6:30AM every day', nextSchedule:function(node) { return exports.timeoutOffset(6,00); /*run at 6:00AM */ }, scheduledExecute:function(node) { if (node.metrics['B1'] && node.metrics['B1'].value == 'ON') { sendMessageToNode({nodeId:node._id, action:'BTN1:0'}); }; } },
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
exports.motes = {
  DoorBellMote: {
    label  : 'DoorBell',
    icon   : 'icon_doorbell.png',
    controls : { ring : { states: [{ label:'Ring it!', action:'RING', icon:'audio' }]},
                 status :  { states: [{ label:'Disabled', action:'BELL:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OFF'; }},
                                      { label:'Enabled',  action:'BELL:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['Status']==null || node.metrics['Status'].value == 'ON'; }}]},
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
                                { label:'B0 (on)',  action:'BTN0:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(state) { return node.metrics['B0'].value == 'ON'; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B0', Object.keys(node.metrics))>-1);}},
                B1 : { states: [{ label:'Off', action:'BTN1:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B1'].value == 'OFF'; }},
                                { label:'On',  action:'BTN1:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B1'].value == 'ON'; }}]},
                B2 : { states: [{ label:'B2 (off)', action:'BTN2:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B2'].value == 'OFF'; }},
                                { label:'B2 (on)',  action:'BTN2:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(state) { return node.metrics['B2'].value == 'ON'; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B2', Object.keys(node.metrics))>-1);}},
               },
  },
  SonarMote: {
    label  : 'Distance Sensor',
    icon   : 'icon_sonar.png',
  },
  WeatherMote: {
    label  : 'Weather Sensor',
    icon   : 'icon_weather.png',
  },
};

// ******************************************************************************************************************************************
//                                            HELPER FUNCTIONS
// ******************************************************************************************************************************************
exports.isNumeric =  function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n); //http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric/1830844#1830844
}

//extracts the value of a given metric based on the regular expression and any valuation function defined for that metric
exports.determineValue = function(matchingMetric, matchingToken) {
  var actualValueToProcess = matchingToken[1] || matchingToken[0];
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
  result = result < new Date().getTime() ? (result + 86400000) : result;
  result -= new Date().getTime();
  if (exports.isNumeric(offset)) result += offset;
  return result;
};