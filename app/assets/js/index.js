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
  $schedule   = $('#schedule table')

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

            $(' <a class="fui-check"></a>').appendTo($subklass)
            $(' <a class="fui-heart"></a>').appendTo($subklass)
          })
        } else {
          var $klass  = $('<li>' + klass.code + '</li>')
                        .addClass('selectable')
                        .addClass('klass')
                        .attr('klass', klass.code)
                        .appendTo($klasses)

          $(' <a class="fui-check"></a>').appendTo($klass)
          $(' <a class="fui-heart"></a>').appendTo($klass)
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

      var subklass  = klass.subklasses && item.subklass
                    ? _.find(klass.subklasses, { code: item.subklass })
                    : null

      klass.schedule.forEach(function (scheduleItem) {
        insertScheduleItem(course, klass, subklass, scheduleItem, item.status)
      })

      if (subklass) {
        subklass.schedule.forEach(function (scheduleItem) {
          insertScheduleItem(course, klass, subklass, scheduleItem, item.status, true)
        })
      }
    })
  })

  ep.all('courses', 'confirmed', 'calendar',
  function (courses, confirmed, calendar) {
    courses.forEach(function (course) {
      // 标记已选
      var selected = _.filter(calendar, { code: course.code })
      if (selected.length) {
        var $course = $availables
                      .find('[course="' + course.code + '"]')
                      .css('background-color', course.color)

        selected.forEach(function (item) {
          $course.addClass(item.status)

          var $klass = $course
                       .find('[klass="' + item.klass + '"]')
                       .addClass(item.status)

          if (item.subklass) {
            $klass
            .find('[subklass="' + item.subklass + '"]')
            .addClass(item.status)
          }
        })

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

    var _subklass = $this.attr('subklass')
      , _klass = (_subklass ? $this.parents('[klass]') : $this).attr('klass')
      , _course = $this.parents('[course]').attr('course')

    var course    = _.find(Availables, { code: _course })
      , klass     = _.find(course.klasses, { code: _klass })
      , subklass  = klass.subklasses && _subklass
                  ? _.find(klass.subklasses, { code: _subklass })
                  : null

    var inserted = $schedule
                   .find(selector(_course, _klass, _subklass))
                   .addClass('twinkling')

    if (inserted.length) {
      return
    }

    klass.schedule.forEach(function (scheduleItem) {
      previewScheduleItem(course, klass, subklass, scheduleItem)
    })

    if (subklass) {
      subklass.schedule.forEach(function (scheduleItem) {
        previewScheduleItem(course, klass, subklass, scheduleItem, true)
      })
    }

    $schedule
    .find('[course="' + _course + '"].preview')
    .addClass('twinkling')
  })

  $availables.on('mouseleave', '.selectable', function () {
    $schedule.find('.preview').remove()
    $schedule.find('.twinkling').removeClass('twinkling')
  })

  $availables.on('click', '.selectable:not(.conflit).confirmed .fui-check', function () {
    var $this = $(this).parents('.selectable')

    var $klass  = $this.attr('subklass') ? $this.parents('[klass]') : $this
      , $course = $this.parents('[course]')

    var _subklass = $this.attr('subklass')
      , _klass    = $klass.attr('klass')
      , _course   = $course.attr('course')

    $this.removeClass('confirmed')
    $klass.removeClass('confirmed')
    $course.removeClass('confirmed')

    if (!$course.find('.favored').length) {
      $course.css('background-color', '')
    }

    var course    = _.find(Availables, { code: _course })
      , klass     = _.find(course.klasses, { code: _klass })
      , subklass  = klass.subklasses && _subklass
                  ? _.find(klass.subklasses, { code: _subklass })
                  : null

    deny(course, klass, subklass)
  })

  $availables.on('click', '.selectable:not(.conflit):not(.confirmed) .fui-check', function () {
    var $this = $(this).parents('.selectable')

    var $klass  = $this.attr('subklass') ? $this.parents('[klass]') : $this
      , $course = $this.parents('[course]').removeClass('expanded')

    var _subklass = $this.attr('subklass')
      , _klass    = $klass.attr('klass')
      , _course   = $course.attr('course')

    var course    = _.find(Availables, { code: _course })
      , klass     = _.find(course.klasses, { code: _klass })
      , subklass  = klass.subklasses && _subklass
                  ? _.find(klass.subklasses, { code: _subklass })
                  : null

    // clean previous confirmed
    var _previousKlass = $availables
                         .find('[course="' + _course + '"] [klass].confirmed')
                         .attr('klass')

    var _previousSubklass = _subklass
                          ? $availables
                            .find('[course="' + _course + '"] [subklass].confirmed')
                            .attr('subklass')
                          : null

    if (_previousKlass) {
      var previousKlass    = _.find(course.klasses, { code: _previousKlass })
        , previousSubklass = _previousSubklass && previousKlass.subklasses
                           ? _.find(previousKlass.subklasses, { code: _previousSubklass })
                           : null

      deny(course, previousKlass, previousSubklass)

      $schedule
      .find(selector(_course, _previousKlass, _previousSubklass))
      .remove()
    }

    $availables
    .find('[course="' + _course + '"] .confirmed')
    .removeClass('confirmed')

    // clean previous favored
    $schedule
    .find('[course="' + _course + '"]:not([klass="' + _klass + '"]).favored')
    .remove()

    if (_subklass) {
      $schedule
      .find('[course="' + _course + '"][klass="' + _klass + '"]:not([subklass="' + _subklass + '"]).favored')
      .remove()
    }

    $availables
    .find('[course="' + _course + '"].favored')
    .removeClass('favored')

    $availables
    .find('[course="' + _course + '"] .favored')
    .removeClass('favored')

    $this.addClass('confirmed')
    $klass.addClass('confirmed')
    $course.addClass('confirmed').css('background-color', course.color)

    konfirm(course, klass, subklass)
  })

  function konfirm (course, klass, subklass) {
    klass.schedule.forEach(function (scheduleItem) {
      checkScheduleItem(course, klass, subklass, scheduleItem, 'confirmed')
    })

    if (subklass) {
      subklass.schedule.forEach(function (scheduleItem) {
        checkScheduleItem(course, klass, subklass, scheduleItem, 'confirmed')
      })
    }

    Confirmed.push({
      code: course.code
    , klass: klass.code
    , subklass: (subklass ? subklass.code : null)
    , status: 'confirmed'
    })

    $.ajax('/api/calendar/' + course.code + '/confirmed', {
      type: 'POST'
    , data: {
        klass: klass.code
      , subklass: (subklass ? subklass.code : null)
      }
    })

    processConflits()
  }

  function deny (course, klass, subklass) {
    klass.schedule.forEach(function (scheduleItem) {
      removeScheduleItem(course, klass, subklass, scheduleItem, 'confirmed')
    })

    if (subklass) {
      subklass.schedule.forEach(function (scheduleItem) {
        removeScheduleItem(course, klass, subklass, scheduleItem, 'confirmed')
      })
    }

    Confirmed = _.reject(Confirmed, { code: course.code })

    $.ajax('/api/calendar/' + course.code + '/confirmed', {
      type: 'DELETE'
    })

    processConflits()
  }

  $availables.on('click', '.selectable:not(.conflit).favored .fui-heart', function () {
    var $this = $(this).parents('.selectable')

    var $klass  = $this.attr('subklass') ? $this.parents('[klass]') : $this
      , $course = $this.parents('[course]')

    var _subklass = $this.attr('subklass')
      , _klass    = $klass.attr('klass')
      , _course   = $course.attr('course')

    $this.removeClass('favored')
    $klass.removeClass('favored')
    $course.removeClass('favored')

    if (!$course.find('.confirmed, .favored').length) {
      $course.css('background-color', '')
    }

    var course    = _.find(Availables, { code: _course })
      , klass     = _.find(course.klasses, { code: _klass })
      , subklass  = klass.subklasses && _subklass
                  ? _.find(klass.subklasses, { code: _subklass })
                  : null

    bore(course, klass, subklass)
  })

  $availables.on('click', '.selectable:not(.conflit):not(.favored) .fui-heart', function () {
    var $this = $(this).parents('.selectable')

    var $klass  = $this.attr('subklass') ? $this.parents('[klass]') : $this
      , $course = $this.parents('[course]')

    var _subklass = $this.attr('subklass')
      , _klass    = $klass.attr('klass')
      , _course   = $course.attr('course')

    var course    = _.find(Availables, { code: _course })
      , klass     = _.find(course.klasses, { code: _klass })
      , subklass  = klass.subklasses && _subklass
                  ? _.find(klass.subklasses, { code: _subklass })
                  : null

    $this.addClass('favored')
    $klass.addClass('favored')

    if (!$course.hasClass('confirmed')) {
      $course.addClass('favored')
             .css('background-color', course.color)
    }

    favor(course, klass, subklass)
  })

  function favor (course, klass, subklass) {
    klass.schedule.forEach(function (scheduleItem) {
      checkScheduleItem(course, klass, subklass, scheduleItem, 'favored')
    })

    if (subklass) {
      subklass.schedule.forEach(function (scheduleItem) {
        checkScheduleItem(course, klass, subklass, scheduleItem, 'favored')
      })
    }

    Confirmed.push({
      code: course.code
    , klass: klass.code
    , subklass: subklass.code
    , status: 'favored'
    })

    $.ajax('/api/calendar/' + course.code + '/favored', {
      type: 'POST'
    , data: {
        klass: klass.code
      , subklass: (subklass ? subklass.code : null)
      }
    })
  }

  function bore (course, klass, subklass) {
    klass.schedule.forEach(function (scheduleItem) {
      removeScheduleItem(course, klass, subklass, scheduleItem, 'favored')
    })

    if (subklass) {
      subklass.schedule.forEach(function (scheduleItem) {
        removeScheduleItem(course, klass, subklass, scheduleItem, 'favored')
      })
    }

    var item = _.find(Confirmed, {
      code: course.code
    , klass: klass.code
    , subklass: (subklass ? subklass.code : null)
    , status: 'favored'
    })

    if (item) {
      Confirmed = _.reject(item)

      var url = '/api/calendar/' + course.code
              + '/favored/' + klass.code
              + (subklass ? ('/' + subklass.code) : '')

      $.ajax(url, {
        type: 'DELETE'
      })
    }
  }

  function insertScheduleItem (course, klass, subklass, scheduleItem, status, isSubklass) {
    previewScheduleItem(course, klass, subklass, scheduleItem, isSubklass)
    checkScheduleItem(course, klass, subklass, scheduleItem, status)
  }

  function previewScheduleItem (course, klass, subklass, scheduleItem, isSubklass) {
    if (!course.color) {
      var h = Math.random() * 180 + Math.random() * 180
        , s = Math.random() * 30 + 20
        , l = Math.random() * 30 + 40

      course.color = 'hsl(' + h + ',' + s + '%,' + l + '%)'
    }

    var html = ''
    html += '<li'
              + ' style="background-color:' + course.color + '"'
              + ' title="' + course.name + '"'
              + ' course="' + course.code + '"'
              + ' klass="' + klass.code + '"'
              + (subklass ? ' subklass="' + subklass.code + '"' : '')
              + ' class="preview"'
              + '>'
    html += '<h3>' + course.name + '</h3>'
    html += '<p class="details">'
    html += '<span class="class">' + (isSubklass ? subklass.code : klass.code) + '</span>'
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

  function checkScheduleItem (course, klass, subklass, scheduleItem, status) {
    $schedule
    .find(selector(course.code, klass.code, subklass ? subklass.code : null))
    .removeClass('preview')
    .removeClass('twinkling')
    .removeClass('favored')
    .addClass(status)

    if ('confirmed' === status) {
      var week = scheduleItem.week
      if (week.which) {
        week.which.forEach(function (w) {
          busy(scheduleItem.week.day, scheduleItem.time.which, w)
        })
      } else if (week.interval) {
        for (var w = week.start; w <= week.end; w += week.interval) {
          busy(scheduleItem.week.day, scheduleItem.time.which, w)
        }
      }
    }
  }

  function removeScheduleItem (course, klass, subklass, scheduleItem, status) {
    $schedule
    .find(selector(course.code, klass.code, subklass ? subklass.code : null))
    .removeClass('confirmed')
    .removeClass('favored')
    .addClass('preview')
    .addClass('twinkling')

    if ('confirmed' === status) {
      var week = scheduleItem.week
      if (week.which) {
        week.which.forEach(function (w) {
          free(scheduleItem.week.day, scheduleItem.time.which, w)
        })
      } else if (week.interval) {
        for (var w = week.start; w <= week.end; w += week.interval) {
          free(scheduleItem.week.day, scheduleItem.time.which, w)
        }
      }
    }
  }

  function processConflits () {
    Availables.forEach(function (course) {
      var $course = $availables
                    .find('[course="' + course.code + '"]')

      var hasKlass = false
        , cleanFavored = false

      course.klasses.forEach(function (klass) {
        var $klass = $course
                     .find('[klass="' + klass.code + '"]')

        var klassConflit = isConflit(course, klass)
        if (klassConflit) {
          $klass.addClass('conflit')
          .removeClass('favored')

          cleanFavored = true
        } else {
          $klass.removeClass('conflit')
        }

        if (klass.subklasses) {
          var hasSubklass = false

          klass.subklasses.forEach(function (subklass) {
            var $subklass = $klass
                            .find('[subklass="' + subklass.code + '"]')

            var subklassConflit = isConflit(course, subklass) || klassConflit
            if (subklassConflit) {
              $subklass.addClass('conflit')
              .removeClass('favored')

              cleanFavored = true

              bore(course, klass, subklass)
            } else {
              $subklass.removeClass('conflit')
              hasSubklass = true
            }
          })

          if (!hasSubklass) {
            $klass.addClass('conflit')
            .removeClass('favored')

            cleanFavored = true
          } else {
            $klass.removeClass('conflit')
          }
        }

        if (klassConflit && !klass.subklasses) {
          bore(course, klass, null)
        }

        if (!klassConflit && (hasSubklass || !klass.subklasses)) {
          hasKlass = true
        }
      })

      if (cleanFavored) {
        $course.removeClass('favored')

        if (!$course.find('.confirmed, .favored').length) {
          $course.css('background-color', '')
        }
      }

      if (!hasKlass) {
        $course.addClass('all-conflit')
      } else {
        $course.removeClass('all-conflit')
      }
    })
  }

  function isConflit (course, xklass) {
    if (_.find(Confirmed, { code: course.code, klass: xklass.code }) ||
        _.find(Confirmed, { code: course.code, subklass: xklass.code }) ) {
      // 自己怎么可以和自己冲突呢对不
      return false
    }

    return xklass.schedule.some(function (item) {
      var weeks = []
      for (var i = 0; i < 20; i++) {
        weeks[i] = false
      }

      if (item.week.which) {
        var conflit = item.week.which.some(function (w) {
          Schedule[item.time.which][item.week.day][w]
        })
        if (conflit) {
          return true
        }
      } else if (item.week.interval) {
        for (var w = item.week.start; w <= item.week.end; w += item.week.interval) {
          if (Schedule[item.time.which][item.week.day][w]) {
            return true
          }
        }
      }

      return false
    })
  }

  function busy (day, time, week) {
    Schedule[time][day][week] = true
  }

  function free (day, time, week) {
    Schedule[time][day][week] = false
  }

  function selector (course, klass, subklass) {
    return '[course="' + course + '"]'
         + (klass ? '[klass="' + klass + '"]' : '')
         + (subklass ? '[subklass="' + subklass + '"]' : '')
  }
})
