$(function () {

  // caches
  var Availables = {}
  var Schedule = []
  var Confirmed = []

  for (var time = 0; time < 8; time++) {
    Schedule[time] = []
    for (var day = 0; day < 5; day++) {
      Schedule[time][day] = []
    }
  }

  var ep = new EventProxy

  ep.all('courses', function (courses) {
    cacheCourses(courses)

    $('#availables').html(courses.map(function (course) {
      var html = ''

      html += '<li class="course" data-course="' + course.code + '">'
      html += '<strong>' + course.name
              + '<p><span class="code">' + course.code + '</span> / <span class="credit">' + course.credit.toFixed(1) + '</span></p></strong>'
      html += '<ul>'

      course.klasses.forEach(function (klass) {
        if (klass.subklasses) {
          html += '<li'
                    + ' class="klass"'
                    + ' data-course="' + course.code + '"'
                    + ' data-klass="' + klass.code + '"'
                    + '>'
                    + klass.code
                    + '<ul>'
          klass.subklasses.forEach(function (subklass) {
            html += '<li'
                      + ' class="subklass selectable"'
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
                    + ' class="klass selectable"'
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
  })

  ep.all('calendar', 'courses', function (confirmed) {
    Confirmed = confirmed
    confirmed.forEach(function (item) {
      var course = Availables[item.code]
      if (!course) {
        return
      }

      var klass = course.klasses[item.klass]
      if (!klass) {
        return
      }

      klass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, klass, scheduleItem)
      })

      if (klass.subklasses && item.subklass) {
        var subklass = klass.subklasses[item.subklass]
        subklass.schedule.forEach(function (scheduleItem) {
          insertScheduleItem(course, subklass, scheduleItem)
        })
      }
    })
  })

  ep.all('courses', 'confirmed', 'calendar', function (courses, confirmed, calendar) {
    var selectedCourses = calendar.map(function (item) {
      return item.code
    })

    var selectedKlasses = calendar.map(function (item) {
      return item.klass
    })

    var selectedSubklasses = calendar.map(function (item) {
      return item.subklass
    })

    var selectedStatuses = calendar.map(function (item) {
      return item.status
    })

    courses.forEach(function (course) {
      var selected = selectedCourses.indexOf(course.code)
      if (~selected) {
        var klass = selectedKlasses[selected]
          , subklass = selectedSubklasses[selected]
          , status = selectedStatuses[selected]

        $('#availables > li[data-course="' + course.code + '"]')
          .css('background', color(course.name))
          .addClass(status)

        if (subklass) {
          $('#availables li.subklass[data-course="' + course.code + '"][data-subklass="' + subklass + '"]').addClass(status)
        }

        $('#availables li.klass[data-course="' + course.code + '"][data-klass="' + klass + '"]').addClass(status)

        return
      }

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

  ep.all('calendar', 'courses', function () {
    compareSchedules()
  })

  $.get('/api/calendar', function (calendar) {
    ep.emit('calendar', calendar)
  }, 'json')

  $.get('/caches/courses.json', function (courses) {
    ep.emit('courses', courses)
  }, 'json')

  $.get('/api/confirmed', function (confirmed) {
    ep.emit('confirmed', confirmed)
  })

  $('#availables').on('click', '> li > strong', function () {
    $(this).parent().toggleClass('expanded')
  })

  $('#availables').on('mouseenter', 'li.selectable[data-course][data-klass]', function () {
    var $this = $(this)

    if ($this.hasClass('confirmed') || $this.hasClass('locked') || $this.hasClass('favored')) {
      return
    }

    var _course = $this.data('course')
      , _klass = $this.data('klass')
      , _subklass = $this.data('subklass')

    var course = Availables[_course]
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

  $('#availables').on('mouseleave', 'li.selectable[data-course][data-klass]', function () {
    var $this = $(this)

    var _course = $this.data('course')
      , _klass = $this.data('klass')

    $('#schedule').find('li[data-pending]').remove()
  })

  var colorOfName = {}
  function color (name) {
    if (colorOfName[name]) return colorOfName[name]
    var r = Math.floor(Math.random() * 0xef) + 0x10
    var g = Math.floor(Math.random() * 0xef) + 0x10
    var b = Math.floor(0xff - (r + g) / 2) + 0x10
    colorOfName[name] = '#' + r.toString(16) + g.toString(16) + b.toString(16)
    return colorOfName[name]
  }

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
      week.which.forEach(function (w) {
        weeks[w - 1] = true
        markBusy(scheduleItem.week.day, scheduleItem.time.which, w)
      })
    } else if (week.interval) {
      for (var w = week.start; w <= week.end; w += week.interval) {
        weeks[w - 1] = true
        markBusy(scheduleItem.week.day, scheduleItem.time.which, w)
      }
    }

    html += '<p class="graph">'
    html += weeks.map(function (w) { return w ? '<i class="y"></i>' : '<i></i>' }).join('')
    html += '</p>'

    html += '</li>'

    $('#schedule table').find('[data-time="' + scheduleItem.time.which + '"] [data-day="' + scheduleItem.week.day + '"] ul').append(html)
  }

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

      Availables[course.code] = course
    })
  }

  function compareSchedules () {
    Object.keys(Availables).forEach(function (_course) {
      var course = Availables[_course]

      var hasKlass = false

      Object.keys(course.klasses).forEach(function (_klass) {
        var klass = course.klasses[_klass]

        var klassConflit = isConflit(klass)
        if (klassConflit) {
          $('#availables li.klass[data-course="' + course.code + '"][data-klass="' + klass.code + '"]').addClass('conflit')
        }

        if (klass.subklasses) {
          var hasSubklass = false

          Object.keys(klass.subklasses).forEach(function (_subklass) {
            var subklass = klass.subklasses[_subklass]

            var subklassConflit = isConflit(subklass)
            if (subklassConflit) {
              $('#availables li.subklass[data-course="' + course.code + '"][data-subklass="' + subklass.code + '"]').addClass('conflit')
            } else {
              hasSubklass = true
            }
          })

          if (!hasSubklass) {
            $('#availables li.klass[data-course="' + course.code + '"][data-klass="' + klass.code + '"]').addClass('conflit')
          }
        }

        if (!klassConflit && (hasSubklass || !klass.subklasses)) {
          hasKlass = true
        }
      })

      if (!hasKlass) {
        $('#availables > li[data-course="' + course.code + '"]').addClass('all-conflit')
      }
    })
  }

  function isConflit (klass) {
    var selected = Confirmed.some(function (course) {
      return course.klass == klass.code || course.subklass == klass.code
    })

    if (selected) {
      return false
    }

    return klass.schedule.some(function (item) {
      var weeks = []
      for (var i = 0; i < 20; i++) {
        weeks[i] = false
      }

      if (item.week.which) {
        item.week.which.forEach(function (w) {
          weeks[w - 1] = true
        })
      } else if (item.week.interval) {
        for (var w = item.week.start; w <= item.week.end; w += item.week.interval) {
          weeks[w - 1] = true
        }
      }

      return weeks.some(function (used, w) {
        return used && Schedule[item.time.which][item.week.day][w]
      })
    })
  }

  function markBusy (day, time, week) {
    Schedule[time][day][week] = true
  }
})
