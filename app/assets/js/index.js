$(function () {

  // caches
  var Availables = []
  var Schedule = []
  var Confirmed = []

  for (var time = 0; time < 8; time++) {
    Schedule[time] = []
    for (var day = 0; day < 5; day++) {
      Schedule[time][day] = []
    }
  }

  $availables = $('#availables')

  var ep = new EventProxy

  ep.all('courses', function (courses) {
    Availables = courses

    courses.forEach(function (course) {
      var $course = $('<li />')
                    .addClass('course')
                    .attr('course', course.code)
                    .appendTo($availables)

      var $name   = $('<strong>' + course.name + '</strong>')
                    .appendTo($course)

      $('<p><span class="code">' + course.code + '</span> / <span class="credit">' + course.credit.toFixed(1) + '</span></p>')
      .appendTo($name)

      var $klasses = $('<ul />').appendTo($course)

      course.klasses.forEach(function (klass) {
        if (klass.subklasses) {
          var $klass  = $('<li>' + klass.code + '</li>')
                        .addClass('klass')
                        .attr('klass', klass.code)
                        .appendTo($klasses)

          var $subklasses = $('<ul />').appendTo($klass)

          klass.subklasses.forEach(function (subklass) {
            var $subklass = $('<li>' + subklass.code + '</li>')
                            .addClass('selectable')
                            .addClass('subklass')
                            .attr('subklass', subklass.code)
                            .appendTo($subklasses)

            $(' <a class="fui-heart"></a>').appendTo($subklass)
            $(' <a class="fui-check"></a>').appendTo($subklass)
          })
        } else {
          var $klass  = $('<li>' + klass.code + '</li>')
                        .addClass('selectable')
                        .addClass('klass')
                        .attr('klass', klass.code)
                        .appendTo($klasses)

          $(' <a class="fui-heart"></a>').appendTo($klass)
          $(' <a class="fui-check"></a>').appendTo($klass)
        }
      })
    })
  })

  ep.all('calendar', 'courses', function (confirmed) {
    Confirmed = confirmed
    confirmed.forEach(function (item) {
      var course = _.find(Availables, { code: item.code })

      if (!course) {
        return
      }

      var klass = _.find(course.klasses, { code: item.klass })
      if (!klass) {
        return
      }

      klass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, klass, scheduleItem)
      })

      if (klass.subklasses && item.subklass) {
        var subklass = _.find(klass.subklasses, { code: item.subklass })
        if (!subklass) {
          // It's none of my business that you make invalid requests
          return
        }

        subklass.schedule.forEach(function (scheduleItem) {
          insertScheduleItem(course, subklass, scheduleItem)
        })
      }
    })
  })

  ep.all('courses', 'confirmed', 'calendar',
  function (courses, confirmed, calendar) {
    courses.forEach(function (course) {
      // 标记已选
      var selected = _.find(calendar, { code: course.code })
      if (selected) {
        var $course = $availables
                      .find('[course="' + course.code + '"]')
                      .css('background', course.color)
                      .addClass(selected.status)

        var $klass = $course
                     .find('[klass="' + selected.klass + '"]')
                     .addClass(selected.status)

        if (selected.subklass) {
          $klass
          .find('[subklass="' + selected.subklass + '"]')
          .addClass(selected.status)
        }

        return
      }

      // 隐藏已修
      if (_.contains(confirmed, course.code)) {
        $availables
        .find('[course="' + course.code + '"]')
        .hide()
      }

      // 标记不符合
      if (course.requirements) {
        var met = _.some(course.requirements, function (or) {
          return _.every(or, function (and) {
            return _.contains(confirmed, and)
          })
        })

        if (!met) {
          $availables
          .find('[course="' + course.code + '"]')
          .addClass('not-met')
        }
      }
    })
  })

  ep.all('calendar', 'courses', function () {
    processConflits()
  })

  $.get('/api/calendar', function (calendar) {
    ep.emit('calendar', calendar)
  }, 'json')

  $.get('/caches/courses.json', function (courses) {
    ep.emit('courses', courses)
  }, 'json')

  $.get('/api/confirmed', function (confirmed) {
    ep.emit('confirmed', confirmed)
  }, 'json')

  $availables.on('click', '> li > strong', function () {
    $(this).parent().toggleClass('expanded')
  })

  $availables.on('mouseenter', '.selectable', function () {
    var $this = $(this)

    if ($this.hasClass('confirmed') || $this.hasClass('locked') || $this.hasClass('favored')) {
      return
    }

    var _subklass = $this.attr('subklass')
      , _klass = (_subklass ? $this.parents('[klass]') : $this).attr('klass')
      , _course = $this.parents('[course]').attr('course')

    var course = _.find(Availables, { code: _course })
    var klass = _.find(course.klasses, { code: _klass })

    klass.schedule.forEach(function (scheduleItem) {
      insertScheduleItem(course, klass, scheduleItem, true)
    })

    if (klass.subklasses && _subklass) {
      var subklass = _.find(klass.subklasses, { code: _subklass })
      subklass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, subklass, scheduleItem, true)
      })
    }
  })

  $availables.on('mouseleave', '.selectable', function () {
    $('#schedule').find('.preview').remove()
  })

  function insertScheduleItem (course, klass, scheduleItem, preview) {
    if (!course.color) {
      var h = Math.random() * 180 + Math.random() * 180
        , s = Math.random() * 30 + 20
        , l = Math.random() * 30 + 30

      course.color = 'hsl(' + h + ',' + s + '%,' + l + '%)'
    }

    var html = ''
    html += '<li'
              + ' style="background:' + course.color + '"'
              + ' title="' + course.name + '"'
              + ' data-course="' + course.code + '"'
              + ' data-klass="' + klass.code + '"'
              + (preview ? ' class="preview twinkling"' : '')
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


  function processConflits () {
    Availables.forEach(function (course) {
      var $course = $availables
                    .find('[course="' + course.code + '"]')

      var hasKlass = false

      course.klasses.forEach(function (klass) {
        var $klass = $course
                     .find('[klass="' + klass.code + '"]')

        var klassConflit = isConflit(klass)
        if (klassConflit) {
          $klass.addClass('conflit')
        }

        if (klass.subklasses) {
          var hasSubklass = false

          klass.subklasses.forEach(function (subklass) {
            var $subklass = $klass
                            .find('[subklass="' + subklass.code + '"]')

            var subklassConflit = isConflit(subklass)
            if (subklassConflit) {
              $subklass.addClass('conflit')
            } else {
              hasSubklass = true
            }
          })

          if (!hasSubklass) {
            $klass.addClass('conflit')
          }
        }

        if (!klassConflit && (hasSubklass || !klass.subklasses)) {
          hasKlass = true
        }
      })

      if (!hasKlass) {
        $course.addClass('all-conflit')
      }
    })
  }

  function isConflit (klass) {
    if (_.find(Confirmed, { klass: klass.code }) ||
        _.find(Confirmed, { subklass: klass.code })) {
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
