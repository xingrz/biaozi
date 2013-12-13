var $ = require('cheerio')

exports.parse = function (html) {
  return $(html).find('tr').slice(1).map(function () {
    var cells = $(this).find('td')
    return {
      id: +$(cells[4]).find('a').attr('href').slice(0, -5)
    , name: $(cells[4]).text()
    , code: $(cells[2]).text()
    , credit: +$(cells[3]).text()
    , required: ('必修' === $(cells[1]).text())
    , department: $(cells[0]).text()
    }
  })
}

exports.klasses = function (html) {
  // 结构化解析 HTML

  var table = $(html)
    .find('table:has(.font12)')
    .find('tr').slice(1).map(function () {
      return $(this).find('td[align="left"]').map(function () {
        var cell = []
        $(this).text().split(',').map(function (text) {
          var match = text.trim().match(/^([A-Z0-9]+)\(([^ ]+) ([ \d]+)周\[([^\]]+?)\]\)$/)
          if (match) {
            cell.push({
              code: match[1]
            , teacher: match[2]
            , weeks: match[3].split(' ').map(function (i) { return +i })
            , location: match[4]
            })
          }
        })
        return cell
      })
    })

  // 构造 Klasses

  var klasses = {}

  var rows = table.length
    , cols = table[0].length

  for (var day = 0; day < cols; day++) {
    for (var time = 0; time < rows; time++) {
      table[time][day].forEach(function (klass) {
        if (!klasses[klass.code]) {
          klasses[klass.code] = {
            code: klass.code
          , teacher: klass.teacher
          , schedule: []
          }
        }

        klasses[klass.code].schedule.push({
          location: klass.location
        , week: parseWeeks(klass.weeks, day)
        , time: parseTime(time, day)
        })
      })
    }
  }

  // 整理 SubKlasses

  Object.keys(klasses).forEach(function (code) {
    var match = code.match(/^([A-Z]+)([0-9]+)$/)

    if (match) {
      var belongsTo = match[1]
      if (klasses[belongsTo]) {
        if (!klasses[belongsTo].subklasses) {
          klasses[belongsTo].subklasses = []
        }

        klasses[belongsTo].subklasses.push(klasses[code])
        delete klasses[code]
      }
    }
  })

  // 整理 Klasses

  return Object.keys(klasses).map(function (code) {
    return klasses[code]
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
