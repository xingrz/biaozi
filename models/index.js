var readdirSync = require('fs').readdirSync
  , join = require('path').join
  , Sequelize = require('sequelize')
  , extend = require('lodash').extend

var config = require('../package.json').config.mysql
if ('production' != process.env.NODE_ENV) {
  config.database += '_dev'
}

var sequelize = new Sequelize(config.database, config.username)
  , db = {}

readdirSync(__dirname).forEach(function (file) {
  if (file.indexOf('.') !== 0 && file !== 'index.js') {
    var model = sequelize.import(join(__dirname, file))
    db[model.name] = model
  }
})

Object.keys(db).forEach(function(modelName) {
  if (db[modelName].options.hasOwnProperty('associate')) {
    db[modelName].options.associate(db)
  }
})

module.exports = extend(db, {
  sequelize: sequelize,
  Sequelize: Sequelize
})
