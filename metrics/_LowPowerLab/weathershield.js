//WeatherShield metrics - https://lowpowerlab.com/guide/weathershield/
  
exports.metrics = {
  //uncomment FtoC if you want a F:1234 to be valuated as a Centigrade isntead of F (the first match is picked up and will evaluate, any following defs are ignored)
  //FtoC : { name:'C', regexp:/F\:(-?\d+\.\d+)/i, value:'', duplicateInterval:3600, valuation:function(value) {return ((value - 32) * 5/9).toFixed(2);}, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}},
  F : { name:'F', regexp:/\bF\:(-?\d+\.\d+)\b/i, value:'', duplicateInterval:3600, unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 } }},
  //uncomment FHtoC if you want a F:1234 to be valuated as a Centigrade isntead of F (the first match is picked up and will evaluate, any following defs are ignored)
  //FHtoC : { name:'C', regexp:/\bF\:(-?\d+)\b/i, value:'', duplicateInterval:3600, valuation:function(value) {return ((value/100 - 32) * 5/9).toFixed(2);}, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}}
  FH : { name:'F', regexp:/\bF\:(-?\d+)\b/i, value:'', duplicateInterval:3600, valuation:function(value) {return value/100;}, unit:'°', pin:1, graph:1, graphValSuffix:'F', graphOptions:{ legendLbl:'Temperature', lines: { lineWidth:1 }}},
  C : { name:'C', regexp:/\bC\:([-\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'°', pin:1, graph:1, graphValSuffix:'C', graphOptions:{ legendLbl:'Temperature' }},
  H : { name:'H', regexp:/\bH\:([\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'%', pin:1, graph:1, graphOptions:{ legendLbl:'Humidity', lines: { lineWidth:1 }}},
  P : { name:'P', regexp:/\bP\:([\d\.]+)\b/i, value:'', duplicateInterval:3600, unit:'"', pin:1, },
}

exports.events = {
  temperatureSMSLimiter : { label:'THAlert : SMS Limited', icon:'comment', descr:'Send SMS when F>75°, once per hour', 
    serverExecute:function(node) { 
      if (node.metrics['F'] && node.metrics['F'].value > 75 && (Date.now() - node.metrics['F'].updated < 2000)) /*check if M metric exists and value is MOTION, received less than 2s ago*/
      {
        var approveSMS = false;
        if (node.metrics['F'].lastSMS) /*check if lastSMS value is not NULL ... */
        {
          if (Date.now() - node.metrics['F'].lastSMS > 1800000) /*check if lastSMS timestamp is more than 1hr ago*/
          {
            approveSMS = true;
          }
        }
        else
        {
          approveSMS = true;
        }
        
        if (approveSMS)
        {
          node.metrics['F'].lastSMS = Date.now();
          sendSMS('Temperature > 75° !', 'Temperature alert (>75°F!): [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString());
          db.update({ _id: node._id }, { $set : node}, {}, function (err, numReplaced) { console.log('   ['+node._id+'] DB-Updates:' + numReplaced);}); /*save lastSMS timestamp to DB*/
        }
        else console.log('   ['+node._id+'] THAlert SMS skipped.');
      };
    }
  },
}

exports.motes = {
  WeatherMote: {
    label  : 'Weather Sensor',
    icon   : 'icon_weather.png',
    settings: { lowVoltageValue: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
}
