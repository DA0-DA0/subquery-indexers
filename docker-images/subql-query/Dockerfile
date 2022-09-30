FROM onfinality/subql-query:v1.5.0

RUN apk add --no-cache curl
RUN apk add --no-cache postgresql-client

COPY init.sh /usr/local/bin

ENTRYPOINT [ "/usr/local/bin/init.sh" ]
