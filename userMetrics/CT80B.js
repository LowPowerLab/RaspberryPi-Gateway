/////////////////////////////////////////////////////
/// R A D I O  T H E R M O S T A T  -  C T 8 0 B  ///
/////////////////////////////////////////////////////

var request = require('request');

// These definitions will extend/override those which are already defined in main metrics.js

exports.timeoutOffset = require('../metrics.js').timeoutOffset;
exports.futureDateOffset = require('../metrics.js').futureDateOffset;

////////////////////////////////////
/// C T 8 0 B  -  M e t r i c s  ///
////////////////////////////////////
exports.metrics = {

   //  Base metrics taken from default metrics.js file 
   TEMP : { name:'TEMP',    regexp:/TEMP\:([-\d\.]+)/i, value:'', unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 } }}

};

/////////////////////////////////////////
/// C T 8 0 B  -  D e f i n i t i o n ///
/////////////////////////////////////////
exports.motes = {

  RadioThermostat: { //for Radio Thermostat CT80B
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
      COOL74 : { states: [{ label:'Cool:74°', action:'', icon:'fa-ge',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow == 74 && modeNow=='COOL') return;
                              var thejson = { 'tmode':2, 't_cool':74, 'hold':1 };
                              exports.tstatRequest(thejson, node._id);
                            },
                         }],
               },
      HEAT69 : { states: [{ label:'Heat:69°', action:'', icon:'fa-fire',
                            serverExecute:function(node){
                              var targetNow=0, modeNow='';
                              if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                              if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
                              if (targetNow == 69 && modeNow=='HEAT') return;
                              var thejson = { 'tmode':1, 't_heat':69, 'hold':1 };
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
  } // RadioThermostat
} // exports.motes

//////////////////////////////////
/// C T 8 0 B  -  E v e n t s  ///
//////////////////////////////////
exports.events = {

  //thermostat poll event
  thermostatPoll : { label:'Thermostat status poll', icon:'fa-heartbeat', descr:'Poll thermostat status (HTTP GET)',
    nextSchedule:function(node) {
	return 30000;
    },
    scheduledExecute:function(node) {
      exports.tstatPoll(node._id);
      exports.tstatHPoll(node._id);
    }},

  thermostat_H68_AM : { label:'Thermostat heat 68° @ 8AM weekdays', icon:'clock', descr:'Request heat point of 68° weekdays at 8am',
    nextSchedule:function(node) {
        return exports.timeoutOffset(8,0);
    }, //ie 8:00 (8am)
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
    nextSchedule:function(node) {
        return exports.timeoutOffset(16,0); //ie 16:00 (4pm)
    },
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
//         RADIO THERMOSTAT CT80B-SPECIFIC HELPER FUNCTIONS
// ******************************************************************************************************************************************

//
// this function sends an HTTP GET request to the thermostat to refresh metrics like current temperature, target temp, mode (heat/cool), hold etc.
//
exports.tstatPoll = function(nodeId) {
  var requestJson = 'http://'+settings.radiothermostat.ip.value+'/tstat';
  request(requestJson, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      var target = info.t_cool || info.t_heat || undefined;
      var fakeSerialMsg = '['+nodeId+'] '+' TEMP:'+(info.temp) + (target ? ' TARGET:'+target : '') + ' HOLD:'+(info.hold==1?'ON':'OFF')+' TSTATE:'+(info.tstate==0?'OFF':(info.tstate==1?'HEATING':'COOLING'))+' FSTATE:'+(info.fstate==0?'AUTO':(info.fstate==1?'ON':'AUTOCIRC'))+' MODE:'+(info.tmode==3?'AUTO':(info.tmode==2?'COOL':(info.tmode==1?'HEAT':'OFF')));
      processSerialData(fakeSerialMsg);
      io.sockets.emit('LOG', fakeSerialMsg);
    }
    else io.sockets.emit('LOG', 'THERMOSTAT STATUS GET FAIL for request \''+requestJson+'\':' + error);
  });
}

//
// This function periodically polls the CT80B for humidity values which are not in the response for the standard "tstat" resource
//
exports.tstatHPoll = function(nodeId) {
  var requestJson = 'http://'+settings.radiothermostat.ip.value+'/tstat/humidity';
  request(requestJson, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      var fakeSerialMsg = '['+nodeId+'] '+' H:'+(info.humidity);
      processSerialData(fakeSerialMsg);
      io.sockets.emit('LOG', fakeSerialMsg);
    }
    else io.sockets.emit('LOG', 'THERMOSTAT HUMIDITY GET FAIL for request \''+requestJson+'\':' + error);
  });
}

//this function sends an HTTP POST request to the thermostat (usually to change temperature/mode etc).
exports.tstatRequest = function(thejson, nodeId) {
  //console.log('tstatRequest:' + JSON.stringify(thejson));
  request.post({ url:'http://'+settings.radiothermostat.ip.value+'/tstat', json: thejson},
                function(error,response,body){
                  //console.log('BODY: ' + JSON.stringify(body));
                  if (error) console.log('ERROR in tstatRequest(): ' + JSON.stringify(thejson) + ' nodeId:' + nodeId + ' - ' + error);
                  else exports.tstatPoll(nodeId); //now ask for a refresh of status from thermostat (HTTP GET)
                }
  );
}
