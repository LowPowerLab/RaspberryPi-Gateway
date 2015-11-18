// *******************************************************************************
// This is the logging storage engine for the Moteino Gateway.
// It is a vast improvement over storing data in memory (previously done in neDB)
// http://lowpowerlab.com/gateway
// Some of this work was inspired by work done by Timestore and OpenEnergyMonitor:
//          - http://www.mike-stirling.com/redmine/projects/timestore
//          - https://github.com/openenergymonitor/documentation/blob/master/BuildingBlocks/TimeSeries/variableinterval.md
// *******************************************************************************
// Data is stored in binary files, each record is 9 bytes:
//     - 1 reserved byte
//     - 4 datetime bytes (1 second resolution unix epoch timestamps)
//     - 4 bytes value with up to 4 decimals resolution (given value is multiplied by 10K going in, and divided by 10K coming out)
//     NOTE: data with greater resolution than specified above will be truncated
//     NOTE: timestamps are whole integers, in seconds, so javascript timestamps have to be divided by 1000 before being passed in
// *******************************************************************************
var fs = require('fs');
var metrics = require('./metrics.js');

exports.getLogName = function(nodeId, metricId) {
  return ('0000' + nodeId).slice(-4) + '_' + metricId + '.bin'; //left pad log names with zeros
}

exports.getData = function(filename, start, end, dpcount) {
  dpcount = dpcount || 600;
  //console.log('getData: ' + filename + ',' + start + ','+end+','+dpcount);
  if (dpcount>1500) dpcount = 1500;
  if (dpcount<1) dpcount = 1;
  if (dpcount<1 || start > end) return {};

  var ts = new Date();
  fd = fs.openSync(filename, 'r');
  filesize = exports.fileSize(filename);
  interval = (end - start) / dpcount;

  // Ensure that interval request is less than 1, adjust number of datapoints to request if interval = 1
  if (interval<1) {
    interval = 1;
    dpcount = (end - start) / interval;
  }

  data = [];
  timetmp = 0;
  buff = new Buffer(9);

  for (var i=0; i<dpcount; i++)
  {
    pos = exports.binarySearch(fd,start+(i*interval),filesize);
    //console.log(i +' pos: ' + pos);
    last_time = timetmp;
    fs.readSync(fd, buff, 0, 9, pos);
    timetmp = buff.readUInt32BE(1);
    value = buff.readInt32BE(5);

    if ((timetmp!=last_time && timetmp>last_time) || last_time==0) {
      var item = {t:timetmp*1000, v:value/10000};
      //console.log('pos: ' + pos + ':' + JSON.stringify(item));
      data.push(item);
    }
  }
  fs.closeSync(fd);

  return {data:data, queryTime:(new Date() - ts)};
}

exports.postData = function post(filename, timestamp, value) {
  if (!metrics.isNumeric(value)) value = 999; //catch all value
  var logsize = exports.fileSize(filename);
  if (logsize % 9 > 0) throw 'File ' + filename +' is not multiple of 9bytes, post aborted';

  var fd;
  var buff = new Buffer(9);
  var tmp = 0, pos = 0;
  value=Math.round(value*10000); //round to make an exactly even integer

  //prepare 9 byte buffer to write
  buff.writeInt8(0,0);             //flag byte
  buff.writeUInt32BE(timestamp,1); //timestamp 4 bytes
  buff.writeInt32BE(value,5);     //value 4 bytes

  // If there is data then read last value
  if (logsize>=9) {
    // read the last value appended to the file
    fd = fs.openSync(filename, 'r');
    var buf4 = new Buffer(4);
    fs.readSync(fd, buf4, 0, 4, logsize-8);
    tmp = buf4.readInt32BE(0); //read timestamp (bytes 1-4 bytes in buffer)
    fs.closeSync(fd);

    if (timestamp > tmp)
    {
      //timestamp is in the future, append
      fd = fs.openSync(filename, 'a');
      fs.writeSync(fd, buff, 0, 9, logsize);
      fs.closeSync(fd);
    }
    else
    {
      //timestamp is somewhere in the middle of the log, identify exact timestamp to update
      fd = fs.openSync(filename, 'r');
      pos = exports.binarySearchExact(fd,timestamp,logsize);
      //console.log('pos found:' + pos);
      fs.closeSync(fd);

      if (pos!=-1)
      {
        fd = fs.openSync(filename, 'r+');
        fs.writeSync(fd, buff, 0, 9, pos);
        fs.closeSync(fd);
      }
    }
  }
  else
  {
    //empty log, just append data point
    fd = fs.openSync(filename, 'a');
    fs.writeSync(fd, buff, 0, 9, 0);
    fs.closeSync(fd);
  }

  return value;
}

exports.binarySearch = function(fileDescriptor,timestamp, filesize) {
  start = 0;
  end = filesize-9;
  var buff = new Buffer(4);
  var time = 0;

  // 30 here is our max number of itterations the position should usually be found within 20 iterations
  for (i=0; i<30; i++)
  {
    //console.log('.');
    // Get the value in the middle of our range
    mid = start + Math.round((end-start)/16)*9;
    fs.readSync(fileDescriptor, buff, 0, 4, mid+1);
    time = buff.readUInt32BE(0);
    // If it is the value we want then exit
    if (time==timestamp) return mid;

    // If the query range is as small as it can be 1 datapoint wide: exit
    if ((end-start)==9) return (mid-9);

    // If the time of the last middle of the range is more than our query time then next itteration is lower half less than our query time then nest ittereation is higher half
    if (timestamp>time) start = mid; else end = mid;
  }
}

exports.binarySearchExact = function(fileDescriptor, timestamp, filesize) {
  if (filesize==0) return -1;
  start = 0; end = filesize-9;
  var buff = new Buffer(4);
  var tmp = 0;
  for (i=0; i<30; i++)
  {
    mid = start + Math.round((end-start)/18)*9;
    //console.log('mid:' + mid);
    fs.readSync(fd, buff, 0, 4, mid+1);
    tmp = buff.readUInt32BE(0);
    //console.log('tmp:' + tmp);
    if (tmp==timestamp) return mid;
    if ((end-start)==9)
    {
      fs.readSync(fd, buff, 0, 4, start+1);
      tmp = buff.readUInt32BE(0);
      return (tmp==timestamp) ? start : -1;
    }
    if (timestamp>tmp) start = mid; else end = mid;
  }
  return -1;
}

exports.fileSize = function(filename) {
  return fs.existsSync(filename) ? fs.statSync(filename)['size'] : -1;
}
