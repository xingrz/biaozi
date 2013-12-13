$(function () {

  var colorOfName = {}
  function color (name) {
    if (colorOfName[name]) return colorOfName[name]
    var r = Math.floor(Math.random() * 0xef) + 0x10
    var g = Math.floor(Math.random() * 0xef) + 0x10
    var b = Math.floor(0xff - (r + g) / 2) + 0x10
    colorOfName[name] = '#' + r.toString(16) + g.toString(16) + b.toString(16)
    return colorOfName[name]
  }

  var availables = []

  $.get('/api/calendar', function (calendar) {
    calendar.forEach(function (course) {
      course.klass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, course.klass, scheduleItem)
      })
    })
  }, 'json')


  $.get('/caches/courses.json', function (courses) {
    availables = courses

    $('#availables').html(courses.map(function (course) {
      var html = ''

      html += '<li>'
      html += '<strong>' + course.name + '</strong>'
      html += '<ul>'

      course.klasses.forEach(function (klass) {
        if (klass.subklasses) {
          html += '<li>' + klass.code + '<ul>'
          klass.subklasses.forEach(function (subklass) {
            html += '<li'
                      + ' data-course="' + course.code + '"'
                      + ' data-klass="' + klass.code + '"'
                      + ' data-subklass="' + subklass.code + '"'
                      + '>'
                      + subklass.code
                      + ' <a class="fui-heart"></a> <a class="fui-lock"></a></li>'
          })
          html += '</ul></li>'
        } else {
          html += '<li'
                    + ' data-course="' + course.code + '"'
                    + ' data-klass="' + klass.code + '"'
                    + '>'
                    + klass.code
                    + ' <a class="fui-heart"></a> <a class="fui-lock"></a></li>'
        }
      })

      html += '</ul>'
      html += '</li>'
    }).join(''))
  }, 'json')

  $('#availables').on('click', '> li > strong', function () {
    $(this).parent().toggleClass('expanded')
  })

  function insertScheduleItem (course, klass, scheduleItem) {
    var html = ''
    html += '<li style="background:' + color(course.name) + '" title="' + course.name + '">'
    html += '<h3>' + course.name + '</h3>'
    html += '<p class="details">'
    html += '<span class="class">' + klass.code + '</span>'
    html += '<span class="teacher">' + klass.teacher + '</span>'

    var week = scheduleItem.week
    if (week.which) {
      html += '<span class="weeks">第 ' + week.which.join(' ') + ' 周</span>'
    } else if (week.interval) {
      switch (week.interval) {
        case 1:
          html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周</span>'
          break
        case 2:
          if (week.start % 2) {
            html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 单周</span>'
          }
          else {
            html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 双周</span>'
          }
          break
        default:
          html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周每 ' + week.interval + ' 周</span>'
          break
      }
    }

    html += '<span class="teacher">' + scheduleItem.location + '</span>'
    html += '</p>'

    var weeks = []
    for (var i = 0; i < 20; i++) {
      weeks[i] = false
    }

    if (week.which) {
      weeks[week.which - 1] = true
    } else if (week.weeks) {
      week.weeks.forEach(function (w) {
        weeks[w - 1] = true
      })
    } else if (week.interval) {
      for (var w = week.start; w <= week.end; w += week.interval) {
        weeks[w - 1] = true
      }
    }

    html += '<p class="graph">'
    html += weeks.map(function (w) { return w ? '<i class="y"></i>' : '<i></i>' }).join('')
    html += '</p>'

    html += '</li>'

    $('#schedule table').find('[data-time="' + scheduleItem.time.which + '"] [data-day="' + scheduleItem.week.day + '"] ul').append(html)
  }

})
