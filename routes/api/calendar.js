var EventProxy = require('eventproxy')
  , readFile = require('fs').readFile
  , join = require('path').join

var User = require('../../models').User
  , CalendarItem = require('../../models').CalendarItem

var sise = require('../../lib/sise')

var debug = require('debug')('@:routes:api:calendar')

exports.show = function (req, res, error) {
  var ep = new EventProxy()

  ep.once('start', function () {
    User
      .find(req.user.id, { include: [ CalendarItem ] })
      .complete(ep.done('user'))
  })

  ep.once('user', function (user) {
    user.getCalendarItems({ attributes: [ 'code', 'klass', 'subklass', 'status' ] }).complete(ep.done('calendar'))
  })

  ep.once('calendar', function (calendar) {
    if (calendar.length) {
      return res.send(200, calendar)
    }

    generate(req.session.jar, ep.done('generated'))
  })

  ep.once('generated', function (calendar) {
    if (!calendar) {
      req.logout()
      res.send(401)
      return
    }

    insert(calendar, ep.done('insert'))
  })

  ep.all('user', 'insert', function (user, items) {
    user.setCalendarItems(items).complete(ep.done('save'))
  })

  ep.all('generated', 'save', function (calendar) {
    res.send(200, calendar)
  })

  ep.fail(error)
  ep.emit('start')
}

function insert (calendar, callback) {
  var ep = new EventProxy()

  var items = []

  !(function recurse (i) {
    if (i < 0) {
      return callback(null, items)
    }

    CalendarItem.create(calendar[i])
      .success(function (item) {
        items.push(item)
        recurse(i - 1)
      })
      .error(function (err) {
        callback(err)
      })
  })(calendar.length - 1)
}

function generate (jar, callback) {
  var ep = new EventProxy()

  ep.once('start', function () {
    var path = join(__dirname, '../../public/caches/courses.json')
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
    sise.calendar(jar, 2013, 2, ep.done('calendar'))
  })

  ep.all('courses', 'calendar', function (courses, confirmed) {
    if (!confirmed) {
      debug('failed fetch confirmed courses')
      return callback(null, false)
    }

    var calendar = []

    var names = confirmed.map(function (course) {
      return course.name
    })

    var klasses = confirmed.map(function (course) {
      return course.klass.code
    })

    var subklasses = confirmed.map(function (course) {
      return course.klass.subklass ? course.klass.subklass.code : null
    })

    courses.forEach(function (course) {
      var index = names.indexOf(course.name)
      if (~index) {
        var matchKlass = course.klasses.some(function (klass) {
          return klass.code == klasses[index]
        })

        if (matchKlass) {
          calendar.push({
            code: course.code
          , klass: klasses[index]
          , subklass: subklasses[index]
          , status: 'confirmed'
          })
        }
      }
    })

    callback(null, calendar)
  })

  ep.fail(callback)
  ep.emit('start')
}
