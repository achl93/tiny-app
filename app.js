// Imports & requires //
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

// App options //
app.use(methodOverride('_method'));

app.use(cookieSession({
  name: 'session',
  keys: ['thisIsAKey']
}));
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

// App data //
var urlDatabase = {
  "b2xVn2": {
    long: "http://www.lighthouselabs.ca",
    id: "userRandomID",
    visitCount: 0
  },
  "9sm5xK": {
    long: "http://www.google.com",
    id: "user2RandomID",
    visitCount: 0
  }
}

var users = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
}

// Stores ALL visitors using shortened link
var visitorLog = {
  "userRandomID": {
    times: ["1960-05-21T22:40:22.792Z"],
    ids: ["userRandomID"]
  },
  "user2RandomID": {
    times: ["1993-09-21T22:40:22.792Z"],
    ids: ["user2RandomID"]
  }
}

// App routes //
app.get("/", (req, res) => {
  res.format({
    'text/html': () => {
      res.send(
        '<h1>Welcome to TinyApp!</h1><p>Hello! Here are your <a href="http://localhost:8080/urls">urls</a>.</p>'
      );
    }
  })
});

app.get("/urls", (req, res) => {
  const currCookie = req.session.user_id;
  const templateVars = {
    urls: urlsForUser(currCookie)
  };
  res.render("urls_index", templateVars);
})

app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  const currCookie = req.session.user_id;
  urlDatabase[randomString] = {
    long: req.body.longURL,
    id: currCookie,
    visitCount: 0,
    uniqueVisits: new Set()
  };
  visitorLog[randomString] = {
    times: [],
    ids: []
  };
  res.redirect('http://localhost:8080/urls/'+randomString);
});

app.get("/urls/new", (req, res) => {
  if (app.locals.user === undefined) {
    res.redirect("/register");
  }
  else {
    res.render("urls_new");
  }
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].long;
  const timestamp = new Date();
  const url = urlDatabase[req.params.shortURL];
  const visitorDB = visitorLog[req.params.shortURL];
  url.visitCount++;
  if (!url.uniqueVisits) {                            
    url.uniqueVisits = new Set();
  }
  url.uniqueVisits.add(req.session.user_id);
  visitorDB.times.push(timestamp);
  visitorDB.ids.push(req.session.user_id);
  res.redirect(longURL);
});

app.get("/urls/:id", (req, res) => {
  if (authorized(req)) {
    const templateVars = { 
      shortURL: req.params.id,
      visits: urlDatabase[req.params.id].visitCount,
      uniques: urlDatabase[req.params.id].uniqueVisits.size,
      times: visitorLog[req.params.id].times,
      ids: visitorLog[req.params.id].ids
    };
    res.render("urls_show", templateVars);
  }
  next();
});

app.post("/urls/:id/delete", (req, res) => {
  if (authorized(req)) {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  }
  next();
})

app.post("/urls/:id/update", (req, res) => {
  const re = /http:\/\//;
  if (authorized(req)) {
    if (req.body.toBeUpdated.match(re) === null) {
      console.log("http:// not in the URL... No changes made & redirecting user back to /urls");
    }
    else {
      urlDatabase[req.params.id].long = req.body.toBeUpdated;
    }
    res.redirect("/urls");
  }
  next();
})

app.put("/login", (req, res, next) => {
  for (eachUser in users) {
    if (users[eachUser].email === req.body.email && bcrypt.compareSync(req.body.password, users[eachUser].password)) {
      app.locals.user = req.body.email;
      req.session.user_id = users[eachUser].id;
      res.redirect("/urls");
      return;
    }
  }
  next(new Error('Invalid email or password'));
})

app.get("/login", (req, res) => {
  res.render("login");
})

app.post("/logout", (req, res) => {
  req.session = null;
  app.locals.user = undefined;
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  res.render("registration");
})

app.put("/register", (req, res) => {
  const randomID = generateRandomString();
  if (!req.body || !req.body.password || !req.body.email) {
    next(new Error('Invalid email or password'));
  }
  if (emailCollision(req.body.email)) {
    next(new Error('Invalid email or password'));
  }
  users[randomID] = {
    id: randomID,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  };
  app.locals.user = req.body.email;
  req.session.user_id = randomID;
  res.redirect("/urls");
})

// Error handlers //
app.use(function errHandler400(err, req, res, next) {
  if (err.message === 'Invalid email or password') {
    res.status(400).send({Error: '400: ' + err});
  }
  else {
    next(err);
  }
})

app.use(function errHandler403(err, req, res, next) {
  res.status(403).send({Error: '403: This link does not belong to you'});
})

// Starts the server //
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// Helper functions //
function generateRandomString() {
  const random = (Math.random()*2).toString(36);      // Random floating point converted into a string
  return random.slice(2, 8);                          // using a radix base 36 and then sliced to return
}                                                     // a random of length 6

function urlsForUser(id) {
  let filteredObj = {};                               // Acquires urls from database that belong to a
  for (url in urlDatabase) {                         // user based on the passed in id and returns
    if (id === urlDatabase[url].id) {                // an object
      filteredObj[url] = {
        id: id,
        long: urlDatabase[url].long
      };
    }
  }
  return filteredObj;
}

function emailCollision(email) {                  
  for (user in users) {                               // Compares the passed in email to the database
    if (users[user].email === email) {                // to see if it already exists and returns a bool
      return true;
    }
  }
  return false;
}

function authorized(req) {                            // Checks user session to make sure they are
  const currCookie = req.session.user_id;             // allowed to do a certain action
  if (currCookie === urlDatabase[req.params.id].id) {
    return true;
  }
  else {
    return false;
  }
}