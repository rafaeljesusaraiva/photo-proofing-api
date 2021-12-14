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

EXPOSE 8010

CMD ["yarn", "start"]
