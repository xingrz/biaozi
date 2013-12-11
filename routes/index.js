// deps
var passport = require('passport')

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
  console.log(req.session)
  return res.render('index')
}
