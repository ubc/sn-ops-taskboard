var boards = (function () {
	"use strict";
	var boardVariables, boardNames, ix;

	ix = -1;
	boardVariables = ['todoBoard', 'wipBoard', 'resolvedBoard'];
	boardNames = ['To Do', 'In Progress', 'Resolved'];

	return {
		next: function () {
			ix += 1;
			return ix < boardVariables.length;
		},
		reset: function () {
			ix = -1;
		},
		variable: function () {
			return boardVariables[ix];
		},
		name: function () {
			return boardNames[ix];
		}
	};
}());
