# Docker Persistent Volume
Items stored in this directory will be persistent across runs of the Docker container. The files will also be available outside of the container for easy editing.

To mount the volume so it can be persisted use a docker command like the one listed below. `docker run -v /directory/on/host:/data <containername>`

## Directory Structure
- _/data/db/_ - contains the database.
- _/data/secure/_ - contains TLS key data and the .htpasswd file used for authentication.
- _/data/config/_ - contains the configuration files used by the application.
