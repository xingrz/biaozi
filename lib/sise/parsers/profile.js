var $ = require('cheerio')

exports.confirmed = function (html) {
  return $(html).find('table.table tr:has(td)').map(function (row) {
    var cells = $(this).find('td')
    if (cells.length == 10) {
      return { code: $(cells[1]).text().trim(), remarks: $(cells[8]).text().trim() }
    } else if (cells.length == 9) {
      return { code: $(cells[0]).text().trim(), remarks: $(cells[7]).text().trim() }
    }
  }).filter(function (i) {
    return !~['', '已选'].indexOf(i.remarks)
  }).map(function (i) {
    return i.code
  })
}
