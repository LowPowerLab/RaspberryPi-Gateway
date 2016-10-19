/*this sample metric will override that which is already defined in main metrics.js*/
/*you can redefine defaults or write your own new custom metrics in 1 or more files in this folder, separate them as you'd like - they all get merged together when the app loads*/
exports.metrics = {
  V : { name:'V', regexp:/(?:V?BAT|VOLTS|V)\:([\d\.]+)v?/i, value:'', unit:'v', graph:1, graphOptions:{ legendLbl:'VOLTZ!', lines: { fill:true, lineWidth:1 }, yaxis: { min: 0, autoscaleMargin: 0.5 }}}
};