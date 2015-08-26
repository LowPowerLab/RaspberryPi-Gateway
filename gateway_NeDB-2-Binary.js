//RUN THIS FILE TO CONVERT OLD neDB gatewayLog.db database into binary files for the new gateway.js script
//if you don't, gateway.js will just start logs from scratch as if you ran it the first time
var settings = require('./settings.js');
var Datastore = require('nedb');
var path = require('path');
var fs = require('fs');
var neDBLogName = settings.database.logName || 'gatewayLog.db';

//move DBs in the 'db' directory
if (!fs.existsSync(path.join(__dirname, 'db'))) fs.mkdirSync(path.join(__dirname, 'db'));
if (fs.existsSync('gateway.db')) fs.renameSync('gateway.db', path.join(__dirname, 'db', settings.database.name));
if (fs.existsSync('gateway_nonmatches.db')) fs.renameSync('gateway_nonmatches.db', path.join(__dirname, 'db', settings.database.nonMatchesName));
if (fs.existsSync(path.join(__dirname, 'gatewayLog.db'))) fs.renameSync(path.join(__dirname, 'gatewayLog.db'), path.join(__dirname, 'db', neDBLogName));

console.log('Converting neDB database to binaries: ' + path.join(__dirname, 'db', neDBLogName) + '..');
//Convert the LOG data to binary
if (fs.existsSync(path.join(__dirname, 'db', neDBLogName)))
{
  var dbLog = new Datastore({ filename: path.join(__dirname, 'db', neDBLogName), autoload: true }); //used to keep all logging/graph data
  var fs = require('fs');
  var collections = {};
  var arrays={};

  dbLog.find({}, function (err, docs) {
    for (var k in docs)
      if (docs[k].n && docs[k].m && docs[k]._id && docs[k].v)
      {
        node = ('0000' + docs[k].n).slice(-4); //pad key with 0s
        collections[node + '_' + docs[k].m] = (collections[node + '_' + docs[k].m] || '') + (Math.round(docs[k]._id/1000)) + ',' + docs[k].v + '\n';
        if (arrays[node + '_' + docs[k].m] == undefined) arrays[node + '_' + docs[k].m] = [];
        arrays[node + '_' + docs[k].m].push({t:Math.round(docs[k]._id/1000),v:docs[k].v});
      }

    // //write CSV files
    // for (var k in collections)
    // {
      // //console.log(k + '____:' + collections[k]);
      // fname = path.join(__dirname, 'db', k + '.csv');
      // if (fs.existsSync(fname)) fs.unlinkSync(fname); //remove it
      // fs.appendFileSync(fname, collections[k], 'utf8');
    // }

    //write binary files
    var time = new Date().getTime();
    var buff = new Buffer(9);
    for (var k in arrays)
    {
      fname = path.join(__dirname, 'db', k + '.bin');
      if (fs.existsSync(fname)) fs.unlinkSync(fname); //remove it
      fd = fs.openSync(fname, 'a');
      var i=0;
      for (var ak in arrays[k])
      {
        val = Math.round(arrays[k][ak].v * 10000); //generate decimal part, rounding is important to avoid double precision out of bounds when calling buff.writeInt32BE
        val = val > 2147483647 ? 2147483647 : val;
        buff.writeInt8(0,0);
        buff.writeUInt32BE(arrays[k][ak].t,1); //big endian
        buff.writeInt32BE(val,5);
        fs.writeSync(fd, buff, 0, 9, 9*(i++));
      }
      fs.closeSync(fd);
    }
    console.log('BIN write files time spent(ms):' + (new Date().getTime() - time));
    if (fs.existsSync(path.join(__dirname, 'db', 'gatewayLog.db'))) fs.renameSync(path.join(__dirname, 'db', 'gatewayLog.db'), path.join(__dirname, 'db', settings.database.logName+'_OLD'));
    console.log('Done...Databases have been moved and converted in the ' + path.join(__dirname, 'db') +  ' directory');
    console.log('THE END');
  });
}
else console.log('Nothing to do, ' + path.join(__dirname, 'db', neDBLogName) + ' not found, bye.');