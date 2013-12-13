var sise = require('./lib/sise')
  , fs = require('fs')
  , join = require('path').join

var caches = join(__dirname, './public/caches/courses.json')

sise.courses(function (err, courses) {
  if (err) {
    return error(err.stack || err)
  }

  console.log('fetched %s courses', courses.length)

  !(function recurse (i) {
    if (i < 0) {
      fs.writeFile(caches, JSON.stringify(courses), function (err) {
        console.log('write to %s done', caches)
      })
      return
    }

    sise.course(courses[i].id, function (err, classes) {
      if (err) {
        return error(err.stack || err)
      }

      console.log('- %s ... %s', courses[i].name, classes.length)

      courses[i].classes = classes
      recurse(i - 1)
    })
  })(courses.length - 1)
})

function error (err) {
  console.error(err.stack || err)
}
