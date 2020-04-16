#########################################################################
#  Gateway setup script for RaspberryPi
#  LowPowerLab.com/gateway
#########################################################################
#!/bin/bash

RED='\033[1;31m'
GRN='\033[1;32m'
YLW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
APPSRVDIR='/home/pi/gateway/'

echo -e "${GRN}#########################################################################${NC}"
echo -e "${GRN}#                 Low Power Lab Gateway App Setup                       #${NC}"
echo -e "${GRN}#########################################################################${NC}"
echo -e "${YLW}Note: script can take long on older Pis${NC}"
echo -e "${YLW}Note: setup requires your input at certain steps${NC}"

if (whiptail --title "  Gateway User License Agreement  " --yesno "This software is licensed with CC-BY-NC-4.0 and requires a commercial license for any commercial or for-profit use.\n\nBy installing this software I certify that either:\n\n- I use this software for personal/non-profit purposes\n- I have obtained a commercial license already" 15 78) then
  echo -e "${GRN}#                 LICENSE confirmation applied.                #${NC}"
else
  echo -e "${RED}#                 License required, exiting.                #${NC}"
  exit 0
fi

# #update apt-get, distribution, kernel
echo -e "${CYAN}************* STEP: Running apt-get update *************${NC}"
sudo apt-get update -m
# echo -e "${CYAN}************* STEP: Upgrading distribution *************${NC}"
# sudo apt-get upgrade
# echo -e "${CYAN}************* STEP: Running dist-upgrade *************${NC}"
# sudo apt-get dist-upgrade

echo -e "${CYAN}************* STEP: Installing git & apache2-utils *************${NC}"
sudo apt-get -y install git apache2-utils

#install NGINX
echo -e "${CYAN}************* STEP: Install latest NGINX *************${NC}"
sudo apt-get -y install nginx

# echo -e "${CYAN}************* STEP: Install PHP7 *************${NC}"
sudo apt-get -y install php-common php-cli php-fpm

#install latest NodeJS --- https://www.raspberrypi.org/forums/viewtopic.php?t=141770
sudo wget -O - https://raw.githubusercontent.com/LowPowerLab/RaspberryPi-Gateway/master/.setup/Install-Node.sh | sudo bash

echo -e "${CYAN}************* STEP: Setup Gateway app & dependencies *************${NC}"
sudo mkdir -p $APPSRVDIR    #main dir where gateway app lives
cd $APPSRVDIR || exit

git init
git remote add origin https://github.com/LowPowerLab/RaspberryPi-Gateway.git
LASTTAG=$(curl --silent "https://api.github.com/repos/LowPowerLab/RaspberryPi-Gateway/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
WHICH=$(
whiptail --title "Choose version to install" --menu "Pick version" 16 100 9 \
	"${LASTTAG}" "Latest stable release [recommended] (git checkout)"   \
	"HEAD" "Latest available code [warning] (git pull)" --nocancel 3>&2 2>&1 1>&3
)
if [ "$WHICH" == "HEAD" ]; then
  echo -e "${RED}#    Installing LATEST GATEWAY CODE (HEAD).              #${NC}"
  #could use git clone but that requires empty target directory which won't work if executed repeatedly
  git pull origin master
else
  echo -e "${GRN}#    Installing Latest Stable (v${LASTTAG}).                #${NC}"
  git fetch --tags
  git checkout $LASTTAG
fi
rm -rf blueprints #remove irrelevant blueprints directory

sudo npm install --unsafe-perm --build-from-source
sudo npm cache verify    #clear any caches/incomplete installs
sudo mkdir $APPSRVDIR/logs -p

#create db and empty placeholders so chown pi will override root permissions
sudo mkdir $APPSRVDIR/data/db -p
touch $APPSRVDIR/data/db/gateway.db
touch $APPSRVDIR/data/db/gateway_nonmatches.db

#create self signed certificate
#WARNING: must do this *AFTER* the gateway app was git-cloned
echo -e "${CYAN}************* STEP: Create self signed HTTPS certificate (10 year) *************${NC}"
sudo mkdir $APPSRVDIR/data/secure -p
sudo openssl req -new -x509 -nodes -days 3650 -newkey rsa:2048 -out $APPSRVDIR/data/secure/server.crt -keyout $APPSRVDIR/data/secure/server.key -subj "/C=US/ST=MI/L=Detroit/O=LowPowerLab/OU=IoT Department/CN=lowpowerlab.com"
sudo chown -R pi:pi $APPSRVDIR

#create uploads dir for user icons
sudo mkdir $APPSRVDIR/www/images/uploads -p
sudo chown -R www-data:pi $APPSRVDIR/www/images/uploads

#create HTTP AUTH credentials
echo -e "${CYAN}************* STEP: Create HTTP AUTH credentials *************${NC}"
HTTPUSER=$(whiptail --inputbox "\nEnter the Gateway http_auth username:" 8 78 "pi" --title "Gateway HTTP_AUTH Setup" --nocancel 3>&1 1>&2 2>&3)
HTTPPASS=$(whiptail --passwordbox "\nEnter the Gateway http_auth password:" 10 78 "raspberry" --title "Gateway HTTP_AUTH Setup" --nocancel 3>&1 1>&2 2>&3)
touch $APPSRVDIR/data/secure/.htpasswd
htpasswd -b $APPSRVDIR/data/secure/.htpasswd $HTTPUSER $HTTPPASS
echo -e "You can change httpauth password using ${YLW}htpasswd $APPSRVDIR/data/secure/.htpasswd user newpassword${NC}"

echo -e "${CYAN}************* STEP: Copy gateway site config to sites-available *************${NC}"
cp -rf $APPSRVDIR/.setup/gateway /etc/nginx/sites-available/gateway
#determine php-fpm version and replace in gateway site config
phpfpmsock=$(grep -ri "listen = " /etc/php)
phpfpmsock=${phpfpmsock##*/}
sudo sed -i "s/PHPFPMSOCK/${phpfpmsock}/g" /etc/nginx/sites-available/gateway
cd /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/gateway
sudo service nginx restart

echo -e "${CYAN}************* STEP: Fail2Ban install *************${NC}"
if (whiptail --title "Fail2ban" --yesno "Do you want to install Fail2Ban?\nNote: Fail2Ban couples into the NGINX webserver to ban clients that make repeated failed attempts to authenticate to the Gateway App." 12 78) then
  sudo apt-get -y install fail2ban
  cp -n $APPSRVDIR/.setup/jail.local /etc/fail2ban/
  sudo service fail2ban restart
fi

echo -e "${CYAN}************* STEP: ATXRaspi/MightyHat shutdown script setup *************${NC}"
if (whiptail --title "ATXRaspi shutdown script" --yesno "Do you have a MightyHat or ATXRaspi installed on this Pi?\nNote: the script will start running only after a reboot so make sure to your ATXRaspi is wired before next boot otherwise leaving the feedback GPIO7 floating can cause unexpected reboots/shutdown!" 12 78) then
  sudo wget https://raw.githubusercontent.com/LowPowerLab/ATX-Raspi/master/shutdownchecksetup.sh
  sudo bash shutdownchecksetup.sh && sudo rm shutdownchecksetup.sh
fi

echo -e "${CYAN}************* STEP: Disable GPIO serial console *************${NC}"
sudo raspi-config nonint do_serial 1

echo -e "${CYAN}************* STEP: Disconnect GPIO/ttyAMA0 serial port from BT module *************${NC}"
echo "enable_uart=1" >> /boot/config.txt
echo "dtoverlay=pi3-disable-bt" >> /boot/config.txt

echo -e "${CYAN}************* STEP: Run raspi-config *************${NC}"
if (whiptail --title "Run raspi-config ?" --yesno "Would you like to run raspi-config?\nNote: you should run this tool and configure the essential settings of your Pi if you haven't done it yet!" 12 78) then
  sudo raspi-config
fi

echo -e "${CYAN}************* STEP: Configuring logrotate *************${NC}"
sudo echo "#this is used by logrotate and should be placed in /etc/logrotate.d/
#rotate the gateway logs and keep a limit of how many are archived
#note: archives are rotated in $APPSRVDIR/logs so that dir must exist prior to rotation
$APPSRVDIR/logs/*.log {
        size 20M
        missingok
        rotate 20
        dateext
        dateformat -%Y-%m-%d
        compress
        notifempty
        nocreate
        copytruncate
}" | sudo tee /etc/logrotate.d/gateway

echo -e "${CYAN}************* STEP: Setup Gateway service ... *************${NC}"
sudo cp $APPSRVDIR/.setup/gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gateway.service
sudo systemctl start gateway.service

echo -e "${CYAN}************* STEP: Proftpd install *************${NC}"
if (whiptail --title "Proftpd" --yesno "Do you want to install Proftpd?\nNote: Proftpd makes it easy to connect to the Pi via FTP." 12 78) then
  sudo apt-get -y install proftpd
fi

sudo apt-get clean

echo -e "${RED}Make sure: ${YLW}to edit your gateway settings from the UI or from settings.json5 (and restart to apply changes)${NC}"
echo -e "${RED}By default ${YLW}the gateway app uses the GPIO serial port. Run ${GRN}raspi-config${NC} and ensure the GPIO serial is enabled and GPIO console is disabled.${NC}"
echo -e "${YLW}If you use MoteinoUSB or another serial port you must edit the serial port setting or the app will not receive messages from your Moteino nodes.${NC}"
echo -e "${RED}App restarts ${YLW}can be requested from the Gateway UI (power symbol button on settings page, or from the terminal via ${RED}sudo systemctl restart gateway.service${NC}"
echo -e "${RED}Don't forget: ${YLW}install minicom - useful for serial port debugging with ${GRN}sudo apt-get install minicom${NC}"
echo -e "${RED}Adding users: ${YLW}You can run tool again to add more gateway users (skip all other steps, reboot when done)${NC}"
echo -e "${RED}! Important : ${YLW}If not done already - configure your Pi core settings (timezone, expand SD etc) by running ${GRN}raspi-config${NC}"

# echo -e "${CYAN}************* STEP: Run raspi-config *************${NC}"
# if (whiptail --title "Run raspi-config ?" --yesno "Would you like to run raspi-config now?\nNote: you should run this tool if you haven't done it yet!\nAlso: raspi-config allows a reboot after changes" 10 80) then
  # sleep 5
  # sudo raspi-config
# fi

echo -e "${CYAN}************* ALL DONE! *************${NC}"
cd ~/
exit 0
