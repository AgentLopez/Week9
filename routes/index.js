const express = require("express");
const router = express.Router();
var bcrypt = require("bcryptjs");
const fetch = require("node-fetch");
const authenticate = require('../assets/auth.js');
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
          req.session.username = user.username;
          req.session.last_recipe_id = user.last_recipe_id
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

function recipeChoice(recipe_id, user_id, result) {
  connection.query('UPDATE users SET last_recipe_id = ? WHERE user_id = ?', [recipe_id, user_id], function (error, results, fields) {
    if (error) throw error;
    result(fields)
  })

}

router.get('/recipe-list/:recipe_id', authenticate, (req, res) => {
  let recipe_id = req.params.recipe_id
  let user_id = req.session.userId
  let user = req.session.username
  req.session.last_recipe_id = recipe_id

  recipeChoice(recipe_id, user_id, function (response) {
    res.redirect('/shopping-list')
  })

})


function moveIngred(value, ingred_id, result) {
  connection.query('UPDATE ingred SET ing_active = ? WHERE ing_id = ?', [value, ingred_id], function (error, results, fields) {
    if (error) throw error;
    result(fields)
  })

}

router.get("/move/:item", authenticate, (req, res) => {
  let user_id = req.session.userId
  let item = req.params.item
  let items = item.split(',')
  let ingred_id = items[0]
  let value = items[1]
  if (value == '1') {
    value = 0
  } else {
    value = 1
  }

  moveIngred(value, ingred_id, function (result) {
    res.redirect('/shopping-list')
  })


})

function getLastRecipe(userId, lastRecipeId) {
  connection.query('SELECT last_recipe_id FROM users WHERE user_id = ?', [userId], function (error, results, fields) {
    if (error) throw error;
    lastRecipeId(results)
  })
}

function getIngredByRecipeId(recipe_id, ingreds) {
  connection.query('SELECT ing_active, ing_id, ing_img, ing_name FROM ingred WHERE recipe_id = ?', [recipe_id], function (error, results, fields) {
    if (error) throw error;
    ingreds(results)
  })
}

function getCurrentRecipeById(recipe_id, thisRecipe) {
  connection.query('SELECT recipe_id, recipe_key, recipe_title, recipe_img, recipe_url FROM recipes WHERE recipe_id = ?', [recipe_id], function (error, results, fields) {
    if (error) throw error;
    thisRecipe(results)
  })
}


router.get("/shopping-list", authenticate, (req, res) => {
  let user_id = req.session.userId
  let checked = []
  let unchecked = []
  let recipe = []


  getLastRecipe(user_id, function (response) {
    let last_recipe_id = response[0].last_recipe_id
    getRecipesById(user_id, function (recipes) {
      getCurrentRecipeById(last_recipe_id, function (thisRecipe) {
        getIngredByRecipeId(last_recipe_id, function (ingreds) {
          let ingredients = ingreds
          for (let index = 0; index < ingredients.length; index++) {
            if (ingredients[index].ing_active == 1) {
              checked.push(ingredients[index])
            } else {
              unchecked.push(ingredients[index])
            }
          }

          res.render('shopping-list', { check: checked, uncheck: unchecked, recipe: thisRecipe[0], user: user_id, recipes: recipes })
        })

      })
    })
  })
})



function addARecipe(addRecipe, result) {
  connection.query('INSERT INTO recipes SET ?', addRecipe, function (error, results, fields) {
    if (error) throw error;
    result(fields)
  })
}

function getRecipeID(key, result) {
  connection.query('SELECT recipe_id FROM recipes WHERE recipe_key = ?', [key], function (error, results, fields) {
    if (error) throw error;
    result(results)
  })
}

router.post("/shopping-list", (req, res) => {
  let allIngred = req.body.allIngred
  let selectIngred = req.body.foodIngred
  let totalOrder = []
  let checkedIngred = []
  let finalOrder = []

  let thisRecipe = req.body.recipe
  let userId = req.session.userId
  let user = req.session.username
  let items = thisRecipe[0].split("?");
  let uri = items[0].split("_");
  let key = uri[1];
  let url = items[3]


  if (allIngred.length == 1) {
    let thisOne = allIngred[0].split("?")
    totalOrder.push(thisOne)
  } else {
    for (index = 0; index < allIngred.length; index++) {
      let thisOne = allIngred[index].split("?")
      totalOrder.push(thisOne)
    }
  }

  if (typeof selectIngred === 'string') {
    let makeList = selectIngred
    let thisOne = makeList.split("?")
    checkedIngred.push(thisOne)
  } else if (selectIngred == undefined) {
    console.log('no ingredients selected')
  } else {

    for (index = 0; index < selectIngred.length; index++) {
      let thisOne = selectIngred[index].split("?")
      checkedIngred.push(thisOne)
    }
  }


  for (index = 0; index < totalOrder.length; index++) {
    let match = 0
    for (y = 0; y < checkedIngred.length; y++) {
      if (totalOrder[index][1] == checkedIngred[y][1]) {
        match = 1
      }
    }
    if (match == 0) {
      let notChecked = totalOrder[index]
      notChecked.push(false)
      finalOrder.push(notChecked)
    }
  }

  for (index = 0; index < checkedIngred.length; index++) {
    let checked = checkedIngred[index]
    checked.push(true)
    finalOrder.push(checked)
  }

  var addRecipe = { recipe_key: key, recipe_title: items[2], recipe_img: items[1], user_id: userId, recipe_url: url }
  addARecipe(addRecipe, function (response) {
    console.log(response)
  })

  getRecipeID(key, function (response) {
    let recipe_row = response[0]
    let this_recipe_id = recipe_row.recipe_id
    connection.query('UPDATE users SET last_recipe_id = ? WHERE user_id = ?', [this_recipe_id, userId], function (error, results, fields) {
      if (error) throw error;
      for (let index = 0; index < finalOrder.length; index++) {
        let ingreds = finalOrder[index]
        let thisIng = { ing_name: ingreds[0], ing_img: ingreds[2], ing_key: ingreds[1], ing_active: ingreds[3], user_id: userId, recipe_id: this_recipe_id }
        connection.query('INSERT INTO ingred SET ?', thisIng, function (error, results, fields) {
          if (error) throw error;
        })
      }
      res.redirect('/shopping-list')
    })
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
    `https://api.edamam.com/search?q=${selections}&app_id=a49443ff&app_key=e31785b777706422206d071c54db598e`
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
    `https://api.edamam.com/search?q=${recpie}&app_id=a49443ff&app_key=e31785b777706422206d071c54db598e`
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
    `https://api.edamam.com/search?q=${item}&app_id=a49443ff&app_key=e31785b777706422206d071c54db598e`
  )
    .then((response) => {
      return response.json();
    })
    .then((recipe) => {
      res.render("recipelist", { eat: recipe.hits, user: userId });
    });
});

module.exports = router;
