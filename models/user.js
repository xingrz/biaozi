module.exports = function (seq, T) {
  var User = seq.define('User', {
    username: { type: T.STRING, unique: true }
  , calendar: { type: T.TEXT }
  })

  return User
}
