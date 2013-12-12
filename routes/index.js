// deps
var passport = require('passport')
  , sise = require('../lib/sise')
  , schedule = require('../lib/sise/parsers/schedule')

exports.signin = function (req, res, error) {
  return res.render('signin')
}

exports.authenticate = passport.authenticate('local', {
  successReturnToOrRedirect: '/'
, failureRedirect: '/signin'
})

exports.signout = function (req, res, error) {
  req.logout()
  res.redirect('/')
}

exports.show = function (req, res, error) {
  sise.calendar(req.session.jar, 2011, 2, function (err, calendar) {
    if (err) {
      return error(err)
    }

    if (!calendar) {
      req.logout()
      return res.redirect('/')
    }

    return res.render('index', { schedule: schedule.table(calendar) })
  })
}
