//GarageMote - https://lowpowerlab.com/garagemote/

exports.metrics = {
  //NOTE the \b word boundary is used to avoid matching "OPENING" (ie OPEN must be followed by word boundary/end of word)
  open : { name:'Status', regexp:/(?:STS\:)?(OPN|OPEN)\b/i, value:'OPEN', pin:1, graph:1, logValue:2, graphOptions:{ legendLbl:'Garage door events', yaxis: {ticks:0}, colors:['#4a0'], /*lines: { lineWidth:1 }*/}},
  opening : { name:'Status', regexp:/(?:STS\:)?(OPNING|OPENING)/i, value:'OPENING..', pin:1, graph:1, logValue:1 },
  closed : { name:'Status', regexp:/(?:STS\:)?(CLS|CLOSED)/i, value:'CLOSED', pin:1, graphValPrefix:' Door: ', graph:1, logValue:0 },
  closing : { name:'Status', regexp:/(?:STS\:)?(CLSING|CLOSING)/i, value:'CLOSING..', pin:1, graph:1, logValue:1.1 }, //1.1 to avoid a match with "OPENING"
  unknown : { name:'Status', regexp:/(?:STS\:)?(UNK|UNKNOWN)/i, value:'UNKNOWN!', pin:1, graph:1, logValue:0.5 },
}

exports.events = {
  garageSMS : { label:'Garage : SMS', icon:'comment', descr:'Send SMS when garage is OPENING', serverExecute:function(node) { if (node.metrics['Status'] && (node.metrics['Status'].value.indexOf('OPENING')>-1) && (Date.now() - new Date(node.metrics['Status'].updated).getTime() < 2000)) { sendSMS('Garage event', 'Garage was opening on node : [' + node._id + ':' + node.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString()); }; } },
  garagePoll: { label:'Garage : POLL Status', icon:'comment', descr:'Poll Garage Status', nextSchedule:function(nodeAtScheduleTime) { return 30000; }, scheduledExecute:function(nodeAtScheduleTime) { db.findOne({ _id : nodeAtScheduleTime._id }, function (err, nodeRightNow) { if (nodeRightNow) { /*just emit a log the status to client(s)*/ io.sockets.emit('LOG', 'GARAGE POLL STATUS: ' + nodeRightNow.metrics['Status'].value ); } }); } },
  
  garageSnapshotEmail : { label:'Garage : Snapshot', icon:'camera', descr:'Send IPCam snapshot when garage is OPENING',
    serverExecute: function(node) { 
      if (node.metrics['Status'] && (node.metrics['Status'].value.indexOf('OPENING')>-1) && (Date.now() - new Date(node.metrics['Status'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (metricsDef.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
          sendEmail('GARAGE OPENING', 'GARAGE IS OPENING: [' + dbNode._id + ':' + dbNode.label.replace(/\{.+\}/ig, '') + '] @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
        });
      }
    }
  },
}

exports.motes = {
    GarageMote : {
    label    : 'Garage Opener',
    icon     : 'icon_garage.png',
    settings : { ipcam_snapURL: '' },
    controls : { refresh : { states: [{ label:'Refresh', action:'STS', icon:'refresh' }]},
                 opencls : { states: [{ label:'Open!', action:'OPN', icon:'arrow-u', css:'background-color:#FF9B9B;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'CLOSED';}},
                                      { label:'Opening..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OPENING';}},
                                      { label:'Close!', action:'CLS', icon:'arrow-d', css:'background-color:#9BFFBE;color:#000000', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OPEN';}},
                                      { label:'Closing..', action:'', icon:'forbidden', css:'background-color:#FFF000;', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'CLOSING';}}]
                           }
              }
  },
}