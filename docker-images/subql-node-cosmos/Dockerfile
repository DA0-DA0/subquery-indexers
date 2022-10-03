FROM onfinality/subql-node-cosmos:v1.10.2

RUN apk add --no-cache postgresql-client

COPY init.sh /usr/local/bin

ENTRYPOINT [ "/usr/local/bin/init.sh" ]
