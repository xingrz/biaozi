var User = require('../../models').User

var sise = require('../../lib/sise')

exports.create = function (req, res, error) {

}

exports.show = function (req, res, error) {
  sise.confirmed(req.user.key, function (err, confirmed) {
    if (err) {
      return error(err)
    }

    if (!confirmed) {
      return res.send(404)
    }

    return res.json(200, confirmed)
  })
}
