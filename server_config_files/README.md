Nginx init.d raspberry pi setup
---------------------------------
This file should end up in your */etc/init.d* directory after running:

- sudo chmod +x /etc/init.d/nginx
- sudo update-rc.d -f nginx defaults

If not or if that fails, you could try placing it there manually. Just copy the "nginx" file to your */etc/init.d* directory. You also need to make sure all the paths are correct or adjusted to your own nginx installation.
For more details see parent github project (Raspberry Pi Home Automation Gateway Setup).