FROM node:16
WORKDIR /rafaeljesusaraiva-api

# Install api dependencies
COPY package*.json ./
RUN npm install -g nodemon
RUN yarn

# COPY app source
COPY . .
RUN mkdir -p /rafaeljesusaraiva-api/public

EXPOSE 4000

CMD ["yarn", "start"]
