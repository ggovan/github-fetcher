var request = require("request");
var Q = require("q");
var fs = require("fs");
var stream = require('stream');
var WebHDFS = require('webhdfs');

var token = process.env.GITHUB_TOKEN;
if(!token){
  console.error("GITHUB_TOKEN environment variable must be set!")
  throw new Error("Invalid configuration.")
}

var accessToken = "access_token=" + token;

function endsWith(string, suffix){
  return string && suffix
    && string.length >= suffix.length
    && string.substring(string.length - suffix.length) == suffix
}

function flatMap(xs,f){
  return xs.reduce(function(acc,x){return acc.concat(f(x))},[])
}

function makeRequest(url){
  if(endsWith(url,"?")||endsWith(url,"&")){
    url = url + accessToken;
  } else {
    url = url + "?" + accessToken
  }

  var options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    },
    json: true
  };

  var deferred = Q.defer();

  request(options,function(error, response, body){
    if(error){
      deferred.reject(error);
    }
    else{
      if(response.statusCode === 200)
        deferred.resolve({response:response, body:body});
      else {
        console.error(response);
        try{
          throw new Error("Request failed to " + url);
        }
        catch(e){
          deferred.reject(e);
        }
      }
    }
  })

  return deferred.promise;
}

// File Stuff /////////////////////////////////////////////////////////////////

var eventBuffer = [];
var commitBuffer = [];

function addEvent(event){
    eventBuffer.push(event);
    if(eventBuffer.length >= 1000){
      flushEventBuffer();
    }
}

function saveCommit(commit){
  commitBuffer.push(commit);
  if(commitBuffer.length >= 1000){
    flushCommitBuffer();
  }
}

function existsOrCreateDir(dirName){
  var stats = null
  try{
    stats = fs.statSync(dirName);
  }
  catch(e){
    console.error(e);
    //we assume folder doesn't exist, so create
    fs.mkdirSync(dirName);
    stats = fs.statSync(dirName);
  }
  if(!stats.isDirectory()){
    throw new Error("File is not a directory: " + dirName);
  }
}

function flushEventBuffer(){
  existsOrCreateDir("events");
  var fn = "events/" + new Date().getTime() + ".json";
  fs.writeFileSync(fn, JSON.stringify(eventBuffer));

  console.log("Written " + eventBuffer.length + " events to " + fn)
  eventBuffer = [];
}

function flushCommitBuffer(){
  existsOrCreateDir("commits");
  var fn = "commits/" + new Date().getTime() + ".json";
  fs.writeFileSync(fn, JSON.stringify(commitBuffer));

  flushCommitBufferHDFS(fn)
  commitBuffer = [];
}

function flushCommitBufferHDFS(fn){
  var rfn = "/commits/" + new Date().getTime() + ".json";
  var buffer = commitBuffer;

  var remoteFileStream = hdfs.createWriteStream(rfn);

  remoteFileStream.on('error', function onError (err) {
    console.error(err)
  });
  remoteFileStream.on('finish', function onFinish () {
    console.log("Written " + buffer.length + " commits to " + fn)
  });

  fs.createReadStream(fn).pipe(remoteFileStream);

  commitBuffer = [];
}

// HDFS bit ///////////////////////////////////////////////////////////////////

var hdfs = WebHDFS.createClient({
  user: 'root',
  host: 'hadoop-name-node',
  port: 50070
});


// Run Bit ////////////////////////////////////////////////////////////////////

function getEvents(){
  makeRequest("https://api.github.com/events?")
    .then(function(success){
      var pushEvents = success.body.filter(function(event){return event.type==="PushEvent"})
      var commits = flatMap(pushEvents,function(pe){return pe.payload.commits.map(function(c){return c.url})})

      console.log("Collected " + pushEvents.length + " push events with " + commits.length + " commits");

      pushEvents.forEach(addEvent);
      return commits.map(function(url){
        return makeRequest(url + "?")
          .then(function(success){
            saveCommit(success.body);
            return body;
          })
      })
    })
    .fail(function(error){
      console.error(error);
    })

    setTimeout(function(){getEvents()},60000);
}

getEvents();
