FROM node:16
WORKDIR /rafaeljesusaraiva-api

COPY package*.json ./

# Install api dependencies
RUN npm install -g nodemon
RUN yarn

# COPY app source
COPY . .
# RUN mkdir -p /rafaeljesusaraiva-api/public
RUN ln -s /saruman-data/rafaeljesusaraiva-api-public /rafaeljesusaraiva-api/public

# Set file watchers limit high
# Creating entrypoint script with some debug log which can be removed after debugging
RUN echo "#!/bin/sh \n\
echo "fs.inotify.max_user_watches before update" \n\
cat /etc/sysctl.conf\n\
echo "______________________updating inotify __________________________" \n\
echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf && sysctl -p \n\
echo "updated value is" \n\
cat /etc/sysctl.conf | grep fs.inotify \n\
exec yarn start \
" >> /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8010
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# CMD ["yarn", "start"]
