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

  $.get('/api/calendar', function (calendar) {
    calendar.forEach(function (course) {
      course.klass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, course.klass, scheduleItem)
      })

      if (course.klass.subklass) {
        course.klass.subklass.schedule.forEach(function (scheduleItem) {
          insertScheduleItem(course, course.klass.subklass, scheduleItem)
        })
      }
    })
  }, 'json')

  $.get('/caches/courses.json', function (courses) {
    cacheCourses(courses)

    $('#availables').html(courses.map(function (course) {
      var html = ''

      html += '<li data-course="' + course.code + '">'
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

      return html
    }).join(''))


    $.get('/api/confirmed', function (confirmed) {
      courses.forEach(function (course) {
        if (~confirmed.indexOf(course.code)) {
          $('#availables > li[data-course="' + course.code + '"]').hide()
        }

        if (course.requirements) {
          var met = course.requirements.some(function (or) {
            return or.every(function (and) {
              return ~confirmed.indexOf(and)
            })
          })

          if (!met) {
            $('#availables > li[data-course="' + course.code + '"]').addClass('not-met')
          }
        }
      })
    })
  }, 'json')

  $('#availables').on('click', '> li > strong', function () {
    $(this).parent().toggleClass('expanded')
  })

  $('#availables').on('mouseenter', 'li[data-course][data-klass]', function () {
    var $this = $(this)

    var _course = $this.data('course')
      , _klass = $this.data('klass')
      , _subklass = $this.data('subklass')

    var course = availables[_course]
    var klass = course.klasses[_klass]

    klass.schedule.forEach(function (scheduleItem) {
      insertScheduleItem(course, klass, scheduleItem, true)
    })

    if (klass.subklasses && _subklass) {
      var subklass = klass.subklasses[_subklass]
      subklass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, subklass, scheduleItem, true)
      })
    }
  })

  $('#availables').on('mouseleave', 'li[data-course][data-klass]', function () {
    var $this = $(this)

    var _course = $this.data('course')
      , _klass = $this.data('klass')

    $('#schedule').find('li[data-pending]').remove()
  })

  function insertScheduleItem (course, klass, scheduleItem, pending) {
    var html = ''
    html += '<li'
              + ' style="background:' + color(course.name) + '"'
              + ' title="' + course.name + '"'
              + ' data-course="' + course.code + '"'
              + ' data-klass="' + klass.code + '"'
              + (pending ? ' data-pending="pending"' : '')
              + '>'
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

  var availables = {}
  function cacheCourses (courses) {
    // 展开并缓存课程列表
    courses.forEach(function (course) {
      course = _.clone(course)

      var klasses = course.klasses
      course.klasses = {}

      klasses.forEach(function (klass) {
        klass = _.clone(klass)

        if (klass.subklasses) {
          var subklasses = klass.subklasses
          klass.subklasses = {}

          subklasses.forEach(function (subklass) {
            klass.subklasses[subklass.code] = subklass
          })
        }

        course.klasses[klass.code] = klass
      })

      availables[course.code] = course
    })
  }
})
