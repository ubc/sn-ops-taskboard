var taskboard = (function () {
	"use strict";
	var object, boardKeys, boardNames, ix;

	boardKeys = ['todoBoard', 'wipBoard', 'resolvedBoard'];
	boardNames = ['Unassigned', 'In Progress', 'Done'];

	object = {
		next: function () {
			ix += 1;
			return ix < boardKeys.length;
		},
		reset: function () {
			ix = -1;
		},
		key: function () {
			return boardKeys[ix];
		},
		name: function () {
			return boardNames[ix];
		}
	};

	for (ix = 0; ix < boardKeys.length; ix++) {
		object[boardKeys[ix]] = [];
	}

	ix = -1;
	return object;
}());
