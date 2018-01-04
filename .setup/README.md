# Moteino IoT Gateway App setup for RaspberryPi
Setup the IoT Gateway app on your your raw raspbian image (ex raspbian jessie lite) like this:

- `cd /home/pi`
- `sudo wget https://raw.githubusercontent.com/LowPowerLab/RaspberryPi-Gateway/master/.setup/gatewaysetup.sh`
- `sudo bash gatewaysetup.sh && sudo rm gatewaysetup.sh`
- `PiBakeryConfig.xml` - sample PiBakery configuration

*The gatewaysetup.sh script was tested on RaspberryPi2 (armv6) and RaspberryPi3 (armv7).*

## Files in this directory:

- `gatewaysetup.sh`: the setup script itself, mentioned above
- `default`: **nginx** website configuration for the Gateway app
- `gateway.service`: **systemd** service configuration required to start and monitor the Gateway app

## Preparing your raspbian image with PiBakery
You can use [PiBakery](http://pibakery.org) to run basic tasks like configuring your wifi, hostname and default password, before you install the Gateway app. This is very useful when you don't have a monitor/keyboard hooked up to your Pi. See sample configuration file above. Insert your blank SD card in your PC then run PiBakery with your settings, then your SD card is ready to accept the Gateway App per the instructions above. Otherwise if you have `ssh` access to your Pi you can run `gatewaysetup.sh` at any time.

[![PiBakery](http://i.imgur.com/Vga6Elc.png)](http://pibakery.org)
