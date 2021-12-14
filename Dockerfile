FROM node:16
WORKDIR /saruman-data/rafaeljesusaraiva-api

# Install api dependencies
COPY package.json /saruman-data/rafaeljesusaraiva-api

# COPY app source
COPY . .
RUN mkdir -p /saruman-data/rafaeljesusaraiva-api/public

RUN npm install -g nodemon
RUN yarn

EXPOSE 8010

CMD ["yarn", "start"]
