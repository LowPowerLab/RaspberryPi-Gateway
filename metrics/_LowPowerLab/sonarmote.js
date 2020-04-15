//SonarMote - https://lowpowerlab.com/shop/product/129

exports.metrics = {
  sonar : { name:'CM', regexp:/\b([\d\.]+)cm?\b/i, value:'', unit:'cm', pin:1, graph:1,  graphOptions: { legendLbl:'Level', lines: { lineWidth:1 }, colors:['#09c']} },
}

exports.events = {
  sumpSMS : { label:'SumpPump : SMS (below 20cm)', icon:'comment', descr:'Send SMS if water < 20cm below surface', serverExecute:function(node) { if (node.metrics['CM'] && node.metrics['CM'].value < 20 && (Date.now() - new Date(node.metrics['CM'].updated).getTime() < 2000)) { sendSMS('SUMP PUMP ALERT', 'Water is only 20cm below surface and rising - [' + node._id + '] ' + node.label.replace(/\{.+\}/ig, '') + ' @ ' + new Date().toLocaleTimeString()); }; } },
}

exports.motes = {
  SonarMote: {
    label  : 'Sonar Mote (Distance Sensor)',
    icon   : 'icon_sonar.png',
    settings: { lowVoltageValue: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
}