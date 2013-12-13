var request = require('request')
  , iconv = require('iconv-lite')
  , EventProxy = require('eventproxy')

var loginParser = require('./parsers/login')
  , scheduleParser = require('./parsers/schedule')
  , coursesParser = require('./parsers/courses')
  , profileParser = require('./parsers/profile')

var debug = require('debug')('@:lib:sise')

var SISE = 'http://class.sise.com.cn:7001'

exports.login = function (username, password, callback) {
  var ep = new EventProxy()

  var jar = request.jar()

  ep.once('start', function () {
    request.get(SISE + '/sise/login.jsp', {
      jar: jar
    , encoding: null
    }, ep.done('get login', function (res, buffer) {
      return iconv.decode(buffer, 'gbk')
    }))
  })

  ep.once('get login', function (html) {
    var parsed = loginParser.form(html)
    if (!parsed) {
      debug('failed parsing login page')
      return callback(null, false)
    }

    var form = {
      username: username
    , password: password
    }

    form[parsed.csrfKey] = parsed.csrfValue

    request.post(SISE + '/sise/' + parsed.action, {
      jar: jar
    , encoding: null
    , form: form
    }, ep.done('post login', function (res, buffer) {
      return iconv.decode(buffer, 'gbk')
    }))
  })

  ep.once('post login', function (html) {
    if (!~html.indexOf('top.location.href=\'/sise/index.jsp\'')) {
      return callback(null, false)
    }

    jar.getCookies(SISE, ep.done('cookies'))

    request.get(SISE + '/sise/module/student_states/student_select_class/main.jsp', {
      jar: jar
    , encoding: null
    }, ep.done('main', function (res, buffer) {
      return iconv.decode(buffer, 'gbk')
    }))
  })

  ep.all('cookies', 'main', function (cookies, html) {
    var key = loginParser.main(html)
    if (!key) {
      return callback(null, false)
    }

    return callback(null, { jar: cookies[0].cookieString(), key: key })
  })

  ep.fail(callback)
  ep.emit('start')
}

exports.calendar = function (cookie, year, semester, callback) {
  var jar = request.jar()
  jar.setCookie(cookie, SISE, function (err) {
    if (err) {
      return callback(err)
    }

    request.get(SISE + '/sise/module/student_schedular/student_schedular.jsp'
                     + '?schoolyear=' + year
                     + '&semester=' + semester,
    {
      jar: jar
    , encoding: null
    }, function (err, res, buffer) {
      if (err) {
        return callback(err)
      }

      var html = iconv.decode(buffer, 'gbk')
      if (~html.indexOf('top.location.href=\'/sise/login.jsp\'')) {
        return callback(null, null)
      }

      var calendar = scheduleParser.parse(html)
      callback(null, calendar)
    })
  })
}

exports.courses = function (callback) {
  request.get(SISE + '/sise/coursetemp/courseInfo.html', {
    encoding: null
  }, function (err, res, buffer) {
    if (err) {
      return callback(err)
    }

    var html = iconv.decode(buffer, 'gbk')
    callback(null, coursesParser.parse(html))
  })
}

exports.klasses = function (id, callback) {
  request.get(SISE + '/sise/coursetemp/' + id + '.html', {
    encoding: null
  }, function (err, res, buffer) {
    if (err) {
      return callback(err)
    }

    var html = iconv.decode(buffer, 'gbk')

    var klasses = coursesParser.klasses(html)
    callback(null, klasses)
  })
}

exports.requirements = function (id, callback) {
  request.get(SISE + '/sise/common/course_view.jsp?id=' + id, {
    encoding: null
  }, function (err, res, buffer) {
    if (err) {
      return callback(err)
    }

    var html = iconv.decode(buffer, 'gbk')

    var requirements = coursesParser.requirements(html)
    callback(null, requirements)
  })
}

exports.confirmed = function (id, callback) {
  request.get(SISE + '/SISEWeb/pub/course/courseViewAction.do'
                   + '?method=doMain'
                   + '&studentid=' + id,
  { encoding: null }, function (err, res, buffer) {
    if (err) {
      return callback(err)
    }

    var html = iconv.decode(buffer, 'gbk')
    callback(null, profileParser.confirmed(html))
  })
}
