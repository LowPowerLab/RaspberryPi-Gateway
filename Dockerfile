
FROM node:0.12
#FROM resin/rpi-node:latest

RUN mkdir -p /usr/src/app && ln -s /usr/src/app /app

WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN DEBIAN_FRONTEND=noninteractive JOBS=MAX npm install --unsafe-perm
COPY . /usr/src/app

CMD [ "npm", "start" ]

#Port application will startup on. Map to expected port with docker command.
#If you change this port make sure and change it inside the application also.
EXPOSE 7443

#Volume to persist data across containers. Use -v /outsidedir:/data to access.
VOLUME /data
