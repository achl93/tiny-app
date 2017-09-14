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
    time: ["1960-05-21T22:40:22.792Z"],
    id: ["userRandomID"]
  },
  "user2RandomID": {
    time: ["1993-09-21T22:40:22.792Z"],
    id: ["user2RandomID"]
  }
}

// App routes //
app.get("/", (req, res) => {
  res.format({
    'text/html': () => {
      res.send('<p>Hello! Here are your <a href="http://localhost:8080/urls">urls</a>.</p>');
    }
  })
});

app.get("/urls", (req, res) => {
  const currCookie = req.session.user_id;
  let templateVars = {
    urls: urlsForUser(currCookie)
  };
  res.render("urls_index", templateVars);
})

app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  const currCookie = req.session.user_id;
  urlDatabase[randomString] = {};
  urlDatabase[randomString].long = req.body.longURL;
  urlDatabase[randomString].id = currCookie;
  urlDatabase[randomString].visitCount = 0;
  urlDatabase[randomString].uniqueVisits = new Set();
  visitorLog[randomString] = {};
  visitorLog[randomString].time = [];
  visitorLog[randomString].id = [];
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
  urlDatabase[req.params.shortURL].visitCount++;
  if (urlDatabase[req.params.shortURL].uniqueVisits === undefined) {    // Catch for the two original
    urlDatabase[req.params.shortURL].uniqueVisits = new Set();          // hardcoded database entries
  }
  urlDatabase[req.params.shortURL].uniqueVisits.add(req.session.user_id);
  visitorLog[req.params.shortURL].time.push(timestamp);
  visitorLog[req.params.shortURL].id.push(req.params.shortURL);
  res.redirect(longURL);
});

app.get("/urls/:id", (req, res) => {
  const currCookie = req.session.user_id;
  if (currCookie === urlDatabase[req.params.id].id) {
    let templateVars = { 
      shortURL: req.params.id,
      visits: urlDatabase[req.params.id].visitCount,
      uniques: urlDatabase[req.params.id].uniqueVisits.size,
      time: visitorLog[req.params.id].time,
      id: visitorLog[req.params.id].id
    };
    res.render("urls_show", templateVars);
  }
  else {
    res.status(403).send("403: This link does not belong to you ಠ_ಠ");
  }
});

app.post("/urls/:id/delete", (req, res) => {
  const currCookie = req.session.user_id;
  if (currCookie === urlDatabase[req.params.id].id) {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  }
  else {
    res.status(403).send("403: This link does not belong to you ಠ_ಠ");
  }
})

app.post("/urls/:id/update", (req, res) => {
  const re = /http:\/\//;
  const currCookie = req.session.user_id;
  if (currCookie === urlDatabase[req.params.id].id) {
    if (req.body.toBeUpdated.match(re) === null) {
      console.log("Please add http:// to your URL");
    }
    else {
      urlDatabase[req.params.id].long = req.body.toBeUpdated;
    }
    res.redirect("/urls");
  }
  else {
    res.status(403).send("403: This link does not belong to you ಠ_ಠ");
  }
})

app.put("/login", (req, res) => {
  for (eachUser in users) {
    if (users[eachUser].email === req.body.email && bcrypt.compareSync(req.body.password, users[eachUser].password)) {
      app.locals.user = req.body.email;
      req.session.user_id = users[eachUser].id;
      res.redirect("/");
      return;
    }
  }
  res.status(403).send("403: Invalid email or password ಠ_ಠ");
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
  if (req.body === undefined || req.body.password === undefined || req.body.email === undefined) {
    res.status(400).send("400: Invalid email or password ¯\_(ツ)_/¯");
  }
  if (emailCollision(req.body.email)) {
    res.status(400).send("400: This email address already exists in our database");
  }
  else {
    users[randomID] = {};
    users[randomID].id = randomID;
    users[randomID].email = req.body.email;
    users[randomID].password = bcrypt.hashSync(req.body.password, 10);
    app.locals.user = req.body.email;
    req.session.user_id = randomID;
    res.redirect("/urls");
  }
})

// Starts the server //
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// Helper functions //
function generateRandomString() {
  const random = (Math.random()*2).toString(36);        // Random floating point converted into a string
  return random.slice(2, 8);                          // using a radix base 36 and then sliced to return
}                                                     // a random of length 6

function urlsForUser(id) {
  let filteredObj = {};                               // Acquires urls from database that belong to a
  for (each in urlDatabase) {                         // user based on the passed in id and returns
    if (id === urlDatabase[each].id) {                // an object
      filteredObj[each] = {};
      filteredObj[each].id = id;
      filteredObj[each].long = urlDatabase[each].long;
    }
  }
  return filteredObj;
}

function emailCollision(email) {                  
  for (each in users) {                               // Compares the passed in email to the database
    if (users[each].email === email) {                // to see if it already exists and returns a bool
      return true;
    }
  }
  return false;
}