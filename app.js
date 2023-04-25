require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const ejs = require('ejs');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.set('view engine', 'ejs');
let port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
    // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());

// Connect MongoDB at default port 27017.

mongoose.connect("mongodb+srv://panditmukki5:50abc%40MP@cluster0.qbfgn8a.mongodb.net/userDB?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log(`CONNECTED TO MONGO!`);
    })
    .catch((err) => {
        console.log(`OH NO! MONGO CONNECTION ERROR!`);
        console.log(err);
    });

const usersSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);
// usersSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"]});
const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://putsecrets.onrender.com/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


// **********************************************



app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    User.find({"secret": {$ne: null}}).then((foundUsers) =>{
        res.render("secrets", {usersWithSecrets: foundUsers});
        console.log(foundUsers);
    }).catch((err)=> {
        console.log(err);
    })
});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) { console.log(err); }
        res.redirect('/');
      });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication
      res.redirect("/secrets");
    });

app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;
    
    User.findById(req.user.id).then((foundUser)=> {
        foundUser.secret = submittedSecret;
        foundUser.save().then(() =>{
            res.redirect("/secrets");
        })
    });   
});


app.post("/register", (req, res) => {
    // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     })

    //     newUser.save().then(() => {
    //         res.render("secrets");
    //     })
    //         .catch((err) => {
    //             console.log(err);
    //         })
    // });


    // Main Method
    User.register({ username: req.body.username }, req.body.password).then(() => {
        passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
        });
    })
        .catch((err) => {
            console.log(err);
            res.redirect("/register");
        })
});



app.post("/login", (req, res) => {
    // const username = req.body.username;
    // const password = req.body.password;
    // User.findOne({ email: username }).then((foundUser) => {
    //     bcrypt.compare(password, foundUser.password).then(function(result) {
    //         // result == true
    //         res.render("secrets");
    //     });
    // })
    //     .catch((err) => {
    //         console.log(err);
    //     });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    });
});



app.listen(process.env.PORT || port, function (req, res) {
    console.log("Server is running on port 3000");
});
