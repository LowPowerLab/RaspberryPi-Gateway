// This sample METRICS MODULE defines some metrics, events and mote templates which will override any previously
//   loaded MODULE (either the core.js MODULE which is loaded FIRST, or other MODULES loaded prior to it)
// You can redefine default metrics/events/mote templates or write your own new custom ones in 1 or more files
//   in the 'metrics' folder or use subfolders to separate them as illustrated with the LowPowerLab folder.
//   They all get merged together when the app loads, first the core.js, then all other files in the 'metrics' folder,
//   then all files within subfolders (all alphabetical case insensitive order - both files and folders).

// GLOBAL functions and variables can be defined in this MODULE by prefixing them with 'exports.varOrFunctionName'.
//   Once this MODULE is loaded any functions/variables prefixed with 'exports.' will be injected into the global object
//   and are then available be invoked across ALL MODULES events/functions.
// You may define local-use-only variables and functions the usual way - use 'var/const/let variableName' or 'function functionName(..){..}'

//example GLOBAL variable to use anywhere in the entire application as soon as this MODULE is loaded in main app
exports.ONEDAYHOURS = 24;

//example GLOBAL helper function to use anywhere in the entire application as soon as this module is loaded in main app
exports.secondsInOneDay = function() {
  var result = ONEDAYHOURS * 3600;
  return result;
};

exports.metrics = {
  //Power monitoring metrics
  VRMS : { name:'VRMS', regexp:/VRMS\:([\d\.]+)(?:V)?/i, value:'', unit:'V', },
  IRMS : { name:'IRMS', regexp:/IRMS\:([\d\.]+)(?:A)?/i, value:'', unit:'A', },
  WATT : { name:'W', regexp:/W\:([\d\.]+)(?:W)/i, value:'', unit:'W', pin:1, },

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
        autoscaleMargin: 0.1,
        autoscaleBottom: false,
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
          //active: true,
          //apply: true,
          //monotonicFit: true, //makes the curve tight to datapoints
          //nrSplinePoints: 5 //number of sample points (of the spline) in between two consecutive points (more = smoother)
        }
      }
    }
  }
};

//example of overriding a mote template
exports.motes = {
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
      MX : { states: [{ label:'Run Z1-8 10min', action:'PRG 1:600 2:600 3:600 4:600 5:600 5:600 6:600 7:600 8:600'}]},
      M67 : { states: [{ label:'Run Z6-7 200s', action:'PRG 6:200 7:200'}]},
    },
  },
}

//example of overriding an event
exports.events = {
  sprinklersEvenDays : { label:'Even days Z1-9 @730AM', icon:'clock', descr:'Run Zones 1-9, even days @7:30AM', nextSchedule:function(node) { return timeoutOffset(7,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==0) sendMessageToNode({nodeId:node._id, action:'PRG 1:400 2:400 3:400 4:300 5:400 6:400 7:400 8:300 9:150' /*runs stations 1-5*/}); } },
  sprinklers6and7_8am : { label:'Sprinklers Z6-7 200s 8am daily', icon:'clock', descr:'Run Z6-7 200s @ 8am', nextSchedule:function(node) { return timeoutOffset(8,00); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'PRG 6:200 7:200' /*runs stations 6-7 (200sec each, daily))*/}); } },
  sprinklers6and7_3pm : { label:'Sprinklers Z6-7 200s 3pm daily', icon:'clock', descr:'Run Z6-7 200s @ 3am', nextSchedule:function(node) { return timeoutOffset(15,00); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'PRG 6:200 7:200' /*runs stations 6-7 (200sec each, daily))*/}); } },
  motionLightON27 : { label:'Motion: SM27 ON!', icon:'action', descr:'Turn SwitchMote:27 ON when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendMessageToNode({nodeId:27, action:'MOT:1'}); }; } },
};