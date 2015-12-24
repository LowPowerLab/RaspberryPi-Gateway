RaspberryPi Gateway Web Interface for the Moteino IoT Framework
----------------
By Felix Rusu (lowpowerlab.com/contact)
<br/>

###Features:
- SSL Encrypted with self signed certificate
- `auth_basic` authenticated
- realtime websocket driven using node.js and socket.io
- [neDB](https://github.com/louischatriot/nedb) storage of node data and logs
- [flot](http://flotcharts.org/) front end graphs
- [nconf](https://github.com/indexzero/nconf) for easy global variable configuration maintenance
- [nodemailer](https://github.com/andris9/Nodemailer) for sending email (and SMS relayed via email)
- [Font-awesome](http://htmlpreview.github.io/?https://github.com/dotcastle/jquery-mobile-font-awesome/blob/master/index.html) icons for jQuery-Mobile

###License
This source code is released under GPL 3.0 with the following ammendment:<br/>
You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
For more details see [LICENSE](https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/LICENSE)

###Details & Setup Guide
http://lowpowerlab.com/gateway

###Quick reference:
- Copy the contents of this directory in `/home/pi/gateway`
- run `npm install` in the `/home/pi/gateway` directory to install all node dependencies
- Adjust any email/password/SMS settings in `settings.json5`
- the files in the `_piConfigs` should be used to set the correct paths for nginx and to register the `upstart` gateway script
- Connect a Moteino to your Pi through the serial port or USB if you have a MoteinoUSB. It should be running [this gateway sketch](https://github.com/LowPowerLab/RFM69/tree/master/Examples/PiGateway). Otherwise if you have a [MightyHat](http://lowpowerlab.com/mightyhat) you can run [this MightyHat sketch](https://github.com/LowPowerLab/RFM69/tree/master/Examples/MightyHat) on it. Verify the settings in the sketch to match the hardware and also the encryption key and network ID should be the same on all nodes.
- Ensure nginx/webserver is running
- If your Pi is powered by an [ATXRaspi](http://lowpowerlab.com/atxraspi), a [MightyBoost](http://lowpowerlab.com/mightyboost) with [Moteino control](https://github.com/LowPowerLab/RFM69/tree/master/Examples/MightyBoostControl), or a [MightyHat](http://lowpowerlab.com/mightyhat), then add this line in `/etc/rc.local` before `exit 0`: `/etc/shutdowncheck.sh &`. This allows shutdown and reboot commands from the push of a button, see the [ATXRaspi demo video](https://www.youtube.com/watch?v=w4vSTq2WhN8) for how this works.
- Ensure your `gateway.js` script runs at boot (see the [Pi Stack Setup guide for how to set that up with upstart](http://lowpowerlab.com/gateway/#pisetup) and the [Gateway app setup](http://lowpowerlab.com/gateway/#sourcecode)). You can always use the pre-compiled Pi image that has all these things ready to go (except the settings which you should revisit anyway); this image also has upstart already configured to run the `gateway.js` app at startup. Otherwise if you want to manually start the `gateway.js` app or see the output it generates to the console start it with `node gateway.js &`. If you want to manually start it and ensure it persists after you logout use `nohup node gateway.js &`

###Video Overview & Demo
https://www.youtube.com/watch?v=F15dEqZ4pMM

###3rd party custom gateway setup overview
https://www.youtube.com/watch?v=DP83RJeTpUY