var express = require('express');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var app = express();
var secret = 'myAppSecret';
var expires = new Date(Date.now() + 36000);
var Session = {
    secret: secret,
    saveUninitialized : false,
    resave : false,
    maxAge : expires,
    cookie: { maxAge: expires }
};
var sessionStore = expressSession(Session);
app.use(sessionStore);
app.use(cookieParser(secret));

module.exports = app;