FROM nginx:alpine

EXPOSE 80
EXPOSE 443

COPY ./ssl /etc/nginx/ssl

COPY ssl.conf /etc/nginx/ssl.conf

COPY nginx.conf /etc/nginx/nginx.conf