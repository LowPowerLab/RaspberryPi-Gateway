exports.credentials = {
  emailservice : 'gmail',                  //default is gmail, see nodemailer reference for other clients - https://github.com/andris9/Nodemailer
  email : '_________@gmail.com',           //put your gmail address here
  emailpass : '_____________',             //put your gmail password or app access code here
  emailAlertsTo : '__________@gmail.com',  //put your alert/notification email here (can be the same as above)
  smsAlertsTo : '__________@txt.att.net',  //if you want SMS notifications, fill this in with your phone number (it's your cell#, domain differs for each carrier, ex: 5551234567@vtext.com for verizon)
};

exports.serial = {
  port : '/dev/ttyAMA0', //replace this with whatever serial port you have on your Pi/gateway (ttyAMA0 is the default GPIO serial port)
  baud : 115200,
};

exports.database = {
  name : 'gateway.db',
  logName : 'gatewayLog.db',
  logTimespan : 604800000, //604800000ms = 1 week (keep up to 1 week worth of data in the log)
  nonMatchesName : 'gateway_nonmatches.db',
  compactDBInterval : 86400000,
};

exports.general = {
  consoleLogDateFormat : 'mm-dd-yy_HH:MM:ss.l',
  socketPort : 8080,
};