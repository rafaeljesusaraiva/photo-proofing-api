FROM nginx:stable-alpine 

COPY ./nginx.conf /etc/nginx/conf.d/rafaeljesusaraiva-api.conf

EXPOSE 8011
CMD ["nginx", "-g", "daemon off;"]