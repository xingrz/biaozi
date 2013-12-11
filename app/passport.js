// deps
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , EventProxy = require('eventproxy')

// models
var db = require('../models')

var sise = require('../lib/sise')

// debugger
var debug = require('debug')('@:app:passport')

module.exports = function (app) {
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(function (req, res, next) {
    if (req.user) {
      res.locals.logged = req.user
    }

    next()
  })

  passport.use(new LocalStrategy({ passReqToCallback: true },
    function (req, username, password, done) {
      var ep = new EventProxy()

      ep.once('start', function () {
        sise.login(username, password, ep.done('login'))
      })

      ep.once('login', function (jar) {
        if (!jar) {
          return done(null, false)
        }

        req.session.jar = jar

        db.User
          .findOrCreate({ username: username }, {})
          .complete(done)
      })

      ep.fail(done)
      ep.emit('start')
    }))

  passport.serializeUser(function (user, done) {
    done(null, JSON.stringify(user))
  })

  passport.deserializeUser(function (json, done) {
    try {
      done(null, JSON.parse(json))
    } catch (err) {
      done(err)
    }
  })
}
