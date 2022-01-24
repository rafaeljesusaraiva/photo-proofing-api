FROM nginx:stable-alpine 
WORKDIR /
COPY . /etc/nginx/conf.d/

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 8011
CMD ["nginx", "-g", "daemon off;"]