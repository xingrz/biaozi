var EventProxy = require('eventproxy')
  , async = require('async')
  , _ = require('lodash')
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
    debug('found user %s %s', user.id, user.key)
    user.getCalendarItems({
      attributes: [ 'code', 'klass', 'subklass', 'status' ]
    }).complete(ep.done('calendar'))
  })

  ep.once('calendar', function (calendar) {
    if (calendar.length) {
      return res.send(200, calendar)
    }

    debug('generate calendar')
    generate(req.session.jar, ep.done('generated'))
  })

  ep.once('generated', function (calendar) {
    if (!calendar) {
      req.logout()
      res.send(401)
      return
    }

    debug('inserting %s calendar items', calendar.length)
    async.map(calendar, function (item, next) {
      CalendarItem.create(item).complete(next)
    }, ep.done('insert'))
  })

  ep.all('user', 'insert', function (user, items) {
    debug('inserted %s calendar items', items.length)
    user.setCalendarItems(items).complete(ep.done('save'))
  })

  ep.all('generated', 'save', function (calendar) {
    res.send(200, calendar)
  })

  ep.fail(error)
  ep.emit('start')
}

function generate (jar, callback) {
  var ep = new EventProxy()

  ep.once('start', function () {
    debug('loading local courses cache')

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
