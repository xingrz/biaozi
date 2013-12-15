// deps
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , EventProxy = require('eventproxy')
  , crypto = require('crypto')
  , _ = require('lodash')
  , readFile = require('fs').readFile
  , join = require('path').join

// models
var db = require('../models')

var sise = require('../lib/sise')

// debugger
var debug = require('debug')('@:app:passport')

var PBKDF2_ITERATIONS = 10000
  , PBKDF2_KEYLEN     = 64
  , PBKDF2_SALTLEN    = 64

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
        db.User
          .find({ where: { username: username } })
          .complete(ep.done('find'))
      })

      ep.once('find', function (user) {
        if (user) {
          crypto.pbkdf2(password, user.salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN,
            ep.done('hash', function (pbkdf2) {
              return pbkdf2.toString('hex')
            }))
        } else {
          sise.login(username, password, ep.done('remote'))
        }
      })

      ep.all('find', 'hash', function (user, hash) {
        done(null, user.password === hash ? user : false)
      })

      ep.once('remote', function (remote) {
        if (!remote) {
          return done(null, false)
        }

        crypto.randomBytes(PBKDF2_SALTLEN, ep.done('salt', function (bytes) {
          return bytes.toString('hex')
        }))

        generate(remote.jar, ep.done('generated'))
      })

      ep.once('salt', function (salt) {
        crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN,
          ep.done('saltify', function (pbkdf2) {
            return pbkdf2.toString('hex')
          }))
      })

      ep.all('remote', 'saltify', 'salt', function (remote, hash, salt) {
        db.User
          .create({ username: username, password: hash, salt: salt, key: remote.key })
          .complete(ep.done('inserted'))
      })

      ep.once('generated', function (calendar) {
        debug('inserting %s calendar items', calendar.length)
        db.CalendarItem.bulkCreate(calendar).complete(ep.done('calendar'))
      })

      ep.all('inserted', 'calendar', function (user, calendar) {
        debug('inserted %s calendar items', calendar.length)
        user.setCalendarItems(calendar).complete(ep.done('updated'))
      })

      ep.all('inserted', 'updated', function (user) {
        done(null, user)
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

function generate (jar, callback) {
  var ep = new EventProxy()

  ep.once('start', function () {
    debug('loading local courses cache')

    var path = join(__dirname, '../public/caches/courses.json')
    readFile(path, function (err, content) {
      if (err) {
        return ep.emit('error', err)
      }

      try {
        var json = JSON.parse(content)
        ep.emit('courses', json)
      } catch (e) {
        return ep.emit('error', e)
      }
    })
  })

  ep.once('start', function () {
    debug('fetching remote calendar')
    sise.calendar(jar, 2013, 2, ep.done('calendar'))
  })

  ep.all('courses', 'calendar', function (courses, confirmed) {
    if (!confirmed) {
      debug('failed fetch confirmed courses')
      return callback(null, false)
    }

    debug('loaded %s courses, %s confirmed in calendar',
      courses.length, confirmed.length)

    callback(null, _.transform(courses, function (result, course) {
      var confirmedItem = _.find(confirmed, { name: course.name })
      if (confirmedItem && _.find(course.klasses,
                                  { code: confirmedItem.klass.code })) {
        result.push({
          code: course.code
        , klass: confirmedItem.klass.code
        , subklass: ( confirmedItem.klass.subklass
                    ? confirmedItem.klass.subklass.code
                    : null )
        , status: 'confirmed'
        })
      }
    }))
  })

  ep.fail(callback)
  ep.emit('start')
}
