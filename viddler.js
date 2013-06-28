var 
request = require('request'),
fs = require("fs"),
path = require("path")
sys = require('util'),
restler = require('restler');

var Viddler = function (API_KEY, USER, PASSWORD) {
	var self = this;

	var doUpload = function (videoData, onSuccess, onFail) {

		var sessionid;
		var token;
		var endpoint;

		var authCallback = function(response, success) {
			if(
				!success
				|| !response.auth
				|| !response.auth.sessionid
				|| response.error
			){
				console.log("Auth failed", response);
				if(onFail) onFail.call(null, self);
				return;
			}
			console.log("Auth Success", response);
			sessionid = response.auth.sessionid;
			prepareUpload(response.auth.sessionid, prepareUploadCallback);
		}

		var prepareUploadCallback = function(response, success) {
			if(
				!success
				|| !response.upload
				|| !response.upload.token
				|| !response.upload.endpoint
				|| response.error
			){
				console.log("Prepare Upload failed", response);
				if(onFail) onFail.call(null, self);
				return;
			}

			console.log("Prepare Upload Success");


			videoData.uploadtoken = response.upload.token;

			var data =  {
				uploadtoken: response.upload.token,
				title: videoData.title,
				description: videoData.description,
				tags: videoData.tags,
				file: videoData.file
			}

			
			upload(
				response.upload.endpoint,
				data,
				uploadCallback
			);

			var recursiveProgress = function(response, success){
				console.log(response);
				if(response && response.upload_progress.status != 1) return;
				getProgress(data.uploadtoken, sessionid,function (_response, _success) {
					setTimeout(function() {
						recursiveProgress(_response, _success)
					}, 1000)
				});
			}
			recursiveProgress();
		}

		var uploadCallback = function(response, success) {
			if(
				!success
				|| !response.video
				|| !response.video.id
				|| response.error
			){
				console.log("Upload failed", response);
				if(onFail) onFail.call(null, self);
				return;
			}

			console.log("Upload Success");
			if(onSuccess) onSuccess.call(null, response)
		}

		// load file and  go!
		fs.stat(videoData.filename, function(err, stats) {
			if(err){
				console.log("Couldn't load file", response);
				if(onFail) onFail.call(null, self);
				return;
			}
			videoData.file = restler.file(videoData.filename, null, stats.size, null);
			auth(USER, PASSWORD, authCallback);
		});	
	}

	var auth = function (user, password, callback) {
		call(
			'users.auth',
			'get',
			{
				user: user,
				password: password
			},
			callback
		);
	}
	var prepareUpload = function (sessionId, callback) {

		call(
			'videos.prepareUpload',
			'get',
			{
				sessionid: sessionId
			},
			callback
		);
	}
	var getProgress = function (token, sessionId, callback) {
		call(
			'videos.uploadProgress',
			'get',
			{
				token: token,
				sessionid: sessionId
			},
			callback
		);
	}
	var upload = function (endpoint, data, callback) {

		callEndpoint(
			endpoint,
			'post',
			data,
			callback
		);
	}
	var call = function (name, method, form, callback) {
		form.api_key = API_KEY;

		var uri = "http://api.viddler.com/api/v2/viddler." + name + ".json"
		var cb = function (error, response, body) {
			var json = {}
			try{
				json = JSON.parse(body)
			}
			catch(error){
				console.log('Cannont parse response.body to JSON',  body)
			}
			if (!error && response.statusCode == 200) {
				if(callback) callback.call(null, json, true);
			}
			else{
				if(callback) callback.call(null, json, false);
			}
		}

		if(method == 'get'){
			uri += '?';
			for(key in form){
				uri += '&' + key + '=' + form[key]
			}
		}

		request[method](uri, {form : form}, cb);
	}
	var callEndpoint = function (endpoint, method, data, callback) {
		var uri = endpoint;
		var cb = function (error, response, body) {
			var json = {}
			try{
				json = JSON.parse(body)
			}
			catch(error){
				console.log('Cannont parse response.body to JSON',  body)
			}

			if (!error && response.statusCode == 200) {
				if(callback) callback.call(null, json, true);
			}
			else{
				if(callback) callback.call(null, json, false);
			}
		}

		if(method == 'get'){
			uri += '?';
			for(key in data){
				uri += '&' + key + '=' + form[key]
			}
		}

		console.log(endpoint, data);

		restler[method](uri, {
			multipart: true,
			data: data

		}).on("complete", function(data) {
			console.log(data);
		});
	}
	self.doUpload = doUpload;
}


exports.Viddler = Viddler;