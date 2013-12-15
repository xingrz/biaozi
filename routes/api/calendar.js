var EventProxy = require('eventproxy')
  , _ = require('lodash')

var User = require('../../models').User
  , CalendarItem = require('../../models').CalendarItem

var sise = require('../../lib/sise')

var debug = require('debug')('@:routes:api:calendar')

exports.index = function (req, res, error) {
  CalendarItem.findAll({
                where: { UserId: req.user.id }
              , attributes: [ 'id', 'code', 'klass', 'subklass', 'status' ]
              })
              .error(error)
              .success(function (calendar) {
                res.send(200, calendar)
              })
}

exports.confirm = function (req, res, error) {
  if (!req.body.klass) {
    return res.send(400)
  }

  if (req.body.subklass) {
    var match = req.body.subklass.match(/^([A-Z]+)([0-9]+)$/)
    if (!match || req.body.klass !== match[1] || +match[2] < 1) {
      return res.send(409)
    }
  }

  var ep = new EventProxy

  // 一旦 confirm 了某个班，即可清除所有 favored
  // 只能存在一个 confirmed，因此也要一并清除旧的 confirmed

  ep.once('start', function () {
    CalendarItem.destroy({ UserId: req.user.id, code: req.params.code })
                .complete(ep.done('removed'))
  })

  ep.once('removed', function () {
    CalendarItem.create({
                  UserId: req.user.id
                , code: req.params.code
                , klass: req.body.klass
                , subklass: req.body.subklass || null
                , status: 'confirmed'
                })
                .complete(ep.done('done'))
  })

  ep.once('done', function () {
    res.send(201, {
      code: req.params.code
    , klass: req.body.klass
    , subklass: req.body.subklass || null
    , status: 'confirmed'
    })
  })

  ep.fail(error).emit('start')
}

exports.deny = function (req, res, error) {
  // 取消 confirmed 的情景貌似没有
  // 一般只是手滑点了 confirm

  CalendarItem.destroy({
                UserId: req.user.id
              , code: req.params.code
              , status: 'confirmed'
              })
              .error(error)
              .success(function () {
                res.send(204)
              })
}

exports.favor = function (req, res, error) {
  if (!req.body.klass) {
    return res.send(400)
  }

  if (req.body.subklass) {
    var match = req.body.subklass.match(/^([A-Z]+)([0-9]+)$/)
    if (!match || req.body.klass !== match[1] || +match[2] < 1) {
      return res.send(409)
    }
  }

  var ep = new EventProxy

  // 一个 course 可以有多个不同的 favored
  // 但会覆盖相同 xklass 的 confirmed

  ep.once('start', function () {
    CalendarItem.destroy({
                  UserId: req.user.id
                , code: req.params.code
                , klass: req.body.klass
                , subklass: req.body.subklass || null
                , status: 'confirmed'
                })
                .complete(ep.done('clean'))
  })

  ep.once('start', function () {
    CalendarItem.findOrCreate({
                  UserId: req.user.id
                , code: req.params.code
                , klass: req.body.klass
                , subklass: req.body.subklass || null
                , status: 'favored'
                }, {})
                .complete(ep.done('created'))
  })

  ep.all('clean', 'created', function () {
    res.send(201, {
      code: req.params.code
    , klass: req.body.klass
    , subklass: req.body.subklass || null
    , status: 'favored'
    })
  })

  ep.fail(error).emit('start')
}

exports.bore = function (req, res, error) {
  if (req.params.subklass) {
    var match = req.params.subklass.match(/^([A-Z]+)([0-9]+)$/)
    if (!match || req.params.klass !== match[1] || +match[2] < 1) {
      return res.send(409)
    }
  }

  CalendarItem.destroy({
                UserId: req.user.id
              , code: req.params.code
              , klass: req.params.klass
              , subklass: req.params.subklass || null
              , status: 'favored'
              })
              .error(error)
              .success(function () {
                res.send(204)
              })
}
