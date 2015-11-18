RaspberryPi Gateway Web Interface for the Moteino IoT Framework
----------------
By Felix Rusu (lowpowerlab.com/contact)
<br/>

###Features:
- SSL Encrypted with self signed certificate
- auth_basic Authenticated
- realtime websocket driven using node.js and socket.io
- [neDB](https://github.com/louischatriot/nedb) storage of node data and logs
- [flot](http://flotcharts.org/) front end graphs
- [Font-awesome](http://htmlpreview.github.io/?https://github.com/dotcastle/jquery-mobile-font-awesome/blob/master/index.html) icons for jQuery-Mobile

###License
This source code is released under GPL 3.0 with the following ammendment:<br/>
You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
For more details see [license.txt](https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/license.txt)

###Details & Setup Guide
http://lowpowerlab.com/gateway

###Quick reference:
- Copy index.html, graphHelper.js and images, sounds subfolders in your /var/www/default/ folder.
- Copy gateway.js, metrics.js, logUtil.js, settings.js in your /home/pi/moteino folder.
- Adjust any email/password/SMS settings in settings.js
- Connect a Moteino to your Pi through the serial port or USB if you have a MoteinoUSB. It should be running [this gateway sketch](https://github.com/LowPowerLab/RFM69/tree/master/Examples/PiGateway). Verify the settings in the sketch to match the hardware and also the encryption key and network ID should be the same on all nodes.
- Ensure nginx/webserver is running
- Ensure your gateway.js script runs at boot (see the [Pi Stack Setup guide](http://lowpowerlab.com/gateway/#pisetup) and the [Gateway app setup](http://lowpowerlab.com/gateway/#sourcecode)). Otherwise if you want to manually start it or see the output it generates to the console start it with 'node gateway.js &'. If you want to manually start it and ensure it persists after you logout use 'nohup node gateway.js &'

###Video Overview & Demo
https://www.youtube.com/watch?v=F15dEqZ4pMM
