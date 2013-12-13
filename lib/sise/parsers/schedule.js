var $ = require('cheerio')

exports.parse = function (html) {
  var table = $(html)
    .find('table:has(.font12)')
    .find('tr').slice(1).map(function () {
      return $(this).find('td[align="left"]').map(function () {
        var cell = []
        $(this).text().split(',').map(function (text) {
          var match = text.trim().match(/^([^\(]+?)\(([A-Z0-9]+) ([^ ]+) ([ \d]+)周 \[([^\]]+?)\]\)$/)
          if (match) {
            cell.push({
              name: match[1]
            , klass: match[2]
            , teacher: match[3]
            , weeks: match[4].split(' ').map(function (i) { return +i })
            , location: match[5]
            })
          }
        })
        return cell
      })
    })

  var courses = {}

  var rows = table.length
    , cols = table[0].length

  for (var day = 0; day < cols; day++) {
    for (var time = 0; time < rows; time++) {
      table[time][day].forEach(function (cell) {
        if (!courses[cell.name]) {
          courses[cell.name] = {
            name: cell.name
          , klasses: []
          }
        }

        if (!courses[cell.name].klasses[cell.klass]) {
          courses[cell.name].klasses[cell.klass] = {
            code: cell.klass
          , teacher: cell.teacher
          , schedule: []
          }
        }

        courses[cell.name].klasses[cell.klass].schedule.push({
          location: cell.location
        , week: parseWeeks(cell.weeks, day)
        , time: parseTime(time, day)
        })
      })
    }
  }

  return Object.keys(courses).map(function (name) {
    var course = courses[name]
      , klasses = course.klasses

    Object.keys(klasses).forEach(function (code) {
      var match = code.match(/^([A-Z]+)([0-9]+)$/)
      if (match) {
        var belongsTo = match[1]
        if (klasses[belongsTo]) {
          klasses[belongsTo].subklass = klasses[code]
          delete klasses[code]
        }
      } else {
        course.klass = klasses[code]
        course.klass.code = code
      }
    })

    delete course.klasses

    return course
  })
}

/**
 * { day: 1, start: 1, end: 17, interval: 1 }
 * { day: 2, start: 2, end: 16, interval: 2 }
 * { day: 3, weeks: [ 7 ] }
 * { day: 4, weeks: [ 1, 4, 5, 7, 12 ] }
 */
function parseWeeks (weeks, day) {
  var result = {}

  if (weeks.length == 1) {
    return { which: weeks, day: day }
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

  return { which: weeks, day: day }
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

  result.which = time

  return result
}

function inspect (obj) {
  console.log(require('util').inspect(obj, { depth: null, colors: true }))
}
