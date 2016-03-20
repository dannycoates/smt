var Zlib = require('zlib')
var fs = require('fs')
var path = require('path')

module.exports = function createFileStream(filename, fileNumber, options) {
  var name = typeof(fileNumber) === 'number' ?
    `${filename}_${fileNumber}` :
    `${filename}`

  if (options.gzip) {
    name += '.gz'
    var zip = Zlib.createGzip()
    var fileStream = fs.createWriteStream(path.join(options.dest, name))
    zip.pipe(fileStream)
    return zip
  }
  return fs.createWriteStream(path.join(options.dest, name))
}
