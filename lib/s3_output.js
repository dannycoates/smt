var Zlib = require('zlib')
var AWS = require('aws-sdk')
var s3 = new AWS.S3()
var through = require('through2')
var path = require('path')
var url = require('url')

function s3url2object(u) {
  var x = url.parse(u)
  return {
    Bucket: x.hostname,
    Key: (x.pathname || '').substring(1)
  }
}

module.exports = function createS3Stream(filename, fileNumber, options) {
  var dest = s3url2object(options.dest)
  var stream = options.gzip ? Zlib.createGzip() : through()
  var name = typeof(fileNumber) === 'number' ?
    `${filename}_${fileNumber}` :
    `${filename}`

  if (options.gzip) { name += '.gz' }

  s3.upload(
    {
      Bucket: dest.Bucket,
      Key: path.join(dest.Key, name),
      Body: stream
    },
    function (err, data) {
      if (err) { return console.error(err) }
      console.log(`${data.Location} done`)
    }
  )
  return stream
}
