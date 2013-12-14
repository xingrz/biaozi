module.exports = function (seq, T) {
  var CalendarItem = seq.define('CalendarItem', {
    code    : { type: T.STRING }
  , klass   : { type: T.STRING }
  , subklass: { type: T.STRING }
  , status  : { type: T.ENUM, values: ['confirmed', 'locked', 'favored'] }
  }, {
    associate: function (models) {
      CalendarItem.belongsTo(models.User)
    }
  })

  return CalendarItem
}
