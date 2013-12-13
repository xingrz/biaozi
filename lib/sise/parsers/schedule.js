var $ = require('cheerio')

exports.parse = function (html) {
  var table = $(html).find('table:has(.font12)')

  var schedule = table.find('tr').slice(1).map(function () {
    return $(this).find('td[align="left"]').map(function () {
      var courses = []
      $(this).text().split(',').map(function (text) {
        var match = text.trim().match(/^([^\(]+?)\(([A-Z0-9]+) ([^ ]+) ([ \d]+)周 \[([^\]]+?)\]\)$/)

        if (!match) {
          return
        }

        var result = {
          name: match[1]
        , class: match[2]
        , teacher: match[3]
        , weeks: match[4].split(' ').map(function (i) { return +i })
        , location: match[5]
        }

        courses.push(result)
      })
      return courses
    })
  })

  return schedule
}

exports.build = function (schedule) {
  var courses = {}

  var rows = schedule.length
    , cols = schedule[0].length

  for (var day = 0; day < cols; day++) {
    for (var time = 0; time < rows; time++) {
      schedule[time][day].forEach(function (klass) {
        if (!courses[klass.name]) {
          courses[klass.name] = {
            name: klass.name
          , classes: {}
          }
        }

        if (!courses[klass.name].classes[klass.class]) {
          courses[klass.name].classes[klass.class] = {
            code: klass.class
          , teacher: klass.teacher
          , schedule: []
          }
        }

        courses[klass.name].classes[klass.class].schedule.push({
          location: klass.location
        , week: parseWeeks(klass.weeks, day)
        , time: parseTime(time, day)
        })
      })
    }
  }

  return Object.keys(courses).map(function (i) {
    var course = courses[i]
      , classes = course.classes

    /*course.classes = Object.keys(course.classes).map(function (k) {
      return course.classes[k]
    })*/

    Object.keys(classes).forEach(function (code) {
      var match = code.match(/^([A-Z]+)([0-9]+)$/)

      if (match) {
        var belongsTo = match[1]
        if (classes[belongsTo]) {
          if (!classes[belongsTo].subclasses) {
            classes[belongsTo].subclasses = []
          }

          classes[belongsTo].subclasses.push(classes[code])
          classes[code] = null
        }
      }
    })

    course.classes = []

    Object.keys(classes).forEach(function (code) {
      if (classes[code]) {
        course.classes.push(classes[code])
      }
    })

    return course
  })
}

/**
 * { day: 1, start: 1, end: 17, interval: 1 }
 * { day: 2, start: 2, end: 16, interval: 2 }
 * { day: 3, which: 7 }
 * { day: 4, weeks: [ 1, 4, 5, 7, 12 ] }
 */
function parseWeeks (weeks, day) {
  var result = {}

  if (weeks.length == 1) {
    return {
      which: weeks[0]
    , day: day
    }
  }

  var regular = true
  var interval = weeks[1] - weeks[0]

  for (var i = 1, count = weeks.length; i < count - 1; i++) {
    if (weeks[i + 1] - weeks[i] != interval) {
      regular = false
    }
  }

  if (regular) {
    return {
      start: weeks[0]
    , end: weeks[weeks.length - 1]
    , interval: interval
    , day: day
    }
  }

  return { weeks: weeks, day: day }
}

function parseTime (time, day) {
  var spans = [
    { start: '09:00', end: '10:20' }
  , { start: '10:40', end: '12:00' }
  , { start: '12:30', end: '13:50' }
  , { start: '14:00', end: '15:20' }
  , { start: '15:30', end: '16:50' }
  , { start: '17:00', end: '18:20' }
  , { start: '19:00', end: '20:20' }
  , { start: '20:23', end: '21:50' }
  ]

  var result = spans[time]

  if (4 == day && 3 == time) {
    result.start = '13:20'
    result.end = '14:40'
  } else if (4 == day && 4 == time) {
    result.start = '14:50'
    result.end = '16:10'
  }

  result.time = time

  return result
}

function inspect (obj) {
  console.log(require('util').inspect(obj, { depth: null, colors: true }))
}
