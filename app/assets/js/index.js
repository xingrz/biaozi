$(function () {

  var colorOfName = {}
  function color (name) {
    if (colorOfName[name]) return colorOfName[name]
    var r = Math.floor(Math.random() * 0xef + 0x10)
    var g = Math.floor(Math.random() * 0xef + 0x10)
    var b = Math.floor(0xff - (r + g) / 2)
    colorOfName[name] = '#' + r.toString(16) + g.toString(16) + b.toString(16)
    return colorOfName[name]
  }

  $.get('/api/calendar', function (json) {
    var schedule = ScheduleBuilder.build(json)
    schedule.forEach(function (row, time) {
      row.forEach(function (cell, day) {
        cell.forEach(function (klass) {
          var week = klass.week
            , html = ''

          html += '<li style="background:' + color(klass.name) + '">'
          html += '<h3>' + klass.name + '</h3>'
          html += '<p class="details">'
          html += '<span class="class">' + klass.code + '</span>'
          html += '<span class="teacher">' + klass.teacher + '</span>'

          if (week.which) {
            html += '<span class="weeks">第 ' + week.which + ' 周</span>'
          } else if (week.weeks) {
            html += '<span class="weeks">第 ' + week.weeks.join(' ') + ' 周</span>'
          } else if (week.interval) {
            switch (week.interval) {
              case 1:
                html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周</span>'
                break
              case 2:
                if (week.start % 2) {
                  html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周单周</span>'
                }
                else {
                  html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周双周</span>'
                }
                break
              default:
                html += '<span class="weeks">第 ' + week.start + ' - ' + week.end + ' 周每 ' + week.interval + ' 周</span>'
                break
            }
          }

          html += '<span class="teacher">' + klass.location + '</span>'
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

          $('#cell-' + day + '-' + time).append(html)
        })
      })
    })

  }, 'json')
})
