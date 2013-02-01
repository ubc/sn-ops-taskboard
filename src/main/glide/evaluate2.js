"use strict";

var incidents = new GlideRecord('incident');
incidents.addActiveFilter();
incidents.query();
incidents.next();

var key;
var keys = [];
for (key in incidents) {
	if (incidents.hasOwnProperty(key)) {
		keys.push(key);
	}
}

var keyIx = -1;

var table = {
	keys: function () {
		return keys;
	},
	next: function () {
		keyIx += 1;
		return keyIx < keys.length;
	},
	key: function () {
		return keys[keyIx];
	},
	value: function () {
		return incidents[keys[keyIx]];
	}
};
