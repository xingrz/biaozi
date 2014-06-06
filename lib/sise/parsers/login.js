var $ = require('cheerio')
  , vm = require('vm')

var debug = require('debug')('@:lib:sise:loginParser')

var compiled = null
  , cache = null

exports.form = function (html) {
    /**
     * 如果 HTML 没变，就直接返回之前的结果
     */

    if (html === cache) {
      return compiled
    }

    var form = $(html).find('form')

    if (!form) {
      debug('tag <form> not found')
      return null
    }

    /**
     * DOM 静态分析，提取出 CSRF 字段
     */

    var csrf = form.find('input[type="hidden"]')

    if (!csrf) {
      debug('csrf field not found')
      return null
    }

    var csrfKey = csrf.attr('name')
      , csrfValue = csrf.attr('value')

    if (!csrfKey || !csrfValue) {
      debug('csrf field key or value parse failed')
      return null
    }

    debug('parsed csrf %s = %s', csrfKey, csrfValue)

    var action = form.attr('action')
    if (!action) {
      /**
       * 脚本动态分析，提取出表单提交目标
       */

      var script = $(html).find('script')

      if (!script) {
        debug('tag <script> not found')
        return null
      }

      var formName = form.attr('name')

      if (!formName) {
        debug('form name parse failed')
        return null
      }

      debug('found form %s', formName)

      // 构建伪 DOM 沙盒
      var sandbox = {
        document: {
          all: {
            username: {
              value: { length: 1 }
            }
          , password: {
              value: { length: 1 }
            }
          }
        , getElementById: function () {
            return {}
          }
        }
      }

      sandbox[formName] = {
        action: null
      , submit: function () {}
      }

      // 执行脚本
      vm.runInNewContext(script.text(), sandbox)

      // 寻找负责提交表单的函数名
      var handlerName = null
      Object.keys(sandbox).forEach(function (i) {
        if ('function' === typeof sandbox[i] &&
            ~sandbox[i].toString().indexOf(formName + '.submit()')) {
          handlerName = i
        }
      })

      if (!handlerName) {
        debug('no event handler found')
        return null
      }

      debug('found submit handler %s', handlerName)

      // 执行表单提交函数
      vm.runInNewContext(handlerName + '()', sandbox)

      var action = sandbox[formName].action

      if (!action) {
        debug('failed parsing form action')
        return callback(null, false)
      }
    }

    debug('found form action %s', action)

    cache = html
    compiled = {
      csrfKey: csrfKey
    , csrfValue: csrfValue
    , action: action
    }

    return compiled
}

exports.main = function (html) {
  var match = html.match(/courseViewAction\.do\?method\=doMain\&studentid\=([^\']+?)\'/)
  return match ? match[1] : null
}
