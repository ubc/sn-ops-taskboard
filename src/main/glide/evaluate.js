/*global gs */

var taskboard = (function () {
	"use strict";
	var object;

	object = {};

	object.boards = [
		{ key: 'todo', name: 'Unassigned' },
		{ key: 'wip', name: 'In Progress' },
		{ key: 'resolved', name: 'Done' }
	];

	object.currentUser = gs.getUser();
	object.currentGroups = object.currentUser.getMyGroups();

	function makeArrayIterable(array) {
		var ix = -1;

		array.reset = function () {
			ix = -1;
		};

		array.next = function (max) {
			ix += 1;
			if (max !== undefined) {
				return ix < array.length && ix < max;
			} else {
				return ix < array.length;
			}
		};

		array.value = function () {
			return array[ix];
		};

		return array;
	}

	makeArrayIterable(object.boards);

	while (object.boards.next()) {
		object[object.boards.value().key] = makeArrayIterable([]);
	}

	return object;
}());
