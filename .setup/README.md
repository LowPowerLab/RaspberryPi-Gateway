Moteino IoT Gateway App setup for RaspberryPi
---------------------------------

This was tested on RaspberryPi2 (armv6) and RaspberryPi3 (armv7).
Setup your raw vanilla raspbian image (ex raspbian jessie lite) with the Gateway app like this:

- `cd /home/pi`
- `sudo wget https://raw.githubusercontent.com/LowPowerLab/RaspberryPi-Gateway/master/.setup/gatewaysetup.sh`
- `sudo bash gatewaysetup.sh && sudo rm gatewaysetup.sh`

Files in this directory:

- `gatewaysetup.sh`: the setup script itself, mentioned above
- `default`: **nginx** website configuration for the Gateway app
- `gateway.service`: **systemd** service configuration required to start and monitor the Gateway app