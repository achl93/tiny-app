var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

var urlDatabase = {
  "b2xVn2": {
    long: "http://www.lighthouselabs.ca",
    id: "userRandomID"
  },
  "9sm5xK": {
    long: "http://www.google.com",
    id: "user2RandomID"
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

app.get("/", (req, res) => {
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const id = req.cookies.user_id;
  let templateVars = {
    urls: urlsForUser(id)
  };
  res.render("urls_index", templateVars);
})

app.get("/urls/new", (req, res) => {
  if (app.locals.user === undefined) {
    res.redirect("/register");
  }
  else {
    res.render("urls_new");
  }
});

app.post("/urls", (req, res) => {
  let randomString = generateRandomString();
  const currCookie = req.cookies.user_id;
  urlDatabase[randomString] = {};
  urlDatabase[randomString].long = req.body.longURL;
  urlDatabase[randomString].id = currCookie;
  res.redirect('http://localhost:8080/urls/'+randomString);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL].long;
  res.redirect(longURL);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { 
    shortURL: req.params.id
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  const currCookie = req.cookies.user_id;
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
  const currCookie = req.cookies.user_id;
  if (currCookie === urlDatabase[req.params.id].id) {
    if (req.body.toBeUpdated.match(re) === null) {
      console.log("Please add http:// to your URL"); // can use alert() if you wanted to let user know
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

app.post("/login", (req, res) => {
  for (eachUser in users) {
    if (users[eachUser].email === req.body.email && users[eachUser].password === req.body.password) {
      app.locals.user = req.body.email;
      res.cookie("user_id", users[eachUser].id);
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
  res.clearCookie('user_id');
  app.locals.user = undefined;
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  res.render("registration");
})

app.post("/register", (req, res) => {
  let randomID = generateRandomString();
  if (req.body === undefined || req.body.password === undefined || req.body.email === undefined) {
    res.status(400).send("400: Invalid email or password ¯\_(ツ)_/¯");
  }
  else {
    users[randomID] = {};
    users[randomID].id = randomID;
    users[randomID].email = req.body.email;
    users[randomID].password = req.body.password;
    app.locals.user = req.body.email;
    res.cookie("user_id", randomID);
    res.redirect("/urls");
  }
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString() {
  let random = (Math.random()*2).toString(36);
  return random.slice(2, 8);
}

function urlsForUser(id) {
  let filteredObj = {};
  for (each in urlDatabase) {
    if (id === urlDatabase[each].id) {
      filteredObj[each] = {};
      filteredObj[each].id = id;
      filteredObj[each].long = urlDatabase[each].long;
    }
  }
  return filteredObj;
}