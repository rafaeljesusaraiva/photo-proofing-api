FROM nginx:stable-alpine 
COPY /saruman-data/rafaeljesusaraiva-api-loadbalancer/nginx.conf /etc/nginx/nginx.conf

RUN ls -la /saruman-data

EXPOSE 8011
CMD ["nginx", "-g", "daemon off;"]