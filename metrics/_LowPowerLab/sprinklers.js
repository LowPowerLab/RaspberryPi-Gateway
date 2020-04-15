//Automate your sprinkler controller with a IOShield - https://lowpowerlab.com/2015/08/31/sprinkler-controller-automation/

exports.metrics = {
  //SprinklerMote
  SPRKL_ZONE : { name:'ZONE', regexp:/ZONE\:([\d\.]+)/i, value:'', pin:1, graph:1, logValue:'', graphValPrefix:'Zone ', graphValSuffix:' running!',  graphOptions:{ legendLbl:'Zone', colors:['#4a0']}}, //this captures zone messages and extracts the ID of the active zone
  SPRKL_OFF : { name:'ZONE', regexp:/ZONES\:OFF/i, value:'OFF', pin:1, graph:1, logValue:0, graphValPrefix:'', graphValSuffix:''},
}

exports.events = {
  //for the sprinkler events, rather than scheduling with offsets, its much easier to run them every day, and check the odd/even/weekend condition in the event itself
  sprinklersOddDays : { label:'Odd days @ 2:30AM', icon:'clock', descr:'Run this sprinkler program on odd days at 2:30AM', nextSchedule:function(node) { return timeoutOffset(2,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==1) sendMessageToNode({nodeId:node._id, action:'PRG 1:300 2:300 3:300 4:300 5:300' /*runs stations 1-5 (300sec each))*/}); } },
  sprinklersEvenDays : { label:'Even days @ 2:30AM', icon:'clock', descr:'Run this sprinkler program on even days at 2:30AM', nextSchedule:function(node) { return timeoutOffset(2,30); }, scheduledExecute:function(node) { if ((new Date().getDate()%2)==0) sendMessageToNode({nodeId:node._id, action:'PRG 1:300 2:300 3:300 4:300 5:300' /*runs stations 1-5 (300sec each)*/}); } },
  sprinklersWeekends : { label:'Weekends @ 2:30AM)', icon:'clock', descr:'Run this sprinkler program on weekend days at 2:30AM', nextSchedule:function(node) { return timeoutOffset(2,30); }, scheduledExecute:function(node) { if ([0,6].indexOf(new Date().getDay())>-1 /*Saturday=6,Sunday=0,*/) sendMessageToNode({nodeId:node._id, action:'PRG 1:180 2:180 3:180 4:180 5:180' /*runs stations 1-5 (180sec each)*/}); } },
}

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
    },
  },
}
