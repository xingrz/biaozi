!(function (exports) {

  var ScheduleBuilder = exports.ScheduleBuilder = {}

  ScheduleBuilder.build = function (calendar) {
    var table = []

    for (var i = 0; i < 8; i++) {
      table[i] = []
      for (var j = 0; j < 5; j++) {
        table[i][j] = []
      }
    }

    calendar.forEach(function (course) {
      course.classes.forEach(function (klass) {
        klass.schedule.forEach(function (item) {
          var time = item.time.time
            , day = item.week.day

          table[time][day].push({
            name: course.name
          , code: klass.code
          , teacher: klass.teacher
          , location: item.location
          , week: item.week
          })
        })
      })
    })

    return table
  }

})(window)
