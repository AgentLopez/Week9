const express = require("express")
const app = express()
const path = require('path')
const fetch = require('node-fetch');
const session = require('express-session')
var bcrypt = require('bcryptjs');
require('dotenv').config()
app.use('/assets', express.static('assets'))
const mustacheExpress = require('mustache-express')
const VIEWS_PATH = path.join(__dirname, '/views')

var mysql = require ('mysql');
global.connection = mysql.createPool({
    // connecionLimit: 10,
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_KEY,
    database: process.env.SQL_DB
})

const PORT = 3000 

app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true
  }))

app.engine('mustache', mustacheExpress(VIEWS_PATH + '/partials', '.mustache'))
app.set('views', VIEWS_PATH)
app.set('view engine', 'mustache')
app.use(express.urlencoded())

const indexRouter = require('./routes/index.js')
app.use('/', indexRouter)

app.listen(PORT,() => {
    console.log('live')
})
