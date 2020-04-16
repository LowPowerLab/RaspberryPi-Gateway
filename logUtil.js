// *******************************************************************************
// This is the logging storage engine for the Moteino IoT Gateway.
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
var path = require('path');
var metrics = require(path.resolve(__dirname,'metrics/core.js'));

exports.getLogName = function(nodeId, metricId) {
  if (metrics.isNumeric(nodeId))
    nodeId = ('0000' + nodeId).slice(-4);
  return nodeId + '_' + metricId + '.bin'; //left pad log names with zeros
}

exports.getData = function(filename, start, end, dpcount) {
  dpcount = dpcount || 1500;
  if (dpcount<1) dpcount = 1;
  if (dpcount<1 || start > end) return {};

  var ts = new Date();
  data = [];
  
  filesize = exports.fileSize(filename);
  if (filesize == -1) return {data:data, queryTime:0, msg:'no log data'};
  fd = fs.openSync(filename, 'r');
  
  //truncate start/end to log time limits if necessary - this ensures good data resolution when time limits are out of bounds
  var buff = Buffer.alloc(9);
  fs.readSync(fd, buff, 0, 9, 0);
  var firstLogTimestamp = buff.readUInt32BE(1);
  fs.readSync(fd, buff, 0, 9, filesize-9);
  var lastLogTimestamp = buff.readUInt32BE(1); //read timestamp (bytes 0-3 in buffer)
  if (start < firstLogTimestamp) start = firstLogTimestamp;
  if (end > lastLogTimestamp) end = lastLogTimestamp;

  //console.info('getData() [start,end] = ' + start + ', ' + end);
  
  interval = (end - start) / dpcount;

  // Ensure that interval request is less than 1, adjust number of datapoints to request if interval = 1
  if (interval<1) {
    interval = 1;
    dpcount = (end - start) / interval;
  }

  timetmp = 0;
  deleted=0;

  //first check if sequential reads (much faster) make sense
  posStart = exports.binarySearch(fd,start-interval,filesize);
  posEnd = exports.binarySearch(fd,end+interval,filesize);
  if (posStart < posEnd && (posEnd-posStart)/9 < dpcount*1.1)
  {
    //console.info('getData() reading ' + ((posEnd-posStart)/9) + ' sequential points!');
    for (var i=posStart; i<=posEnd; i+=9)
    {
      fs.readSync(fd, buff, 0, 9, i);
      timetmp = buff.readUInt32BE(1);
      if (buff.readUInt8(0) !== 0) { deleted++;continue; } //skip deleted data
      if (!(timetmp >= start && timetmp <= end)) continue;
      value = buff.readInt32BE(5);
      data.push({t:timetmp*1000, v:value/10000});
    }
    return {
      data:data,
      queryTime:(new Date() - ts),
      totalIntervalDatapoints: (posEnd-posStart)/9+1,
      totalDatapoints:filesize/9,
      logSize:filesize
    };
  }
  
  //too many data points, use binarySearch to aggregate
  for (var i=0; i<dpcount; i++)
  {
    pos = exports.binarySearch(fd,start+(i*interval),filesize);
    last_time = timetmp;
    fs.readSync(fd, buff, 0, 9, pos);
    timetmp = buff.readUInt32BE(1);
    if (buff.readUInt8(0) !== 0) { deleted++;continue; } //skip deleted data
    if (!(timetmp >= start && timetmp <= end)) continue;
    value = buff.readInt32BE(5);

    if ((timetmp!=last_time && timetmp>last_time) || last_time==0) {
      var item = {t:timetmp*1000, v:value/10000};
      data.push(item);
    }
    if (pos == filesize-9) break;
  }
  fs.closeSync(fd);

  return {
    data:data,
    queryTime:(new Date() - ts),
    totalIntervalDatapoints: (posEnd-posStart)/9+1-deleted,
    totalDatapoints:filesize/9-deleted,
    logSize:filesize
  };
}

// filename:  binary file to append new data point to
// timestamp: data point timestamp (seconds since unix epoch)
// value:     data point value (signed integer)
// duplicateInterval: if provided a duplicate value is only posted after this many seconds
exports.postData = function post(filename, timestamp, value, duplicateInterval) {
  if (!metrics.isNumeric(value)) value = 999; //catch all value
  var logsize = exports.fileSize(filename);
  if (logsize % 9 > 0) throw 'File ' + filename +' is not multiple of 9bytes, post aborted';

  var fd;
  var buff = Buffer.alloc(9);
  var lastTime = 0, lastValue = 0, pos = 0;
  value=Math.round(value*10000); //round to make an exactly even integer

  //prepare 9 byte buffer to write
  buff.writeInt8(0,0);             //flag byte
  buff.writeUInt32BE(timestamp,1); //timestamp 4 bytes
  buff.writeInt32BE(value,5);     //value 4 bytes

  // If there is data then read last value
  if (logsize>=9) {
    // read the last value appended to the file
    fd = fs.openSync(filename, 'r');
    var buf8 = Buffer.alloc(8);

    fs.readSync(fd, buf8, 0, 8, logsize-8);
    lastTime = buf8.readUInt32BE(0); //read timestamp (bytes 0-3 in buffer)
    lastValue = buf8.readInt32BE(4); //read value (bytes 4-7 in buffer)
    fs.closeSync(fd);

    if (timestamp > lastTime)
    {
      if (value != lastValue || (duplicateInterval==null || timestamp-lastTime>duplicateInterval)) //only write new value if different than last value or duplicateInterval seconds has passed (should be a setting?)
      {
        //timestamp is in the future, append
        fd = fs.openSync(filename, 'a');
        fs.writeSync(fd, buff, 0, 9, logsize);
        fs.closeSync(fd);
      }
    }
    else
    {
      //timestamp is somewhere in the middle of the log, identify exact timestamp to update
      fd = fs.openSync(filename, 'r');
      pos = exports.binarySearchExact(fd,timestamp,logsize);
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

exports.editData = function(filename, start, end, newValue) {
  if (!metrics.isNumeric(newValue))
  {
    console.error('editData FAIL: newValue \''+newValue+'\' is not numeric');
    return 0;
  }
  else newValue=Math.round(newValue*10000); //round to make an exactly even integer

  var edited=0;
  fd = fs.openSync(filename, 'r');
  posStart = exports.binarySearch(fd,start,filesize);
  posEnd = exports.binarySearch(fd,end,filesize);
  fs.closeSync(fd);

  if (posStart <= posEnd)
  {
    var buff = Buffer.alloc(9);
    fd = fs.openSync(filename, 'r+');
    for (var i=posStart; i<=posEnd; i+=9)
    {
      fs.readSync(fd, buff, 0, 9, i);
      if (buff.readUInt8(0) !== 0) { continue; } //skip deleted data
      //value = buff.readInt32BE(5);
      buff.writeInt32BE(newValue,5); //change value only
      //timeStamp = buff.readUInt32BE(1);
      //console.log('******* editData @ ' + i + ' : ' + timeStamp + ' : ' + value + ' -> ' + newValue);
      edited++;
      fs.writeSync(fd, buff, 0, 9, i);
    }
    fs.closeSync(fd);
  }
  return edited;
}

exports.deleteData = function(filename, start, end) {
  var deleted=0;
  fd = fs.openSync(filename, 'r');
  posStart = exports.binarySearch(fd,start,filesize);
  posEnd = exports.binarySearch(fd,end,filesize);
  fs.closeSync(fd);

  if (posStart <= posEnd)
  {
    var buff = Buffer.alloc(9);
    fd = fs.openSync(filename, 'r+');
    for (var i=posStart; i<=posEnd; i+=9)
    {
      fs.readSync(fd, buff, 0, 9, i);
      buff.writeInt8(1,0); //flag for deletion
      //timeStamp = buff.readUInt32BE(1);
      //value = buff.readUInt32BE(5);
      //console.log('******* deleteData @ ' + i + ' : ' + timeStamp + ' : ' + value);
      deleted++;
      fs.writeSync(fd, buff, 0, 1, i);
    }
    fs.closeSync(fd);
  }
  return deleted;
}

exports.binarySearch = function(fileDescriptor, timestamp, filesize) {
  start = 0;
  end = filesize-9;
  var buff = Buffer.alloc(4);
  var time = 0;

  fs.readSync(fileDescriptor, buff, 0, 4, end+1);
  time = buff.readUInt32BE(0);
  if (timestamp >= time) return end;
  
  // 30 here is our max number of iterations, the position should usually be found within 20 iterations
  for (i=0; i<30; i++)
  {
    // Get the value in the middle of our range
    mid = start + Math.round((end-start)/18)*9;
    fs.readSync(fileDescriptor, buff, 0, 4, mid+1);
    time = buff.readUInt32BE(0);
    // If it is the value we want then exit
    if (time==timestamp) return mid;

    // If the query range is as small as it can be 1 datapoint wide: exit
    if ((end-start)==9) return (mid-9);

    // If the time of the last middle of the range is more than our query time then next iteration is lower half less than our query time then nest iteration is higher half
    if (timestamp>time) start = mid; else end = mid;
  }
  return mid;
}

exports.binarySearchExact = function(fileDescriptor, timestamp, filesize) {
  if (filesize==0) return -1;
  start = 0; end = filesize-9;
  var buff = Buffer.alloc(4);
  var tmp = 0;
  for (i=0; i<30; i++)
  {
    mid = start + Math.round((end-start)/18)*9;
    fs.readSync(fileDescriptor, buff, 0, 4, mid+1);
    tmp = buff.readUInt32BE(0);
    if (tmp==timestamp) return mid;
    if ((end-start)==9)
    {
      fs.readSync(fileDescriptor, buff, 0, 4, start+1);
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

exports.removeMetricLog = function(logfile) {
  if (exports.fileSize(logfile) >= 0)
  {
    fs.unlinkSync(logfile);
    console.warn('removeMetricLog(): removed (' + logfile + ')');
  }
  else
    console.log('removeMetricLog(): no log file found (' + logfile + ')');
}