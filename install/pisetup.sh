#Setup Pi for calendar operation

function setup_hostname
{
    echo "Please enter new hostname and press enter"
    read NAME
    echo $NAME | sudo tee  /etc/hostname
    sudo sed -i -e 's/^.*hostname-setter.*$//g' /etc/hosts
    echo "127.0.1.1      " $NAME " ### Set by hostname-setter"  | sudo tee -a /etc/hosts
    sudo service hostname.sh stop
    sudo service hostname.sh start
    echo "You should reboot for changes to take effect"
}

function setup_ssh
{
    sudo systemctl enable ssh
}

function create_start_kiosk {
    echo "Creating start_kiosk file..."
    cat << EOF > /home/pi/start_kiosk.sh
#!/bin/bash

# disable DPMS (Energy Star) features.
xset -dpms

# disable screen saver
xset s off

# don't blank the video device
xset s noblank

# disable mouse pointer
unclutter &

# run window manager
matchbox-window-manager -use_cursor no -use_titlebar no  &

#rotate screen (optional)
#xrandr --output HDMI-1 --rotate left

# run browser
chromium-browser --kiosk --disable-session-crashed-bubble --disable-infobars http://127.0.0.1:5000
EOF

    chmod +x /home/pi/start_kiosk.sh

    cat << EOF > /home/pi/watch_chromium.sh
#!/bin/bash

# Endlosschleife
while true; do
    # Überprüfen, ob ein Chromium-Prozess läuft.
    if ! pidof chromium > /dev/null 2>&1; then
        echo "Chromium läuft nicht. Systemstart wird durchgeführt..."
        # Reboot durchführen (root-Rechte erforderlich)
        sudo reboot
    fi
    # 30 Sekunden warten, bevor erneut geprüft wird.
    sleep 10
done
EOF

    chmod +x /home/pi/watch_chromium.sh

    echo 'pi      ALL=NOPASSWD:/usr/sbin/reboot' | sudo EDITOR='tee -a' visudo
}

function autologin
{
    sudo systemctl set-default multi-user.target
    sudo ln -fs /lib/systemd/system/getty@.service /etc/systemd/system/getty.target.wants/getty@tty1.service
    sudo bash -c "cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
EOF"

sudo gpasswd -a pi tty
sudo sed -i '/^exit 0/c\chmod g+rw /dev/tty?\nexit 0' /etc/rc.local

    echo "Adding lines to /home/pi/.bashrc..."
    cat << EOF >> /home/pi/.bashrc

if [ -z "\${SSH_TTY}" ]; then
  xinit ~/start_kiosk.sh
fi
EOF

}

function install_cec
{
    sudo apt install -y cec-utils
}

function install_packets
{
    sudo apt-get update
    sudo apt-get dist-upgrade -y
    sudo apt-get install -y matchbox-window-manager xserver-xorg x11-xserver-utils unclutter xinit xdotool

    sudo apt install -y chromium-browser
    
    #fonts
    mkdir ~/tmp
    cd tmp
    wget https://fontsdata.com/zipdown-segoeuiemoji-132714.htm 
    wget https://noto-website.storage.googleapis.com/pkgs/NotoColorEmoji-unhinted.zip
    mv zipdown-segoeuiemoji-132714.htm segoeuiemoji.zip
    unzip segoeuiemoji.zip
    unzip NotoColorEmoji-unhinted.zip
    mkdir /home/pi/.fonts &>/dev/null
    mv seguiemj.ttf "/home/pi/.fonts/Segoe UI.ttf"
    mv NotoColorEmoji.ttf "/home/pi/.fonts/Noto Color Emoji.ttf"
    fc-cache -f -v &>/dev/null
    rm -r ~/tmp
    cd

    sudo apt-get install -y unclutter
    autologin
    create_start_kiosk
}

function install_battle_pair
{
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - &&\
    sudo apt-get install -y nodejs git

    npm -v
    nodejs -v
    cd /home/pi
    git clone https://github.com/Metropo/BattlePair.git battle-pair
    cd battle-pair
    sudo npm install -g pm2
    pm2 start app/backend/server.js
    sudo pm2 startup -u pi --hp /home/pi
    #sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi
    pm2 save
}

function disable_overscan
{
    sudo bash -c 'echo "disable_overscan=1" >> /boot/config.txt'
}

function disable_warnings
{
    sudo bash -c 'echo "avoid_warnings=1" >> /boot/config.txt'
}

# Install cron jobs
function install_cron_jobs() {
  # Reboot pi at 6:45
  (crontab -l ; echo "45 6 * * 1-5 sudo reboot") | crontab -
  
  # Turn on CEC device at 7:00 AM from Monday to Friday
  (crontab -l ; echo "0 7 * * 1-5 echo 'on 0' | cec-client -s -d 1") | crontab -
  
  # Turn off CEC device at 5:00 PM from Monday to Friday
  (crontab -l ; echo "00 17 * * 1-5 echo 'standby 0' | cec-client -s -d 1") | crontab -
  
  # refresh the display every hour
  (crontab -l ; echo "0 * * * * export DISPLAY=:0.0 && xdotool key F5") | crontab -
  
  (crontab -l ; echo "@reboot sleep 180 && export DISPLAY=:0.0 && xdotool key F5") | crontab -

  # Watch if chromium chrashed
  (crontab -l ; echo "@reboot sleep 180 && /home/pi/watch_chromium.sh") | crontab -
}

echo "Do you wish to set Hostname?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) setup_hostname; break;;
        No ) echo "Skipping Hostname"; break;;
    esac
done

echo "Do you wish to setup ssh?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) setup_ssh; break;;
        No ) echo "Skipping SSH"; break;;
    esac
done

echo "Do you wish to setup Timezone to Germany?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) sudo timedatectl set-timezone Europe/Berlin; break;;
        No ) echo "Skipping time zone"; break;;
    esac
done

echo "Do you wish apt update?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) sudo apt update; break;;
        No ) echo "Skipping apt update"; break;;
    esac
done

echo "Do you wish apt upgrade?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) sudo apt upgrade; break;;
        No ) echo "Skipping apt upgrade"; break;;
    esac
done

echo "Do you wish to install required software?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) install_packets; break;;
        No ) echo "Skipping install"; break;;
    esac
done

echo "Do you wish to install BattlePair?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) install_battle_pair; break;;
        No ) echo "Skipping install"; break;;
    esac
done

echo "Do you wish to install CEC control?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) install_cec; break;;
        No ) echo "Skipping CEC"; break;;
    esac
done

echo "Do you wish to disable overscan?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) disable_overscan; break;;
        No ) echo "Skipping overscan"; break;;
    esac
done

echo "Do you wish to disable warnings?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) disable_warnings; break;;
        No ) echo "Skipping warnings"; break;;
    esac
done

echo "Do you wish to configure cronjobs?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) install_cron_jobs; break;;
        No ) echo "Skipping cronjobs"; break;;
    esac
done
