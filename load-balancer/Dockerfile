FROM nginx:stable-alpine 

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 8011
CMD ["nginx", "-g", "daemon off;"]