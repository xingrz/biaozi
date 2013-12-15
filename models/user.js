module.exports = function (seq, T) {
  var User = seq.define('User', {
    username  : { type: T.STRING, unique: true }
  , password  : { type: T.STRING }
  , salt      : { type: T.STRING }
  , key       : { type: T.STRING }
  }, {
    associate: function (models) {
      User.hasMany(models.CalendarItem)
    }
  })

  return User
}
