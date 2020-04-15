exports.metrics = {
  //WaterMote
  GPM : { name:'GPM', regexp:/GPM\:([\d\.]+)/i, value:'', unit:'gpm', graph:1,  graphOptions : { legendLbl:'Gallons/min', lines: { lineWidth:1 }, colors:['#09c'], tickDecimals: 2} },
  GLM : { name:'GLM', regexp:/GLM\:([\d\.]+)/i, value:'', unit:'glm', },
  GAL : { name:'GAL', regexp:/GAL\:([\d\.]+)/i, value:'', unit:'gal', pin:1, },
}

exports.events = {

}

exports.motes = {
  WaterMeter: {
    label  : 'Water Meter',
    icon   : 'icon_watermeter.png',
  },
}

