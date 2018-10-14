//////////////////////////////////
/// GarageMote - customization ///
//////////////////////////////////

//This metric will override the events for the GarageMote which is already defined in main metrics.js

//you will have to import any used functions from metrics.js this way:
exports.timeoutOffset = require('../metrics.js').timeoutOffset;
exports.futureDateOffset = require('../metrics.js').futureDateOffset;

exports.metrics = {
	// Use the standard GarageMote metrics
};

var garageOpenDate = null;
var garageOpenNotified = null;
var poolOnDate = null;
var poolOnNotified = null;

//example of overriding a mote
exports.motes = {
	// Use the standard GarageMote definition
}

//example of overriding an event
exports.events = {

  garageClose : {
    label:'Garage : Night auto close',
    icon:'clock',
    descr:'Automatically close garage door after being open for 30 mins (between 10PM and 6AM)',
    nextSchedule:function(node) {
      return 30000; // Check every 30 seconds
    },
    scheduledExecute:function(nodeAtScheduleTime) {
        db.findOne({ _id : nodeAtScheduleTime._id }, function (err, nodeRightNow) {
        if (nodeRightNow) { 
           /* emit a log the status to client(s)*/
           io.sockets.emit('LOG', 'GARAGE POLL STATUS: ' + nodeRightNow.metrics['Status'].value );

           if ( nodeRightNow.metrics['Status'] && nodeRightNow.metrics['Status'].value == 'OPEN' ) {

             var nowDate = new Date(Date.now());

             if ( garageOpenDate == null ) {
               garageOpenDate     = nowDate;
               garageOpenNotified = false;
             };
             io.sockets.emit('LOG', 'GARAGE LAST OPENED: ' + garageOpenDate.toString());

             if (nowDate.getHours() > 21 || nowDate.getHours() < 6) {
               // Garage has been open since before curfew.  Start countdown from curfew.
               if (garageOpenDate.getHours() <= 21) {
                   garageOpenDate.setHours(22);
                   garageOpenDate.setMinutes(00);
               }

               var openMillis      = (nowDate.getTime() - garageOpenDate.getTime());
               var openMinutes     = Math.floor(openMillis / 1000 / 60 * 10) / 10;
               var closeMinutes    = 30;
               var closeDate       = new Date(garageOpenDate.getTime()+(closeMinutes*60*1000));
               var secsRemaining   = (closeDate.getTime()-nowDate.getTime())/1000;
               var minsRemaining   = secsRemaining / 60;

               // minsRemaining may be negative if the garage has been open for a while before curfew begins - don't report in this case
               if (minsRemaining >= 0) {
                   io.sockets.emit('LOG', 'GARAGE DOOR WILL AUTO-CLOSE IN ' + Math.round(minsRemaining) + ' minutes ');

                   if (!garageOpenNotified && (openMinutes >= 5)) {
                      sendSMS('Garage event', 'Garage is open after hours. It will be automatically closed at ' + dateFormat(closeDate, 'h:MM TT'));
                      garageOpenNotified = true;
                   };
               }

               if (openMinutes >= closeMinutes) {
                  io.sockets.emit('LOG', 'GARAGE DOOR HAS BEEN OPEN FOR ' + openMinutes + ' MINUTES. NOW CLOSING...');
                  sendMessageToNode({nodeId:nodeRightNow._id, action:'CLS'});
                  sendSMS('Garage event', 'Garage has been automatically closed.');
               };
             };
           };
           if ( nodeRightNow.metrics['Status'] && nodeRightNow.metrics['Status'].value == 'CLOSED' ) {
             garageOpenDate = null;
           };
        }; // if nodeRightNow
      }); // db.findOne
    } // scheduledExecute
  } // garageClose
}; // exports.events

//example of defining a property to use anywhere in the app/events or in other custom functions
exports.ONEDAYHOURS = 24;

//example of defining a general purpose function to use in the app/events or in other custom functions
exports.secondsInOneDay = function() {
  var result = exports.ONEDAYHOURS * 3600;
  return result;
};

