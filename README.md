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

###License
This source code is released under GPL 3.0 with the following ammendment:<br/>
You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
For more details see [license.txt](https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/license.txt)

###Details & Setup Guide
http://lowpowerlab.com/gateway

###Quick reference:
- Copy index.php, graphHelper.js and images, sounds subfolders in your /var/www/default/ folder.
- Copy gateway.js, metrics.js in your /home/pi/moteino folder.
- Adjust any email settings in these files
- Connect a Moteino to your Pi through the serial port or USB if you have a MoteinoUSB. It should be running [this gateway sketch](https://github.com/LowPowerLab/RFM69/tree/master/Examples/PiGateway). Verify the settings in the sketch to match the hardware and also the encryption key and network ID should be the same on all nodes.

###Video Overview & Demo
https://www.youtube.com/watch?v=F15dEqZ4pMM

###Older version
There was an older version, very simplistic and kept in this repository for reference (see OLD sub folder).
<br/>
That version is documented in a series of blog posts: [here](http://lowpowerlab.com/blog/2013/10/07/raspberrypi-home-automation-gateway-setup/) and [here](http://lowpowerlab.com/blog/2013/10/11/raspberrypi-home-automation-gateway-hardware-and-demo/).