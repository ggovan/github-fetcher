# GitHub Fetcher

Fetches data from GitHub and stores it HDFS at `/commits/<timestamp>.json`

## Docker Hub

Lives on docker hub at <https://hub.docker.com/r/ggovan/github-fetcher/>.

## Build and Run

Requires
- node
- npm

```
# Set github token environment variable (recommended)
GITHUB_TOKEN=7e3...8ff2
# Set the sizes of buffers to be used before flushing (defaults to 1000)
GITHUB_FETCHER_BUFFER_SIZE=1000

npm install
node src/js/github-fetcher.js
```
