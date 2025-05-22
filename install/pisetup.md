# Raspberry Pi Calendar / Dashboard Display Setup Guide

This manual will guide you through the process of setting up a Raspberry Pi image for use as a calendar/dashboard display. Please follow the steps below to complete the setup.

## 1. Create an SD card with Raspberry Pi OS Lite (no GUI version)

To create a bootable SD card with Raspberry Pi OS Lite, you will need the following:

- Raspberry Pi Imager: Download it from the [official website](https://www.raspberrypi.org/software/)
- or Rufus: Download it from the [official website](https://rufus.ie/)
- A microSD card (8GB or larger is recommended)

Choose either Variant A (Raspberry Pi Imager) or Variant B (Rufus) for creating the SD card.

### Variant A: Raspberry Pi Imager

1. Insert the microSD card into your computer.
2. Open Raspberry Pi Imager and click on "Choose OS".
3. Select the downloaded Raspberry Pi OS Lite (32 Bit) bookworm (latest) image.
4. Click on "Choose SD Card" and select your microSD card from the list of available devices.
5. Click on "Write" to begin the process.
6. Once the Raspberry Pi Imager finishes, close the application.

### Variant B: Rufus

1. Download Raspberry Pi OS Lite (32 Bit) bookworm (latest) from the [official website](https://www.raspberrypi.org/software/operating-systems/).
2. Insert the microSD card into your computer.
3. Open Rufus and click on "Select" to choose the downloaded Raspberry Pi OS Lite image.
4. Choose your microSD card from the "Device" dropdown list.
5. Click on "Start" to begin the process.
6. Once Rufus finishes, close the application.

## 2. Enable SSH with SSH file in boot

To enable SSH access on your Raspberry Pi, create an empty file named `ssh` (with no file extension) in the boot partition of the SD card:

1. Navigate to the boot partition of the SD card using your computer's file explorer.
2. Right-click in the file explorer, and choose "New" > "Text Document".
3. Name the file `ssh` and remove the `.txt` extension.
4. Confirm the change of file extension when prompted.

## 3. Copy the pisetup.sh & MA_Root_CA.crt files to the boot partition

Copy the `pisetup.sh` script to the root of the boot partition on the SD card.

## 4. Boot the Pi and set up the user

1. Safely eject the microSD card from your computer and insert it into the Raspberry Pi.
2. Connect the Raspberry Pi to a power source and wait for it to boot up.
3. Follow the setup menu displayed at startup. Use this credentials:
   - Username: pi
   - Password: grandMA3

## 5. Set Wi-Fi country with sudo raspi-config

1. Run `sudo raspi-config` to open the Raspberry Pi configuration tool.
2. Navigate to "Localisation Options" > "WLAN Country".
3. Choose `DE Germany` from the list and press "OK".
4. Choose `System Options` and `S1 Wirless LAN`
5. Enter Wifi crendentials
6. Press "Finish" to exit raspi-config.

## 6. Start pisetup.sh without sudo (make sure it is executable)

1. Change the permissions of the script to make it executable:

`sudo chmod +x /boot/firmware/pisetup.sh`

2. Run the script without sudo:

`/boot/firmware/pisetup.sh`

## 7. Complete the Hostname and Wi-Fi setup steps of the script

Follow the prompts within the `pisetup.sh` (without sudo) script to set up the hostname and Wi-Fi settings for your Raspberry Pi. Cancel the script after this with `Strg + C`.

## 8. Reboot the system

Reboot the Raspberry Pi by running the following command:
`sudo reboot`


## 9. Start pisetup.sh again, skip hostname and Wi-Fi

1. SSH back into the Raspberry Pi after it has rebooted.
2. Run the `pisetup.sh` script again (without sudo):
`/boot/pisetup.sh`
3. When prompted, skip the hostname and Wi-Fi setup steps, as these have already been completed. You can also skip the SSH and password setting steps if they are already set up.

## 10. Optional screen rotation

1. Set optional screen rotation in start_kiosk.sh (normal left right inverted)

## 11. Enable Overlay FS in raspi-config to write-protect the SD card

Write-protecting the SD card with Overlay FS helps prevent corruption in case of power loss.

1. Run `sudo raspi-config` to open the Raspberry Pi configuration tool.
2. Navigate to "Performance Options" > "Overlay FS".
3. Select "Yes" to enable Overlay FS, and press "OK".
4. Press "Finish" to exit raspi-config.
5. Reboot the Raspberry Pi for the changes to take effect:
`sudo reboot`

## 12. Reboot and test the calendar/dashboard display

After completing the setup, reboot your Raspberry Pi and test your calendar/dashboard display.

1. Reboot the Raspberry Pi by running the following command:
`sudo reboot`
2. After the Raspberry Pi has restarted, ensure that your calendar/dashboard display is functioning as expected. Enjoy the convenience of having a dedicated screen for important information.


Congratulations! Your Raspberry Pi is now set up as a calendar/dashboard display.

