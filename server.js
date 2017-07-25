var express = require("express");
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public')); // http://expressjs.com/en/starter/static-files.html


var connected=false;
var GOOGLEKEY = "key=" + process.env.GOOGLEKEY;
var googleSearchUrl = "https://www.googleapis.com/customsearch/v1?";
var googleCustomSearch = "&cx=003838749513424969800:jcmqqydy4bi";
var searchImageFilter = "&searchType=image";
var fields = "&fields=items(title, link, displayLink)";
var https = require('https');

// setup our datastore
var datastore = require("./datastore").sync;
datastore.initializeApp(app);

app.get('/', function (req, res) {
  initializeDatastoreOnProjectCreation();
  res.sendFile(__dirname + '/views/index.html');
  
});

app.get('/api/imagesearch', function (req, queryRes) {
  var searchQuery = '';
  
  var history = datastore.get("recent-searches");
  
  if (history !== null) {
    if (history.length >= 10) {
        history.shift()
      }
  } else {
    history = [];
  }
    
  history.push({
        term: req.query.search,
        when: Date()
  });
       
  datastore.set("recent-searches", history);
 
  
  //checks for a query offset paramater and adds it if available
  if (req.query.offset !== undefined) {
    searchQuery = googleSearchUrl + 
                  GOOGLEKEY + 
                  googleCustomSearch + 
                  searchImageFilter + 
                  fields + 
                  '&start=' + req.query.offset + 
                  "&q=" + req.query.search;
  } else {
    searchQuery = googleSearchUrl + 
                  GOOGLEKEY + 
                  googleCustomSearch + 
                  searchImageFilter + 
                  fields +  
                  "&q=" + req.query.search;
  }
  https.get(searchQuery, (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error("78: " + error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        queryRes.send(parsedData.items);
      } catch (e) {
        console.error("92" + e.message);
      }
    });
    })
  
  
});

app.get('/api/latest/imagesearch', function (req, res) {
  res.send(datastore.get("recent-searches"));
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

// ------------------------
// DATASTORE INITIALIZATION

function connectOnProjectCreation() {
  return new Promise(function (resolving) {
    if(!connected){
      connected = datastore.connect().then(function(){
        resolving();
      });
    } else {
      resolving();
    }
  });
}

function initializeDatastoreOnProjectCreation() {
  if(!connected){
    connected = datastore.connect();
  }
  if (!datastore.get("initialized")) {
    datastore.set("initialized", true);
  }  
}