var express = require("express");
var app = express();
var PORT = process.env.PORT || 8080;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

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
  let templateVars = {
    urls: urlDatabase
  };
  // console.log(req.cookies);
  res.render("urls_index", templateVars);
})

app.get("/urls/new", (req, res) => {
  // let templateVars = {
  //   user: users
  // };
  res.render("urls_new");
});

app.post("/urls", (req, res) => {
  let randomString = generateRandomString();
  urlDatabase[randomString] = req.body.longURL;
  res.redirect('http://localhost:8080/urls/'+randomString);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  // console.log(longURL);
  res.redirect(longURL);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { 
    shortURL: req.params.id
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
})

app.post("/urls/:id/update", (req, res) => {
  const re = /http:\/\//;
  if (req.body.toBeUpdated.match(re) === null) {
    console.log("Please add http:// to your URL");
  }
  else {
    urlDatabase[req.params.id] = req.body.toBeUpdated;
  }
  res.redirect("/urls");
})

app.post("/login", (req, res) => {
  // console.log(req.body.email, req.body.password);
  for (eachUser in users) {
    // console.log(users[eachUser].email, users[eachUser].password);
    if (users[eachUser].email === req.body.email && users[eachUser].password === req.body.password) {
      // console.log("check");
      app.locals.user = req.body.email;
      // console.log(app.locals.user);
      res.cookie("user_id", users[eachUser].id);
      res.redirect("/");
      return;
    }
  }
  res.status(403).send("Invalid email or password");
})

app.get("/login", (req, res) => {
  res.render("login");
})

app.post("/logout", (req, res) => {
  res.clearCookie(users[app.locals.user]);
  app.locals.user = undefined;
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  // let templateVars = {
  //   user: users
  // };
  res.render("registration");
})

app.post("/register", (req, res) => {
  let randomID = generateRandomString();
  if (req.body === undefined || req.body.password === undefined || req.body.email === undefined) {
    res.status(400).send("400: Invalid email or password!");
  }
  else {
    users[randomID] = {};
    users[randomID].id = randomID;
    users[randomID].email = req.body.email;
    users[randomID].password = req.body.password;
    // console.log(users);
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