var ensureLogin = require('connect-ensure-login')
  , ensureLoggedIn = ensureLogin.ensureLoggedIn('/signin')
  , ensureNotLoggedIn = ensureLogin.ensureNotLoggedIn()

var express = require('express')
  , join = require('path').join

module.exports = function (app) {
  var index = require('../routes/index')
  app.all('/'         , ensureLoggedIn, index.show)
  app.all('/signout'  , ensureLoggedIn, index.signout)
  app.get('/signin'   , ensureNotLoggedIn, index.signin)
    .post('/signin'   , ensureNotLoggedIn, index.authenticate)

  /*var users = require('../controllers/users')
  app.all('/users'                  , ensureLoggedIn, users.index)
  app.all('/users/:user'            , ensureLoggedIn, users.show)
  app.all('/users/:user/renew'      , ensureLoggedIn, users.renew)
  app.all('/users/:user/remove'     , ensureLoggedIn, users.destroy)
  app.all('/users/:user/reinstall'  , ensureLoggedIn, users.reinstall)*/



  // serves stylus compiled css
  var stylus = require('stylus')
    , nib = require('nib')

  var dev = 'development' == app.get('env')

  app.use('/assets/stylesheets', stylus.middleware({
    src: join(__dirname, './assets/stylesheets')
  , dest: join(__dirname, '../public/assets/stylesheets')
  , compile: function (str, path) {
      return stylus(str)
        .set('filename', path)
        .set('compress', !dev)
        .set('firebug', !dev)
        .set('linenos', !dev)
        .use(nib())
    }
  }))

  // serves general static files
  app.use(express.static(join(__dirname, '../public')))

}
