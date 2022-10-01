FROM postgres:12

# Setup cron and backup/restore scripts.
RUN apt-get update -qq && apt-get install -y curl zip netcat cron

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install --bin-dir /usr/bin

COPY ./scripts /scripts
RUN chmod +x /scripts/*.sh

COPY ./crontab /crontab

# Copy in the DB init script.
COPY db_init.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/db_init.sh

# Copy in the init script.
COPY init.sh /usr/local/bin
RUN chmod +x /usr/local/bin/init.sh
ENTRYPOINT ["init.sh"]
