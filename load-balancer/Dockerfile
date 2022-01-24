FROM nginx:stable-alpine 
WORKDIR /
RUN cp /saruman-data/rafaeljesusaraiva-api-loadbalancer/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8011
CMD ["nginx", "-g", "daemon off;"]