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

exports.modify = function (req, res, error) {
  var ep = new EventProxy()

  CalendarItem.find({ where: { UserId: req.user.id, code: req.params.code } })
              .complete(ep.done('find'))

  ep.once('find', function (item) {
    if (item) {
      if (req.body.klass) {
        item.klass = req.body.klass
      }

      if (req.body.subklass) {
        item.subklass = req.body.subklass
      }

      if (req.body.status) {
        item.status = req.body.status
      }

      if (item.subklass) {
        var match = item.subklass.match(/^([A-Z]+)([0-9]+)$/)
        if (!match || item.klass !== match[1] || +match[2] < 1) {
          return res.send(409)
        }
      }

      if (item.status && !_.contains([ 'confirmed', 'favored' ], item.status)) {
        return res.send(409)
      }

      item.save().complete(ep.done('updated'))
    } else {
      if (!req.body.klass || !req.body.status) {
        return res.send(409)
      }

      if (req.body.subklass) {
        var match = req.body.subklass.match(/^([A-Z]+)([0-9]+)$/)
        if (!match || req.body.klass !== match[1] || +match[2] < 1) {
          return res.send(409)
        }
      }

      if (req.body.status && !_.contains([ 'confirmed', 'favored' ], req.body.status)) {
        return res.send(409)
      }

      CalendarItem.create({
                    code: req.params.code
                  , klass: req.body.klass
                  , subklass: req.body.subklass
                  , status: req.body.status
                  , UserId: req.user.id
                  })
                  .complete(ep.done('created'))
    }
  })

  ep.all('find', 'updated', function (calendar) {
    res.send(200, calendar)
  })

  ep.once('created', function (calendar) {
    res.send(200, calendar)
  })

  ep.fail(error)
}

exports.remove = function (req, res, error) {
  CalendarItem.destroy({ code: req.params.code, UserId: req.user.id })
              .error(error)
              .success(function () {
                res.send(204)
              })
}
