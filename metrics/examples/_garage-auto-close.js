//Example garage poll event that runs every 5 minutes.
//Based on forum user ssmall's garage poll event: https://lowpowerlab.com/forum/pi-gateway/gateway-v8-10-0-released!/msg21026/#msg21026
//It sends a CLOSE message to the GarageMote after 11PM (23:00 hours) and before 6AM (06:00 hours), and only when the door has been in OPEN status more than 10 minutes.
//For safety, it sends UP TO 3x messages between this time frame - in case the GarageMote sensors are not aligned well or malfunction (causing OPEN, CLOSING.., OPEN alternations).

//example of overriding an event
exports.events = {
  garageAutoClose: {
    label:'Garage : Auto-CLOSE between [11PM,6AM]',
    icon:'comment',
    descr:'Auto Close Garage after 11PM',
    nextSchedule: function(nodeAtScheduleTime) { return 300000; }, //runs every 5min
    scheduledExecute: function(nodeAtScheduleTime) {
      var nowDate = new Date(Date.now());
      var nodeUpdated = false;

      if (nodeAtScheduleTime)
      {
        //console.log('GARAGE POLL STATUS Node Id: ' + nodeAtScheduleTime._id + " Status: " + nodeAtScheduleTime.metrics['Status'].value);

        if (nodeAtScheduleTime.metrics['Status'] &&
            nodeAtScheduleTime.metrics['Status'].value == 'OPEN') {

          /* Only automatically close between 11pm and 6am */
          if ((nowDate.getHours() >= 23 || nowDate.getHours() <= 6) && nodeAtScheduleTime.metrics['Status'].closeCount < 3) {

            if (nodeAtScheduleTime.metrics['Status'].openDate == null) {
              nodeAtScheduleTime.metrics['Status'].openDate = nowDate;
              nodeUpdated = true;
            };

            /* Elapsed time in minutes */
            var elapsedTimeMinutes = Math.round(((nowDate - nodeAtScheduleTime.metrics['Status'].openDate)) / (60*1000));
            console.log('GARAGE SHOULD BE CLOSED ' + elapsedTimeMinutes);
            console.log('GARAGE OPEN timestamp: ' + nodeAtScheduleTime.metrics['Status'].openDate);

            /* Close the door if open more than 10 minutes */
            if (elapsedTimeMinutes >= 10) {
              sendMessageToNode({nodeId:nodeAtScheduleTime._id, action:'CLS'});
              nodeAtScheduleTime.metrics['Status'].closeCount++;
              nodeAtScheduleTime.metrics['Status'].openDate = null;
              nodeUpdated = true;
            };

            console.log('Close Count: ' + nodeAtScheduleTime.metrics['Status'].closeCount);
          };
        };

        if (nowDate.getHours() < 23 && nowDate.getHours() > 6 && nodeAtScheduleTime.metrics['Status'].openDate) {
          nodeAtScheduleTime.metrics['Status'].openDate = null;
          nodeUpdated = true;
        };

        /* Reset the close count */
        if ((nowDate.getHours() < 23 && nowDate.getHours() > 6 && nodeAtScheduleTime.metrics['Status'].closeCount > 0) || nodeAtScheduleTime.metrics['Status'].closeCount == null) {
          nodeAtScheduleTime.metrics['Status'].closeCount = 0;
          nodeUpdated = true;
        };

        if (nodeUpdated) {
          nodeAtScheduleTime.modifiedByEvent = true;
          return nodeAtScheduleTime;
        };
      };
    },
  }
}
