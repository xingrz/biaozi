var request = require('request')
  , $ = require('cheerio')
  , iconv = require('iconv-lite')
  , EventProxy = require('eventproxy')
  , loginParser = require('./login_parser')

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
    var parsed = loginParser(html)
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

    return callback(null, jar)
  })

  ep.fail(callback)
  ep.emit('start')
}

