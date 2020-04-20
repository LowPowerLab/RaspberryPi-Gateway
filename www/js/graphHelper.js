//adapted from: https://github.com/emoncms/development/tree/master/experimental/emon-py
var graphView =
{
  'start':0,
  'end':0,

  'setDomain':function(hours)
  {
    this.start = ((new Date()).getTime())-(3600000*hours);	//Get start time
    this.end = (new Date()).getTime();	//Get end time
  },
  
  'resetDomain':function() {
    this.start = +new Date - (3600000*24.0); //show 24 hours worth of data at first load
    this.end = +new Date;
  },
  
  'zoomout':function ()
  {
    var time_window = this.end - this.start;
    var middle = this.start + time_window / 2;
    time_window = time_window * 2;
    this.start = middle - (time_window/2);
    this.end = middle + (time_window/2);
  },

  'zoomin':function ()
  {
    var time_window = this.end - this.start;
    var middle = this.start + time_window / 2;
    time_window = time_window * 0.5;
    this.start = middle - (time_window/2);
    this.end = middle + (time_window/2);
  },

  'panright':function ()
  {
    var time_window = this.end - this.start;
    var shiftsize = time_window * 0.2;
    this.start += shiftsize;
    this.end += shiftsize;
  },

  'panleft':function ()
  {
    var time_window = this.end - this.start;
    var shiftsize = time_window * 0.2;
    this.start -= shiftsize;
    this.end -= shiftsize;
  },
}