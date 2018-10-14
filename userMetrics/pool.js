////////////////////////////////
/////    P O O L M O T E   /////
////////////////////////////////

exports.timeoutOffset = require('../metrics.js').timeoutOffset;
exports.futureDateOffset = require('../metrics.js').futureDateOffset;

var poolOnDate = null;

///////////////////////////////////////
/// P O O L M O T E - M e t r i c s ///
///////////////////////////////////////
exports.metrics = {
  PoolPump_OFF  :
  {
	name:'Pool Pump',
	regexp:/PFR\:0/i,
	value:'OFF'
  },
  PoolPump_ON   :
  {
	name:'Pool Pump',
	regexp:/PFR\:1/i,
	value:'ON',
	poolOnDate:new Date(Date.now())
  },
  VacPump_OFF   :
  {
	name:'Polaris Pump',
	regexp:/PCR\:0/i,
	value:'OFF'
  },
  VacPump_ON    :
  {
	name:'Polaris Pump',
	regexp:/PCR\:1/i,
	value:'ON'
  },
  VacPump_NA    :
  {
	name:'Polaris Pump',
	regexp:/PCR\:2/i,
	value:'DISABLED'
  },
  PoolLight_OFF :
  {
	name:'Pool Light',
	regexp:/PLI\:0/i,
	value:'OFF'
  },
  PoolLight_ON  :
  {
	name:'Pool Light',
	regexp:/PLI\:1/i,
	value:'ON'
  },
  //poolTemp  : { name:'Pool Temp', regexp:/PTE\:(\d+)/i, value:'', valuation:function(value) {return ((value * 1.8) + 32)},  unit:'°F', pin:1, graph:1 },
  //poolTemp  : { name:'Pool Temp', regexp:/PTE\:(\d+)/i, value:'', valuation:function(value) {return Math.floor(((((value/10)*9.0/5.0)+32)*10)/100)*(1.8)+26},  unit:'°F', pin:1, graph:1 },
  poolTemp  :
  {
	name:'Pool Temp',
	regexp:/PTE\:(\d+)/i,
	value:'',
	unit:'deg',
	pin:1,
	graph:1
  },
  poolPress :
  {
	name:'Filter Pressure',
	regexp:/PPR\:(\d+)/i,
	value:'',
	valuation:function(value) {
		return Math.round((((value*0.01)*10)/10.0)*40);
	},
 	unit:'psi',
	pin:1,
	graph:1
  },
  poolFlow  :
  {
	name:'Polaris Flow',
	regexp:/PFL\:(\d+)/i,
	value:'',
	valuation:function(value) {
		return (value)
	},
	unit:'mL/sec',
	pin:1,
	graph:1
  },
  poolPH    :
  {
	name:'Pool pH',
	regexp:/PPH\:(\d+)/i,
	value:'',
	valuation:function(value) {
		return (value/10)
	},
	unit:'',
	pin:1,
	graph:1
  },
  poolORP   :
  {
	name:'Pool ORP',
	regexp:/PCL\:(\d+)/i, value:'',
	valuation:function(value) {
		return (value*10)
	},
	unit:'mV',
	pin:1,
	graph:1
  }
};

/////////////////////////////////////////////////////////
/// P O O L M O T E  -  N o d e   D e f i n i t i o n ///
/////////////////////////////////////////////////////////
exports.motes = {
    PoolMote : {
        label : 'Pool',
        icon : 'swimming_pool.png',
        controls : {
            PoolPump : {
                states: [
                    {
                        label:'Turn Pool On',
                        action:'PFR:1',
                        icon:'power',
                        css:'background-color:#FF9B9B;',
                        condition:''+function(node) {
                            return node.metrics['Pool Pump']!=null && node.metrics['Pool Pump'].value == 'OFF';
                    }
                    }, // PoolPump
                    {
                        label:'Turn Pool off',
                        action:'PFR:0',
                        icon:'power',
                        css:'background-color:#9BFFBE;color:#000000',
                        condition:''+function(node) {
                            return node.metrics['Pool Pump'].value == 'ON';
                        }
                    }
                ], // states
                showCondition:''+function(node) {
                    return (node.metrics && $.inArray('Pool Pump', Object.keys(node.metrics))>-1);
                }
            }, // PoolPump
            VacPump  : {
                states: [
                    {   label:'Turn Polaris On',
                        action:'PCR:1',
                        icon:'power',
                        css:'background-color:#FF9B9B;',
                        condition:''+function(node) {
                            return node.metrics['Polaris Pump']!=null && node.metrics['Polaris Pump'].value == 'OFF';
                        }
                    }, // Turn Polaris On
                    {   label:'Turn Polaris off',
                        action:'PCR:0',
                        icon:'power',
                        css:'background-color:#9BFFBE;color:#000000',
                        condition:''+function(node) {
                            return node.metrics['Polaris Pump'].value == 'ON';
			}
                    }, // Turn Polaris Off
                    {   label:'Polaris Disabled',
                        action:'',
                        icon:'forbidden',
                        css:'background-color:#FFF000;',
                        condition:''+function(node) {
                            return node.metrics['Polaris Pump'].value == 'DISABLED';
                        }
                    } // Polaris Disabled
                ], // states
                showCondition:''+function(node) {
                    return (node.metrics && $.inArray('Polaris Pump', Object.keys(node.metrics))>-1);
                }
            }, // VacPump
            PoolLight: {
                states: [
                    {   label:'Turn Light On',
                        action:'PLI:1',
                        icon:'power',
                        css:'background-color:#FF9B9B;',
                        condition:''+function(node) {
                            return node.metrics['Pool Light']!=null && node.metrics['Pool Light'].value == 'OFF';
                        }
                    }, // Turn Light On
                    {   label:'Turn Light Off',
                        action:'PLI:0',
                        icon:'power',
                        css:'background-color:#9BFFBE;color:#000000',
                        condition:''+function(node) {
                            return node.metrics['Pool Light'].value == 'ON';
                        }
                    } // Turn Light Off
                ], // states
                showCondition:''+function(node) {
                    return (node.metrics && $.inArray('Pool Light', Object.keys(node.metrics))>-1);
                }
            } // PoolLight
        } // controls
  }, // PoolMote
} // exports.motes

///////////////////////////////////////
/// P O O L M O T E  -  E v e n t s /// 
///////////////////////////////////////
exports.events = {

    poolOnWeekdays : {
        label:'Pool ON at 12 PM Monday through Friday',
        icon:'clock',
        descr:'Turn on the pool pump at 12 PM on weekdays',
        nextSchedule:function(node) {
            return exports.timeoutOffset(12,0);
        },
        scheduledExecute:function(node) {
            if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1..Friday=5,*/) {
                sendMessageToNode({nodeId:node._id, action:'PFR:1' /*runs pool until next stop event occurs*/});
            }
        }
    }, // poolOnWeekdays

    poolOffWeekdays : {
        label:'Pool OFF at 8 PM Sunday through Thursday',
        icon:'clock',
        descr:'Turn off the pool pump at 8 PM on weeknights',
        nextSchedule:function(node) {
            return exports.timeoutOffset(20,00);
        },
        scheduledExecute:function(node) {
            if ([0,1,2,3,4].indexOf(new Date().getDay())>-1 /*Sunday=0..Thursday=4,*/) {
                sendMessageToNode( { nodeId:node._id, action:'PFR:0' /*stops pool until next run event occurs*/ } );
	        if ( nodeRightNow.metrics['Pool Pump'] && nodeRightNow.metrics['Pool Pump'].value == 'ON' ) {
                    setTimeout(sendMessageToNode({nodeId:node._id, action:'PFR:0'}, 8000));
                };
            };
        }
    }, // poolOffWeekdays

    poolOffLate : {
        label:'Pool : Night swimming auto-off',
        icon:'clock',
        descr:'Automatically shut off pool pump after 1 hour of swimming at night (between 10PM and 10AM)',
        nextSchedule:function(node) {
            return 30000; // Check every 30 seconds
        },
        scheduledExecute:function(nodeAtScheduleTime) {
            db.findOne( { _id : nodeAtScheduleTime._id },
                        function (err, nodeRightNow) {

                            if (nodeRightNow) {

                                /* emit a log the status to client(s)*/
                                io.sockets.emit('LOG', 'POOL PUMP STATUS: ' + nodeRightNow.metrics['Pool Pump'].value );

                                if ( nodeRightNow.metrics['Pool Pump'] && nodeRightNow.metrics['Pool Pump'].value == 'ON' ) {
                                    var nowDate = new Date(Date.now());
                                    if ( poolOnDate == null ) {
                                        poolOnDate     = nowDate;
                                        poolOnNotified = false;
                                    };

                                    io.sockets.emit('LOG', 'POOL LAST TURNED ON: ' + poolOnDate.toString());

                                    if (nowDate.getHours() > 21 || nowDate.getHours() < 10 ) { // curfew

                                        // Pool has been on since before curfew.  Start countdown from curfew.
                                        if (poolOnDate.getHours() <= 21) {
                                            poolOnDate.setHours(22);
                                            poolOnDate.setMinutes(00);
                                        }
                                        var onMillis        = (nowDate.getTime() - poolOnDate.getTime());
                                        var onMinutes       = Math.floor(onMillis / 1000 / 60 * 10) / 10;
                                        var offMinutes      = 60;
                                        var offDate         = new Date(poolOnDate.getTime()+(offMinutes*60*1000));
                                        var secsRemaining   = (offDate.getTime()-nowDate.getTime())/1000;
                                        var minsRemaining   = secsRemaining / 60;

                                        // minsRemaining may be negative if the pool has been on for a while before curfew begins - don't report in this case
                                        if (minsRemaining >= 0) {

                                            io.sockets.emit('LOG', 'POOL WILL TURN BACK OFF IN ' + Math.round(minsRemaining) + ' minutes ');

                                            if (!poolOnNotified && (onMinutes >= 5)) {
                                                //sendSMS('Pool event', 'Pool has been turned on after hours. It will be automatically shut off at ' + dateFormat(offDate, 'h:MM TT'));
                                                poolOnNotified = true;
                                            };
                                        }

                                        if (onMinutes >= offMinutes) {
                                            io.sockets.emit('LOG', 'POOL HAS BEEN ON FOR ' + onMinutes + ' MINUTES. SHUTTING OFF...');
                                            sendMessageToNode({nodeId:nodeRightNow._id, action:'PFR:0'});
                                            //sendSMS('Pool event', 'Pool has been automatically shut off.');
                                        };

                                    }; // curfew
                                };

                                if ( nodeRightNow.metrics['Pool Pump'] && nodeRightNow.metrics['Pool Pump'].value == 'OFF' ) {
                                    poolOnDate = null;
                                };
                            }; // if nodeRightNow
                        }); // function( err, nodeRightNow )
        } // scheduledExecute:function...
    }, // poolOffLate

    poolOnWeekends : {
        label:'Pool ON at 10 AM Saturday and Sunday',
        icon:'clock',
        descr:'Turn on the pool pump at 10 AM on weekends',
        nextSchedule:function(node) {
            return exports.timeoutOffset(10,0);
        },
        scheduledExecute:function(node) {
            if ([0,6].indexOf(new Date().getDay())>-1 /*Saturday=6,Sunday=0*/) {
                sendMessageToNode({nodeId:node._id, action:'PFR:1' /*runs pool until stop event occurs*/});
            }
        }
     },

    poolOffWeekends : {
        label:'Pool OFF at 10 PM Friday and Saturday',
        icon:'clock',
        descr:'Turn off the pool pump at 10 PM on weekendnights',
        nextSchedule:function(node) {
            return exports.timeoutOffset(22,0);
        },
        scheduledExecute:function(node) {
            if ([5,6].indexOf(new Date().getDay())>-1 /*Friday=5,Saturday=6*/) {

                sendMessageToNode({nodeId:node._id, action:'PFR:0' /*stops pool until next run event occurs*/});

                if ( nodeRightNow.metrics['Pool Pump'] && nodeRightNow.metrics['Pool Pump'].value == 'ON' ) {
                    setTimeout(sendMessageToNode({nodeId:node._id, action:'PFR:0'}, 8000));
	        };
	};
      } // scheduledExecute:function
    }, // poolOffWeekends

    polarisTimerOn : {
        label:'Polaris timer ON at 1 PM on weekdays',
        icon:'clock',
        descr:'Turn on the cleaner pump at 1 PM on weekdays',
        nextSchedule:function(node) {
           return exports.timeoutOffset(13,0);
        },
        scheduledExecute:function(node) {
            if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1,Friday=5*/) {

                sendMessageToNode({nodeId:node._id, action:'PCR:1' /*runs polaris until stop event occurs*/});
            }
        }
    }, // polarisTimerOn

    polarisTimerOff : {
        label:'Polaris timer OFF at 3 PM on weekdays',
        icon:'clock',
        descr:'Turn off the cleaner pump at 3 PM on weekdays',
        nextSchedule:function(node) {
            return exports.timeoutOffset(15,0);
        },
        scheduledExecute:function(node) {
            if ([1,2,3,4,5].indexOf(new Date().getDay())>-1 /*Monday=1,Friday=5*/) {
                sendMessageToNode({nodeId:node._id, action:'PCR:0' /*stops polaris until next run event occurs*/});
            }
        }
    } // polarisTimerOff
}; // exports.events
