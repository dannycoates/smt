module.exports = function (src) {
  var dateParts = /-(\d{4})(\d{2})(\d{2})_/.exec(src)
  if (!dateParts) { throw new Error('invalid input filename') }
  return `${dateParts[1]}/${dateParts[2]}/${dateParts[3]}/`
}
