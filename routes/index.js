const express = require("express");
const router = express.Router();
var bcrypt = require("bcryptjs");
const fetch = require("node-fetch");
const { createPool } = require("mysql");
const { response } = require("express");

router.get("/", (req, res) => {
  let user_id = req.session.userId
  let user = req.session.username
  let current_recipe = req.session.last_recipe_id

  res.render("index", { user: user });
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get('/logout', (req, res) => {
  req.session.destroy(function (err) {
    res.redirect('/')
  })
})

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/login", (req, res) => {
  let username = req.body.username
  let user_pass = req.body.user_pass;

  connection.query('SELECT username, password, user_id, last_recipe_id FROM users WHERE username = ?', [username], function (error, results, fields) {
    if (error) throw error;
    let user = results[0]
    bcrypt.compare(user_pass, user.password, (error, result) => {
      if (result) {
        if (req.session) {
          req.session.userId = user.user_id;
          res.redirect("/");
        }
      } else {
        res.render("login", { message: "Invalid Password!" });
      }
    })
  })
});

router.post("/register", (req, res) => {
  let username = req.body.username;
  let user_pass = req.body.user_pass;

  connection.query('SELECT username, password FROM users WHERE username = ?', [username], function (error, results, fields) {
    if (error) throw error;
    if (results.length != 0) {
      res.render('register', { message: "User Already Exsits" })
    } else {
      bcrypt.genSalt(10, function (error, salt) {
        bcrypt.hash(user_pass, salt, function (error, hash) {
          if (!error) {
            var post = { username: username, password: hash }
            connection.query('INSERT INTO users SET ?', post, function (error, results, fields) {
              if (error) throw error;
              res.redirect('/login')
            })

          }
        })
      })
    }
  })
})


router.get("/choice", (req, res) => {
  let userId = req.session.userId
  res.render("inhouse", { user: userId });
});

router.post("/choice", (req, res) => {
  let userId = req.session.userId
  let selections = req.body.winner

  fetch(
    `https://api.edamam.com/search?q=${selections}&app_id=396e79d2&app_key=fc838fd4aefc30fb854648b519d6cbae`
  )
    .then((response) => {
      return response.json();
    })
    .then((recipe) => {
      res.render("recipelist", { eat: recipe.hits, user: userId });
    });
});

function getRecipesById(id, result) {
  connection.query('SELECT recipe_id, recipe_key, recipe_title, recipe_img, recipe_url FROM recipes WHERE user_id = ?', [id], function (error, results, fields) {
    if (error) throw error;
    let recipes = results
    result(recipes)
  })
}


router.post("/recipe/", (req, res) => {
  let userId = req.session.userId
  let item = req.body.recipe

  let itemone = item.split("_");
  let recpie = itemone[1];

  fetch(
    `https://api.edamam.com/search?q=${recpie}&app_id=396e79d2&app_key=fc838fd4aefc30fb854648b519d6cbae`
  )
    .then((response) => {
      return response.json();
    })
    .then((recipe) => {
      getRecipesById(userId, function (recipes) {
        res.render("recipe", { eat: recipe.hits, user: userId, recipes: recipes });
      })
    });
});

router.get("/recipe/:id", (req, res) => {
  let item = req.params.id;
  let userId = req.session.userId

  fetch(
    `https://api.edamam.com/search?q=${item}&app_id=396e79d2&app_key=fc838fd4aefc30fb854648b519d6cbae`
  )
    .then((response) => {
      return response.json();
    })
    .then((recipe) => {
      res.render("recipelist", { eat: recipe.hits, user: userId });
    });
});

module.exports = router;
