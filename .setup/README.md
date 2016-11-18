Moteino IoT Gateway App setup for RaspberryPi
---------------------------------

Setup your vanilla raspbian with the Gateway app like this:

- `cd /home/pi`
- `sudo wget https://github.com/LowPowerLab/RaspberryPi-Gateway/blob/master/.setup/gatewaysetup.sh`
- `sudo bash shutdownchecksetup.sh && sudo rm shutdownchecksetup.sh`

Files in this directory:

- `gatewaysetup.sh`: the setup script itself, mentioned above
- `default`: **nginx** website configuration for the Gateway app
- `gateway.service`: **systemd** service configuration required to start and monitor the Gateway app