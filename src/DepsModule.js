var moduleDeps = require("module-deps");
var shasum = require("shasum");
var insert = require('insert-module-globals');
var unique = require("lodash/array/uniq");
var UglifyJS = require("uglify-js");
process.env.NODE_ENV = "production";

module.exports = {
	cache: {},
	scan: function(file,cb){
		
		//first check the cache
		if(this.cache[file] !== undefined){
			cb(this.cache[file]);
			return;
		}
		
		var md = moduleDeps({
			transformKey: [ 'browserify', 'transform' ],
			globalTransform:[
				//insert globals
				function(file) { return insert(file); },
			]
		});
		var maps = {};
		var files = [];
		var hashes = {};
		md.on('data',function(row){
			hashes[row.id] = shasum(row.source);
			files.push(row);
		});
		md.on('end',function(){
			files.forEach(function(file){
				file.id = hashes[file.id];
				
				//uglify
				file.original = file.source;
				file.source = UglifyJS.minify(file.source, {fromString:true}).code;

				Object.keys(file.deps).forEach(function (key) {
					file.deps[key] = hashes[file.deps[key]];
				});
			});
			//remove duplicates
			files = unique(files,'original');
			this.cache[file] = files;
			cb(files);
		}.bind(this));
		md.end({ file: file});
	}
};