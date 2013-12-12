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
          var html = ''

          html += '<li style="background:#' + color(klass.name) + '">'



          html += '</li>'

          $('#cell-' + day + '-' + time).append(html)
        })
      })
    })

  }, 'json')
})

/*

                    li(style='background:#{color(klass.name)}')
                      week = klass.week
                      h3 #{klass.name}
                      p.details
                        span.class #{klass.code}
                        span.teacher #{klass.teacher}
                        span.weeks
                          if week.which
                            | 第 #{week.which} 周
                          else if week.weeks
                            | 第 #{week.weeks.join(' ')} 周
                          else if week.interval
                            case week.interval
                              when 1
                                | 第 #{week.start} - #{week.end} 周
                              when 2
                                if week.start % 2
                                  | 第 #{week.start} - #{week.end} 周单周
                                else
                                  | 第 #{week.start} - #{week.end} 周双周
                              default
                                | 第 #{week.start} - #{week.end} 周每隔 #{week.interval} 周
                        span.location #{klass.location}
                      p.graph
                        - var weeks = []
                        - for (var i = 0; i < 20; i++)
                          - weeks[i] = 0

                        if week.which
                          - weeks[week.which - 1] = 1
                        else if week.weeks
                          each w in week.weeks
                            - weeks[w - 1] = 1
                        else if week.interval
                          - for (var w = week.start; w <= week.end; w += week.interval)
                            - weeks[w - 1] = 1

                        each w in weeks
                          if w == 1
                            i.y
                          else
                            i

*/
