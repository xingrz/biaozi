var sise = require('./lib/sise')
  , fs = require('fs')
  , join = require('path').join

var caches = join(__dirname, './public/caches/courses.json')

sise.courses(function (err, courses) {
  if (err) {
    return error(err)
  }

  console.log('fetched %s courses', courses.length)

  !(function recurse (i) {
    if (i < 0) {
      fs.writeFile(caches, JSON.stringify(courses), function (err) {
        console.log('write to %s done', caches)
      })
      return
    }

    sise.klasses(courses[i].id, function (err, klasses) {
      if (err) {
        return error(err)
      }

      sise.requirements(courses[i].id, function (err, requirements) {
        if (err) {
          return error(err)
        }

        console.log('- %s ... %s', courses[i].name, klasses.length)

        courses[i].klasses = klasses

        if (requirements) {
          courses[i].requirements = requirements
        }

        recurse(i - 1)
      })
    })
  })(courses.length - 1)
})

function error (err) {
  console.error(err.stack || err)
}
