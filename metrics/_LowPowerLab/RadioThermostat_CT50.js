//RadioThermostat-CT50 - sold under various other branding
// A wifi thermostat that has an open API which we can make HTTP resquests to poll for status and change temperature/modes etc.
const http = require('http');

// ******************************************************************************************************************************************
//                                            RADIO THERMOSTAT SPECIFIC HELPER FUNCTIONS 
// ******************************************************************************************************************************************
// *** these are implemented for Radio Thermostat model CT50
// ******************************************************************************************************************************************
//this function sends an HTTP GET request to the thermostat to refresh metrics like current temperature, target temp, mode (heat/cool), hold etc.
function tstatPoll(nodeId) {
  db.findOne({ _id : nodeId }, function (err, dbNode) {
    var thermostatIP = dbNode.settings && dbNode.settings.ip ? dbNode.settings.ip : settings.radiothermostat.ip.value;
    var requestURL = 'http://'+thermostatIP+'/tstat';
    http.get(requestURL, (res) => {
      const { statusCode } = res;
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          var info = JSON.parse(data);
          if (info.temp > 0 && statusCode == 200) {
            var target = info.t_cool || info.t_heat || undefined;
            var fakeSerialMsg = '['+nodeId+'] '+'F:'+(info.temp*100) + (target ? ' TARGET:'+target : '') + ' HOLD:'+(info.hold==1?'ON':'OFF')+' TSTATE:'+(info.tstate==0?'OFF':(info.tstate==1?'HEATING':'COOLING'))+' FSTATE:'+(info.fstate==0?'AUTO':(info.fstate==1?'ON':'AUTOCIRC'))+' MODE:'+(info.tmode==3?'AUTO':(info.tmode==2?'COOL':(info.tmode==1?'HEAT':'OFF')));
            processSerialData(fakeSerialMsg, true);
            //io.sockets.emit('LOG', fakeSerialMsg);
          } else console.error(`BAD DATA returned in tstatPoll: ${body}`);
        } catch (e) {
          console.error(e.message);
        }
      });
    }).on("error", (e) => {
      io.sockets.emit('LOG', 'THERMOSTAT STATUS GET FAIL for request \''+requestURL+'\':' + e.message);
    });
  });
}

//this function sends an HTTP POST request to the thermostat (usually to change temperature/mode etc).
function tstatRequest(thejson, nodeId) {
  //console.log(`tstatRequest from nodeid-${nodeId}: ${JSON.stringify(thejson)}`);
  db.findOne({ _id : nodeId }, function (err, dbNode) {
    var thermostatIP = dbNode.settings && dbNode.settings.ip ? dbNode.settings.ip : settings.radiothermostat.ip.value;
    const postData = JSON.stringify(thejson);
    const options = {
      hostname: thermostatIP, port: 80, path: '/tstat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = http.request(options, (res) => {
      //console.log(`STATUS: ${res.statusCode}`);
      //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => { /*console.log(`BODY: ${chunk}`);*/ });
      res.on('end', () => { tstatPoll(nodeId); });
    });
    req.on('error', (e) => { console.log(`ERROR in tstatRequest(): ${JSON.stringify(thejson)} nodeId:${nodeId} - ${e.message}`); });
    req.write(postData);
    req.end();
  });
}

exports.metrics = {
  HOLD : { name:'HOLD', regexp:/HOLD\:(ON|OFF)/i, value:''},
  MODE : { name:'MODE', regexp:/MODE\:(COOL|HEAT|AUTO|OFF)/i, value:''},
  TARGET : { name:'TARGET', regexp:/TARGET\:([-\d\.]+)/i, value:'', unit:'°'},
  TSTATE : { name:'TSTATE', regexp:/TSTATE\:(COOLING|HEATING|OFF)/i, value:''},
  FSTATE : { name:'FSTATE', regexp:/FSTATE\:(AUTO|AUTOCIRC|ON)/i, value:''},
}

exports.events = {
  thermostatPoll : { label:'Thermostat status poll', icon:'fa-heartbeat', descr:'Poll thermostat status (HTTP GET)',
    nextSchedule:function(node) { return 30000; },
    scheduledExecute:function(node) {
      tstatPoll(node._id);
    }
  },

  thermostat_H68_AM : { label:'Thermostat heat 68° @ 8AM weekdays', icon:'clock', descr:'Request heat point of 68° weekdays at 8am',
    nextSchedule:function(node) { return timeoutOffset(8,0); }, //ie 8:00 (8am)
    scheduledExecute:function(node) {
      if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1..Friday=5,*/)
      {
        var targetNow=0, modeNow='';
        // if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
        // if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
        // if (targetNow == 68 && modeNow=='HEAT') return;
        var thejson = { 'tmode':1, 't_heat':68, 'hold':1 };
        tstatRequest(thejson, node._id);
      }
      else console.log('thermostat_H73_PM IF(FAIL): day=' + (new Date().getDay()));
    }
  },

  thermostat_H73_PM : { label:'Thermostat heat 73° @ 4:00PM weekdays', icon:'clock', descr:'Request heat point of 73° weekdays at 4pm',
    nextSchedule:function(node) { return timeoutOffset(16,0); }, //ie 16:00 (4pm)
    scheduledExecute:function(node) {
      if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1..Friday=5,*/)
      {
        var targetNow=0, modeNow='';
        //if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
        //if (node.metrics['TARGET']) targetNow = node.metrics['TARGET'].value;
        //if (targetNow == 73 && modeNow=='HEAT') return;
        var thejson = { 'tmode':1, 't_heat':73, 'hold':1 };
        tstatRequest(thejson, node._id);
      }
      else console.log('thermostat_H73_PM IF(FAIL): day=' + (new Date().getDay()));
    }
  },
}

exports.motes = {
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
                              tstatRequest(thejson, node._id);
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
                              tstatRequest(thejson, node._id);
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
                              tstatRequest(thejson, node._id);
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
                              tstatRequest(thejson, node._id);
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
                            tstatRequest(thejson, node._id);
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
                            tstatRequest(thejson, node._id);
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
                            tstatRequest(thejson, node._id);
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
                            tstatRequest(thejson, node._id);
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
                            tstatRequest({ 'tmode':3 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'AUTO'; }
                        },
                        { label:'Auto', action:'', icon:'fa-balance-scale',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='AUTO') return;
                            tstatRequest({ 'tmode':3 }, node._id);
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
                            tstatRequest({ 'tmode':0 }, node._id);
                          },
                          condition:''+function(node) { return node.metrics['MODE']!=null && node.metrics['MODE'].value == 'OFF'; }
                        },
                        { label:'Off', action:'', icon:'fa-power-off',
                          serverExecute:function(node){
                            var targetNow=0, modeNow='';
                            if (node.metrics['MODE']) modeNow = node.metrics['MODE'].value;
                            if (modeNow=='OFF') return;
                            tstatRequest({ 'tmode':0 }, node._id);
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
                            tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['FSTATE']!=null && node.metrics['FSTATE'].value == 'AUTO'; }
                        },
                        { label:'Turn fan AUTO', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var fanNow='';
                            if (node.metrics['FSTATE']) fanNow = node.metrics['FSTATE'].value;
                            if (fanNow != 'AUTO' && fanNow != 'ON') return;
                            var thejson = (fanNow == 'AUTO' ? { 'fmode':2 } : { 'fmode':0 }); //toggle between ON and AUTO
                            tstatRequest(thejson, node._id);
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
                            tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['HOLD']!=null && node.metrics['HOLD'].value == 'OFF'; }
                        },
                        { label:'HOLD', action:'', icon:'fa-lock', css:'background-color:#9BFFBE',
                          serverExecute:function(node){
                            var holdNow='';
                            if (node.metrics['HOLD']) holdNow = node.metrics['HOLD'].value;
                            if (holdNow != 'ON' && holdNow != 'OFF') return;
                            var thejson = (holdNow == 'OFF' ? { 'hold':1 } : { 'hold':0 });
                            tstatRequest(thejson, node._id);
                          },
                          condition:''+function(node) { return node.metrics['HOLD']!=null && node.metrics['HOLD'].value == 'ON'; }
                        }],
             },
    },
    settings: { ip:'' } //blank will inherit ip value from global settings.json
  }
}