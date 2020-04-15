//MotionMote and Mailbox notifier - https://lowpowerlab.com/motion

exports.metrics = {
  motion : { name:'M', regexp:/\bMOTION\b/i, value:'MOTION', pin:1, graph:1, logValue:1, graphValSuffix:' detected!', graphOptions:{ legendLbl:'Motion', lines: { show:false, fill:false }, points: { show:true, radius:8, fill:false }, grid: { backgroundColor: {colors:['#000', '#03c', '#08c']}}, yaxis: { ticks: 0 }}},
  lastMotion : { name:'LO', regexp:/(?:LO|LM)\:((?:\d+h)?\d{1,2}m|\d{1,2}s)/i, value:'', pin:1 },
}

exports.events = {
  motionAlert : { label:'Motion : Alert', icon:'audio', descr:'Alert sound when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/alert.wav'); }; } },
  mailboxAlert : { label:'Mailbox Open Alert!', icon:'audio', descr:'Message sound when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/incomingmessage.wav'); }; } },
  motionEmail : { label:'Motion : Email', icon:'mail', descr:'Send email when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendEmail('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  motionSMS : { label:'Motion : SMS', icon:'comment', descr:'Send SMS when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MOTION DETECTED', 'MOTION WAS DETECTED ON NODE: [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },

  motionSMSLimiter : { label:'Motion : SMS Limited', icon:'comment', descr:'Send SMS when MOTION is detected, once per time limit (setting)', 
    serverExecute:function(node) {
      if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - node.metrics['M'].updated < 2000)) /*check if M metric exists and value is MOTION, received less than 2s ago*/
      {
        var approveSMS = false;
        
        if (node.metrics['M'].lastSMS) /*check if lastSMS value is not NULL ... */
        {
          var repeatLimit = settings.general.smsRepeatLimit != undefined ? settings.general.smsRepeatLimit.value : 0;
          if (Date.now() - node.metrics['M'].lastSMS > repeatLimit) /*check if lastSMS timestamp is more than 1hr ago*/
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
          node.metrics['M'].lastSMS = Date.now();
          sendSMS('MOTION!', 'MOTION DETECTED ON NODE [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString());
          db.update({ _id: node._id }, { $set : node}, {}, function (err, numReplaced) { console.log(`   [${node._id}] DB-Updates:${numReplaced}`);}); /*save lastSMS timestamp to DB*/
        }
        else console.log(`   [${node._id}] MOTION SMS skipped`);
      };
    }
  },
  
  motionEmailSnapshot : { label:'Motion : Email+IPCam Snapshot', icon:'camera', descr:'Send email when MOTION is detected, with snapshot from IPCamera',
    serverExecute:function(node) {
      if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (metricsDef.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
          sendEmail('MOTION DETECTED', 'MOTION DETECTED ON NODE: [' + dbNode._id + ':' + dbNode.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
        });
      }
    } 
  },
  
  mailboxSMS : { label:'Mailbox open : SMS', icon:'comment', descr:'Send SMS when mailbox is opened', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendSMS('MAILBOX OPENED', 'Mailbox opened [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  motionLightON23 : { label:'Motion: SM23 ON!', icon:'action', descr:'Turn SwitchMote:23 ON when MOTION is detected', serverExecute:function(node) { if (node.metrics['M'] && node.metrics['M'].value == 'MOTION' && (Date.now() - new Date(node.metrics['M'].updated).getTime() < 2000)) { sendMessageToNode({nodeId:23, action:'MOT:1'}); }; } },

}

exports.motes = {
  MotionMote: {
    label  : 'Motion Sensor',
    icon   : 'icon_motion.png',
    settings: { lowVoltageValue: '', ipcam_snapURL: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
  Mailbox: {
    label   : 'Mailbox',
    icon : 'icon_mailbox.png',
    settings: { lowVoltageValue: '', ipcam_snapURL: '' }, //blank will make it inherit from global settings.json lowVoltageValue, a specific value overrides the general setting, user can always choose his own setting in the UI
  },
}