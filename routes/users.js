var pkg = require('../package.json')

// deps
var EventProxy = require('eventproxy')
  , moment = require('moment')

var OAuthic = require('oauthic-google').client({
      clientId      : pkg.config.google.client_id
    , clientSecret  : pkg.config.google.client_secret
    })

// models
var User = require('../models/user')

var utils = {
  formatTime: function (time) {
    return moment(time).format('YYYY-MM-DD HH:mm:ss')
  }
, spanTime: function (time) {
    return moment(time).lang('zh-cn').fromNow()
  }
}

exports.index = function (req, res, error) {
  User.find(function (err, users) {
    if (err) {
      return error(err)
    }

    return res.render('users/index', { users: users, utils: utils })
  })
}

exports.show = function (req, res, error) {
  User.findById(req.params.user, function (err, user) {
    if (err) {
      return error(err)
    }

    if (!user) {
      return res.send(404, 'Not Found')
    }

    return res.render('users/show', { user: user, utils: utils })
  })
}

exports.renew = function (req, res, error) {
  var ep = new EventProxy()

  ep.once('start', function () {
    User.findById(req.params.user, ep.done('user'))
  })

  ep.once('user', function (user) {
    if (!user) {
      return res.send(404, 'Not Found')
    }

    var google = OAuthic
    .token(user.accessToken, user.expiresAt)
    .refresh(user.refreshToken, function (accessToken, expiresAt, done) {
      user.accessToken = accessToken
      user.expiresAt   = expiresAt
      user.save(done)
    })

    google.get('/oauth2/v2/userinfo', ep.done('info', function (res, json) {
      return json
    }))
  })

  ep.all('user', 'info', function () {
    res.redirect('/users/' + req.params.user)
  })

  ep.fail(error).emit('start')
}

exports.destroy = function (req, res, error) {
  var ep = new EventProxy()

  ep.once('start', function () {
    User.findById(req.params.user, ep.done('user'))
  })

  ep.once('user', function (user) {
    if (!user) {
      return res.send(404, 'Not Found')
    }

    user.remove(ep.done('removed'))
  })

  ep.once('removed', function () {
    res.redirect('/users')
  })

  ep.fail(error).emit('start')
}

exports.reinstall = function (req, res, error) {

}
