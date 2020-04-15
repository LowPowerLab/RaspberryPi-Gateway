//Door Bell Mote - https://lowpowerlab.com/shop/product/132

exports.metrics = {
  ring : { name:'RING', regexp:/\bRING\b/i, value:'RING', pin:1, graph:1, logValue:1, graphValSuffix:'!', graphOptions:{ legendLbl:'Doorbell rings', lines: { show:false, fill:false }, points: { show:true, radius:8, fill:false }, grid: { backgroundColor: {colors:['#000', '#a40']}}, yaxis: { ticks: 0 }}},
  BELL_DISABLED : { name:'Status', regexp:/\bBELL\:0\b/i, value:'OFF'},
  BELL_ENABLED  : { name:'Status', regexp:/\bBELL\:1\b/i, value:'ON'},
}

exports.events = {
  doorbellSound : { label:'Doorbell : Sound', icon:'audio', descr:'Play sound when doorbell rings', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { io.sockets.emit('PLAYSOUND', 'sounds/doorbell.wav'); }; } },
  doorbellSMS : { label:'Doorbell : SMS', icon:'comment', descr:'Send SMS when Doorbell button is pressed', serverExecute:function(node) { if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000)) { sendSMS('DOORBELL', 'DOORBELL WAS RINGED: [' + node._id + '] ' + node.label.replace(/\{.+\}/ig, '') + ' @ ' + new Date().toLocaleTimeString()); }; } },
  
  doorbellSnapshot : { label:'Doorbell : Snapshot', icon:'camera', descr:'Send IPCamera snapshot when Doorbell is pressed pressed',
    serverExecute:function(node) {
      if (node.metrics['RING'] && node.metrics['RING'].value == 'RING' && (Date.now() - new Date(node.metrics['RING'].updated).getTime() < 2000))
      {
        db.findOne({ _id : node._id }, function (err, dbNode) {
          try {
            var snapshotURL = dbNode.settings && dbNode.settings.ipcam_snapURL ? dbNode.settings.ipcam_snapURL : (metricsDef.motes[dbNode.type].settings.ipcam_snapURL || settings.misc.ipcam_snapURL.value);
            sendEmail('Someone at the door!', 'Someone rang the doorbell! @ ' + new Date().toLocaleTimeString(), [{path: snapshotURL, filename: 'snapshot.jpg'}]);
          } catch(ex) {
            console.error('Event doorbellSnapshot FAIL: dbNode=' + JSON.stringify(dbNode));
            console.error(ex.message);
          }
        });
      }
    }
  },
}

exports.motes = {
  DoorBellMote: {
    label  : 'DoorBell',
    icon   : 'icon_doorbell.png',
    settings: { ipcam_snapURL: '' },
    controls : { ring : { states: [{ label:'Ring it!', action:'RING', icon:'audio' }]},
                 status :  { states: [{ label:'Disabled', action:'BELL:1', css:'background-color:#FF9B9B;', icon:'fa-bell-slash', condition:''+function(node) { return node.metrics['Status']!=null && node.metrics['Status'].value == 'OFF'; }},
                                      { label:'Enabled',  action:'BELL:0', css:'background-color:#9BFFBE;color:#000000', icon:'fa-bell', condition:''+function(node) { return node.metrics['Status']==null || node.metrics['Status'].value == 'ON'; }}]},
    },
  },
}