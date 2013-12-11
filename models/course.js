module.exports = function (seq, T) {
  var Course = seq.define('Course', {
    name: T.STRING
  }, {
    associate: function (models) {
      Course.belongsTo(models.User)
    }
  })

  return Course
}
