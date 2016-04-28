FROM risingstack/alpine:3.3-v4.2.6-1.1.3

# Bash useful for debugging but app still works without it
RUN apk add --update bash

EXPOSE 8080

COPY src /app/src
COPY package.json /app/

WORKDIR /app

RUN /usr/bin/npm install

ENTRYPOINT ["tail", "-f", "/app/src/js/github-fetcher.js"]

# Then set up hdfs
# Then run `node src/js/github-fetcher.js` to start fetching
