var $ = require('cheerio')

exports.parse = function (html) {
  return $(html).find('tr').slice(1).map(function () {
    var cells = $(this).find('td')
    return {
      id: +$(cells[4]).find('a').attr('href').slice(0, -5)
    , name: $(cells[4]).text()
    , code: $(cells[2]).text()
    , credit: +$(cells[3]).text()
    , required: ('必修' === $(cells[1]).text())
    , department: $(cells[0]).text()
    }
  })
}
