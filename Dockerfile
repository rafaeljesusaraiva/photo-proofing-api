FROM node:16
WORKDIR /saruman-data/rafaeljesusaraiva-api

# Install api dependencies
COPY package.json /saruman-data/rafaeljesusaraiva-api
RUN npm install -g nodemon
RUN yarn

# COPY app source
COPY . .
RUN mkdir -p /saruman-data/rafaeljesusaraiva-api/public

EXPOSE 8010

CMD ["yarn", "start"]
