var url = require('url')
var path = require('path')
var bytes = require('bytes')
var nopt = require('nopt')
var noptDefaults = require('nopt-defaults')
var mkdirp = require('mkdirp')

var options = noptDefaults(
  nopt(
  {
    // arguments
    in: [url, path],
    out: [url, path],
    filter: path,
    transform: path,
    'aws-key-in': String,
    'aws-secret-in': String, // out aws credentials come from env
    split: [false, String],
    prefix: [Boolean, path],
    gzip: Boolean
  },
  {
    // shortcuts
    z: ['--gzip']
  },
  process.argv, 2),
  {
    // defaults
    filter: path.join(__dirname, '../defaults/filter.js'),
    transform: path.join(__dirname, '../defaults/transform.js'),
    split: false,
    prefix: true,
    gzip: true
  }
)

var src = url.parse(options.in)
var input = src.protocol === 's3:' ?
  require('../lib/s3_input') :
  require('../lib/file_input')

var out = url.parse(options.out)
var output = out.protocol === 's3:' ?
  require('../lib/s3_output') :
  require('../lib/file_output')

if (options.prefix === true) {
  options.prefix = path.join(__dirname, '../defaults/prefix.js')
}
if (options.prefix) {
  options.prefix = require(options.prefix)(options.in)
  if (out.protocol !== 's3:') {
    mkdirp.sync(path.join(options.out, options.prefix))
  }
}
if (options.filter) {
  options.filter = require(options.filter)
}
if (options.transform) {
  options.transform = require(options.transform)
}
options.chunkSize = options.split ? bytes.parse(options.split) : 0;

input(output, options)
