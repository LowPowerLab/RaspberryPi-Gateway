// **********************************************************************************
// Websocket server backend for the RaspberryPi-Gateway App
// http://lowpowerlab.com/gateway
// **********************************************************************************
// This is the core metrics/events/mote template file. Each metric defines the token
// matching regular expressions (RegEx) for each possible metric coming from any remote node.
// The specific *mote* definitions that describe behavior of individual motes are defined
// separately in the /LowPowerLab subfolder.
// Examples are given for such motes like the Mailbox Notifier, WeatherMote, MotionMote,
// GarageMote, SwitchMote, Sump Pump distance sensor, Water Meter reader, etc.
// ********************************************************************************************
// (C) Felix Rusu, Low Power Lab LLC (2020), http://lowpowerlab.com/contact
// ********************************************************************************************
var config = require('nconf');
var JSON5 = require('json5');
var suncalc = require('suncalc'); //https://github.com/mourner/suncalc
config.argv().file({ file: require('path').resolve(__dirname, '../settings.json5'), format: JSON5 });
var settings = config.get('settings'); //these are local to avoid runtime errors but in events they will reference the global settings declared in gateway.js

// ******************************************************************************************************************************************
//                                            SAMPLE METRICS DEFINITIONS
// ******************************************************************************************************************************************
// The metrics definitions use [regular expressions] to match an incoming metric token.
// The metrics tokens have a pattern that must be followed:
// - a packet received from a node can contain multiple metrics (ie temperature, humidity, motion etc.)
// - metrics are separated by space (not by comma, or other characters, ex:  "T:42 H:50")
// - each metric that has a name/value pair is defined as NAME:VALUE (metric name, colon, metric value)
// - each metric that simply defines a status can be standalone without a value (ex: "MOTION")
// ******************************************************************************************************************************************
// These metrics definitions consist of a [regular expression] that will be attempted to be matched to any incoming tokens from the gateway (ie. Moteino, MightyHat, etc.) serial port
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
//     - the same node can have any number of metrics (only limited by the packet max length - ex. 61 chars in the RFM69 library, potentially unlimited length if other transceivers are used)
//     - each related metric should have the same name - for instance look at GarageMote - all the regex expressions actually update the same metric specified by name='Status'
//       so when garage goes through different states it will update a single metric called 'Status'
//       Another good example is SwitchMote where we have 6 different metric definitions here but only 3 resultant actual metrics (Button1, Button2 and Button3)
// ******************************************************************************************************************************************
exports.metrics = {
  //special core/generic metrics
  debug : { name:'DEBUG', regexp:/\[(?:DEBUG)\:([^\]]+)\]/i, value:''},
  V : { name:'V', regexp:/\b(?:V?BAT|VOLTS|V)\:([\d\.]+)v?\b/i, value:'', duplicateInterval:3600, unit:'v', graph:1, graphOptions:{ legendLbl:'Voltage', lines: { lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { min: 0, autoscaleMargin: 0.25, autoscaleBottom:false }}},
  RSSI : { name:'RSSI', regexp:/\[?(?:RSSI|SS)\:(-?\d+)[^\s]*\]?/i, value:'', duplicateInterval:3600, unit:'db', graph:1, graphOptions:{ legendLbl:'Signal strength', lines: { lineWidth:1 }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { min:-99, max:-20 }, colors:['#0f0']}},

  //RF Transmit Level (ex: X:31 is max transmit level with RFM69_ATC
  X : { name:'TXLVL', regexp:/\bX\:(\d+)\b/i, value:'', duplicateInterval:3600, graph:1, graphValPrefix:'TX Level ', graphOptions:{ legendLbl:'RFTX Level', lines: { lineWidth:1 }, yaxis: { min:0, max:32 }, colors:['#09c']}},

  START : { name:'START', regexp:/\bSTART\b/i, value:'Started'}, //useful to track when a node comes online  

  //ex: [TYPE:MotionMote] - the value is saved directly into node.type
  TYPE : { name:'TYPE', regexp:/\[?(?:TYPE)\:(\w+)[^\s]*\]?/i, value:''},

  //request metrics                        Grp1     Group2 (the ?: designates non-capturing group)
  //key index must match name property!
  P_TXP  : { name:'P_TXP', regexp:/^\bP_TXP\:(\d+)(?:\:(OK|INV))?$/, isRequest:true, value:'', timeout:7200 }, //timeout in seconds
}

// ******************************************************************************************************************************************
//                                            SAMPLE EVENTS/ALERTS
// ******************************************************************************************************************************************
// define custom actions/events
// IMPORTANT: actions that require comparing time need to run at the server since the client time can be off significantly even if the timezone is the same
//   serverExecute is an action meant to be executed only at the server side (ex sending an email when a condition is met), must be defined as a function
//   Server side execution for events is recommended since you can have multiple clients and you don't want to trigger SMS messages from each one,
//     instead only one SMS message should be sent when an event happens
//   default out-of-box jquery mobile icons are listed here: https://api.jquerymobile.com/icons/
// ******************************************************************************************************************************************
exports.events = {
  // Definitions are moved into individual files as of v9.1.0.
  // This empty core object will be merged with the individual definition files,
  // as the appear alphabetically in the metrics directory (files first, then files in 1 level of subdirectories, all case insensitive order).
}

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
  // Definitions are moved into individual files as of v9.1.0.
  // This empty core object will be merged with the individual MODULE files,
  // as the appear alphabetically in the metrics directory (files first, then files in 1 level of subdirectories, all case insensitive order).
}

// ******************************************************************************************************************************************
//                                    GLOBAL HELPER VARIABLES AND FUNCTIONS
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
}

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
  var now = new Date().getTime();
  //result = result < now ? (result + exports.ONEDAY) : result; //may cause rescheduling errors (dut to time mismatch?): https://lowpowerlab.com/forum/pi-gateway/scheduling-event-error/
  result =  result < now  || (result > now && ( result - now < 5000 )) ? (result + exports.ONEDAY) : result; //caution: not to be used with events with frequency higher than 5s
  result -= now;
  if (exports.isNumeric(offset)) result += offset;
  return result;
}

//calculates the milliseconds timeout remaining until a given date in the future
exports.millisToFutureDate = function(futureDate, failSafe) {
  var now = new Date();
  return (now < futureDate) ? (futureDate-now) : (failSafe || 3000);
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