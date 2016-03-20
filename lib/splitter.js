var through = require('through2')

module.exports = function createSplitter(options) {
  var chunkSize = options.chunkSize
  var filename = options.filename
  var createOutputStream = options.createOutputStream

  if (!chunkSize) {
    return createOutputStream(filename, null, options)
  }

  var totalBytes = 0
  var fileCount = 0

  var outputStream = createOutputStream(filename, fileCount, options)

  var splitter = through(
    function (data, _, cb) {
      totalBytes += data.length
      if ((totalBytes - (chunkSize * fileCount)) >= chunkSize) {
        this.unpipe(outputStream)
        outputStream.end()
        outputStream = createOutputStream(filename, ++fileCount, options)
        this.pipe(outputStream)
      }
      cb(null, data)
    }
  )

  splitter.pipe(outputStream)
  return splitter
}
