var sise = require('../../lib/sise')
  , fs = require('fs')
  , join = require('path').join


exports.index = function (req, res, error) {
  res.type('json')

  var path = join(__dirname, '../../public/caches/courses/index.json')

  fs.exists(path, function (exists) {
    if (exists) {
      return res.sendfile(path)
    }

    sise.courses(function (err, courses) {
      if (err) {
        return error(err)
      }

      var string = JSON.stringify(courses)

      fs.writeFile(path, string, function (err) {
        if (err) {
          return error(err)
        }

        res.send(string)
      })
    })
  })
}

exports.show = function (req, res, error) {
  sise.course(req.param.code, function (err, course) {
    if (err) {
      return error(err)
    }

    res.json(200, course)
  })
}
