FROM node:16
RUN mkdir /saruman-data/rafaeljesusaraiva-api
WORKDIR /saruman-data/rafaeljesusaraiva-api

# Install api dependencies
COPY package*.json ./
RUN npm install -g nodemon
RUN yarn

# COPY app source
COPY . .
RUN mkdir -p /saruman-data/rafaeljesusaraiva-api/public

EXPOSE 8010

CMD ["yarn", "start"]
