var crypto = require('crypto')
var through = require('through2')

const storageRegex = /\d+\/storage\/(\w+)/

function getUid(path) {
	var match = /(\d+)\/storage\//.exec(path)
	if (match) {
		return crypto.createHash('sha256')
			.update(match[1])
			.digest('hex')
			.substring(0, 32)
	}
	return null
}

function deriveDeviceId(uid, agent) {
	if (!uid) { return null }
	return crypto.createHash('sha256')
		.update(uid + agent)
		.digest('hex')
		.substring(0, 32)
}

function getIds(obj) {
  obj.uid = obj.fields.fxa_uid
  obj.dev = obj.fields.device_id
  obj.synth_uid = getUid(obj.fields.path)
  obj.synth_dev = deriveDeviceId(
    obj.synth_uid,
    obj.fields.user_agent_browser
    + obj.fields.user_agent_version
    + obj.fields.user_agent_os
  )
}

module.exports = through.obj(
  function (obj, _, cb) {
    getIds(obj)
    var p = storageRegex.exec(obj.fields.path)
    if (!p) { return cb() }

    var code = 200

    // support modern mozlog's use of errno for http status
    if (!!obj.fields.errno) {
        if (obj.fields.errno == 0) { // success
            code = 200
        } else {
            code = obj.fields.errno
        }
    } else { // support sync's proprietary field
        code = obj.fields.code
    }

    var s = {
      uid: obj.uid || obj.synth_uid,
      s_uid: obj.synth_uid,
      dev: obj.dev || obj.synth_dev,
      s_dev: obj.synth_dev,
      ts: obj.timestamp,
      method: obj.fields.method,
      code: code,
      bucket: p[1],
      t: (!!obj.fields.t ? obj.fields.t : Math.floor(obj.fields.request_time * 1000) || 0),
      ua_browser: obj.fields.user_agent_browser,
      ua_version: obj.fields.user_agent_version,
      ua_os: obj.fields.user_agent_os,
      host: obj.hostname
    }
    cb(null, Buffer(JSON.stringify(s) + '\n'))
  }
)
