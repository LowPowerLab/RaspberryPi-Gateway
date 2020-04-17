//Example speedTest.net polling definitions for the node type, the metrics involved, and the polling event itself
//Requires the "speedtest-net" npm package (included in latest package.json)

exports.metrics = {
  PINGISP : { name:'PINGISP', regexp:/PINGISP\:([\d\.]+)/i, value:'', unit:'ms', pin:1, graph:1, graphOptions: { legendLbl:'Ping ms', lines: { lineWidth:1 }, yaxis: { min:1, max:200 }} },
  DOWNSPEED : { name:'DOWNSPEED', regexp:/DOWNSPEED\:([\d\.]+)/i, value:'', unit:'ꜜ', graphValSuffix:'Mbps', pin:1, graph:1, graphOptions : { legendLbl:'Mb/s', lines: { lineWidth:1 }, colors:['#09c']} },
  UPSPEED : { name:'UPSPEED', regexp:/UPSPEED\:([\d\.]+)/i, value:'', unit:'ꜛ', graphValSuffix:'Mbps', pin:1, graph:1, graphOptions: { legendLbl:'Mb/s', lines: { lineWidth:1 }, colors:['#0f0']} },
}

//example of overriding a mote
exports.motes = {
  SpeedTest: {
    label  : 'Internet Speed Test',
    icon   : 'icon_speedTest.png',
  },
}

exports.events = {
  speedTestPoll: {
    label:'Internet : Speed Test Poll',
    icon:'fa-heartbeat', //tons of awesome icons at https://fontawesome.com/
    descr:'Poll Internet Speed via speedtest-net package',
    nextSchedule: function(nodeAtScheduleTime) { return 300000; }, //runs every 5min
    scheduledExecute: function(nodeAtScheduleTime) {
      db.findOne({ _id : nodeAtScheduleTime._id }, function (err, nodeRightNow) {
        if (nodeRightNow)
        {
          var speedTest = require('speedtest-net');
          var test = speedTest({maxTime: 5000}); //5 second test

          test.on('data', data => {
            var downspeed=data.speeds.download.toFixed(1); //1 decimal is enough
            var upspeed=data.speeds.upload.toFixed(1); //1 decimal is enough
            var ping = parseInt(data.server.ping); //no decimals
            var fakeSerialMsg = '['+nodeRightNow._id+']'+' PINGISP:'+ping+' DOWNSPEED:'+downspeed+' UPSPEED:'+upspeed;
            processSerialData(fakeSerialMsg, true);
          });

          test.on('error', err => { console.error('SPEEDTEST-NET FAILED: ' + err.toString()); });
        }
      });
    },
  }
}