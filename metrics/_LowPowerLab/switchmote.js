//SwitchMote - https://lowpowerlab.com/switchmote

exports.metrics = {
  //SwitchMote buttons
  SMB0_OFF : { name:'B0', regexp:/BTN0\:0/i, value:'OFF'},
  SMB0_ON  : { name:'B0', regexp:/BTN0\:1/i, value:'ON'},
  SMB1_OFF : { name:'B1', regexp:/(BTN1|SSR|RLY)\:0/i, value:'OFF', pin:1, graph:1, logValue:0, graphOptions:{ yaxis: {ticks:0, min:0, autoscaleMargin:0.5 }, colors:['#4a0']}},
  SMB1_ON  : { name:'B1', regexp:/(BTN1|SSR|RLY)\:1/i, value:'ON', pin:1, graph:1, logValue:1, graphOptions: { /* already defined above for 'B1', no need to repeat */ }},
  SMB2_OFF : { name:'B2', regexp:/BTN2\:0/i, value:'OFF'},
  SMB2_ON  : { name:'B2', regexp:/BTN2\:1/i, value:'ON'},
}

exports.events = {
  switchMoteON_PM : { label:'SwitchMote ON at sunset!', icon:'clock', descr:'Turn this switch ON at sunset', nextSchedule:function(node) { return millisToFutureDate(nextSunriseOrSunset(0), ONEDAY*2); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:1'}); } },
  switchMoteOFF_AM : { label:'SwitchMote OFF at sunrise!', icon:'clock', descr:'Turn this switch OFF at sunrise', nextSchedule:function(node) { return millisToFutureDate(nextSunriseOrSunset(1), ONEDAY*2); }, scheduledExecute:function(node) { sendMessageToNode({nodeId:node._id, action:'BTN1:0'}); } },
  switchMoteONBUZZ : { label:'SwitchMote ON Buzzer beep!', icon:'clock', descr:'Buzz gateway when switchmote is ON',  serverExecute:function(node) { if (node.metrics['B1'] && node.metrics['B1'].value == 'ON' && (Date.now() - new Date(node.metrics['B1'].updated).getTime() < 2000)) { setTimeout(function() { sendMessageToGateway('BEEP'); }, 5); } }},
}

exports.motes = {
  SwitchMote: {
    label   : 'Light Switch',
    icon : 'icon_switchmote.png',
    controls : { B0 : { states: [{ label:'B0 (off)', action:'BTN0:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B0'] ? node.metrics['B0'].value == 'OFF' : false; }},  //http://api.jquerymobile.com/icons/
                                { label:'B0 (on)',  action:'BTN0:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B0'] ? node.metrics['B0'].value == 'ON' : false; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B0', Object.keys(node.metrics))>-1);}},
                B1 : { states: [{ label:'Off', action:'BTN1:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B1'] ? node.metrics['B1'].value == 'OFF' : false; }},
                                { label:'On',  action:'BTN1:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B1'] ? node.metrics['B1'].value == 'ON' : false; }}]},
                B2 : { states: [{ label:'B2 (off)', action:'BTN2:1', css:'background-color:#FF9B9B;', icon:'power', condition:''+function(node) { return node.metrics['B2'] ? node.metrics['B2'].value == 'OFF' : false; }},
                                { label:'B2 (on)',  action:'BTN2:0', css:'background-color:#9BFFBE;color:#000000', icon:'power', condition:''+function(node) { return node.metrics['B2'] ? node.metrics['B2'].value == 'ON' : false; }}],
                       showCondition:''+function(node) { return (node.metrics && $.inArray('B2', Object.keys(node.metrics))>-1);}},
               },
    settings: { ipcam_snapURL: '' }, //blank will make it inherit setting value from global settings.json, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
}
