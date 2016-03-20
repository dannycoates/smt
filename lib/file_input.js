var Zlib = require('zlib')
var path = require('path')
var fs = require('fs')
var HekaDecodeStream = require('heka-decode-stream')
var createSplitter = require('./splitter')

module.exports = function (createOutputStream, options) {
  var src = options.in
  var prefix = options.prefix || ''

  fs.createReadStream(src)
    .pipe(Zlib.createGunzip())
    .pipe(HekaDecodeStream.createDecodeStream({
      filter: options.filter
    }))
    .pipe(options.transform)
    .pipe(
      createSplitter({
        dest: options.out,
        chunkSize: options.chunkSize,
        gzip: options.gzip,
        filename: prefix + path.basename(src, path.extname(src)),
        createOutputStream: createOutputStream
      })
    )
}
