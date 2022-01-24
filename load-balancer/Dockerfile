FROM nginx:stable-alpine 
COPY ./load-balancer/nginx.conf /etc/nginx/

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 8011
CMD ["nginx"]