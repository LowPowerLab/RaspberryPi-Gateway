//This sample metric will override that which is already defined in main metrics.js
//You can redefine defaults or write your own new custom metrics in 1 or more files in this folder, separate them as you'd like - they all get merged together when the app loads

//you will have to import any used functions from metrics.js this way:
exports.timeoutOffset = require('../metrics.js').timeoutOffset;
exports.futureDateOffset = require('../metrics.js').futureDateOffset;

exports.metrics = {
  V:
  {
    name: 'V',
    regexp: /\b(?:V?BAT|VOLTS|V)\:([\d\.]+)v?\b/i,
    value: '',
    duplicateInterval: 3600,
    unit: 'v',
    graph: 1,
    graphOptions:
    {
      legendLbl: 'VOLTZ!',
      lines:
      {
        fill: true,
        lineWidth: 1
      },
      yaxis:
      {
        min: 0,
        autoscaleMargin: 0.25
      }
    }
  },
  H:
  {
    name: 'H',
    regexp: /\bH\:([\d\.]+)\b/i,
    value: '',
    duplicateInterval: 3600,
    unit: '%',
    pin: 1,
    graph: 1,
    graphOptions:
    {
      legendLbl: 'Humidity',
      lines:
      {
        lineWidth: 1
      },
      yaxis:
      {
        autoscaleMargin: 0.25
      },
      series:
      {
        curvedLines:
        {
          active: true,
          apply: true,
          //monotonicFit: true, //makes the curve tight to datapoints
          //nrSplinePoints: 5 //number of sample points (of the spline) in between two consecutive points (more = smoother)
        }
      }
    }
  }
};

//example of overriding an event
exports.events = {
  sprinklersOddDays : { label:'Odd days Z1-9 @3AM', icon:'clock', descr:'Run Zones 1-9, odd days @3AM', nextSchedule:function(node) { return exports.timeoutOffset(3,0); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==1) sendMessageToNode({nodeId:node._id, action:'PRG 1:400 2:400 3:400 4:300 5:400 6:400 7:400 8:300 9:150' /*runs stations 1-5 (300sec each))*/}); } },
};

//example of defining a property to use anywhere in the app/events or in other custom functions
exports.ONEDAYHOURS = 24;

//example of defining a general purpose function to use in the app/events or in other custom functions
exports.secondsInOneDay = function() {
  var result = exports.ONEDAYHOURS * 3600;
  return result;
};