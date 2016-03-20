var path = require('path')
var Zlib = require('zlib')
var AWS = require('aws-sdk')
var HekaDecodeStream = require('heka-decode-stream')
var createSplitter = require('../lib/splitter')
var url = require('url')

function s3url2object(u) {
  var x = url.parse(u)
  return {
    Bucket: x.hostname,
    Key: (x.pathname || '').substring(1)
  }
}

module.exports = function (createOutputStream, options) {
  var src = s3url2object(options.in)
  var key = src.Key

  var s3 = new AWS.S3({
    accessKeyId: options['aws-key-in'],
    secretAccessKey: options['aws-secret-in']
  })

  var prefix = options.prefix || ''
  s3.getObject(src)
    .createReadStream()
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
        filename: prefix + path.basename(key, path.extname(key)),
        createOutputStream: createOutputStream
      })
    )
}
