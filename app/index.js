var join = require('path').join
  , pkg = require('../package.json')

var express = require('express')
  , RedisStore = require('connect-redis')(express)
  , app = module.exports = express()


app.set('host', '0.0.0.0')
app.set('port', process.env.PORT || 3000)

if ('production' == app.get('env')) {
  app.set('host', '127.0.0.1')
}


// set template engine
app.set('views', join(__dirname, '../views'))
app.set('view engine', 'jade')

// trust proxy
app.enable('trust proxy')


// serves default or specified favicon.ico
app.use(express.favicon(join(__dirname, '../public/favicon.ico')))

// handles error
app.use(express.errorHandler())

// parses post body
app.use(express.bodyParser())

// cookie & session
app.use(express.cookieParser(pkg.config.cookie.secret))
app.use(express.session({
  secret: pkg.config.cookie.secret
, cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
, store: new RedisStore({ prefix: pkg.config.redis.prefix })
, proxy: true
}))

if ('development' == app.get('env')) {
  // enables jade pretty html output
  app.locals.pretty = true

  // prints logs in dev level
  app.use(express.logger('dev'))
}

if ('production' == app.get('env')) {
  // prints logs in prod level
  app.use(express.logger())
}

// authentication
require('./passport')(app)

// resources
require('./resources')(app)


require('../models').sequelize
  .sync()
  .complete(function(err) {
    if (err) {
      return console.error(err.stack || err)
    }

    app.listen(app.get('port'), app.get('host'), function (err) {
      if (err) {
        return console.error(err.stack || err)
      }

      console.log('express started')
      console.log(require('util').inspect(app.settings, { colors: true }))
    })
  })
