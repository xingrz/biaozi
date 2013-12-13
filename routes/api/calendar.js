var User = require('../../models').User

var sise = require('../../lib/sise')

exports.create = function (req, res, error) {

}

exports.show = function (req, res, error) {
  sise.calendar(req.session.jar, 2013, 2, function (err, calendar) {
    if (err) {
      return error(err)
    }

    if (!calendar) {
      req.logout()
      return res.send(401)
    }

    return res.json(200, calendar)
  })
}
