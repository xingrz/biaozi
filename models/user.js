module.exports = function (seq, T) {
  var User = seq.define('User', {
    username: { type: T.STRING, unique: true }
  }, {
    associate: function (models) {
      User.hasMany(models.Course)
    }
  })

  return User
}
