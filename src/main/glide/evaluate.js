/*global gs */

var taskboard = (function () {
	"use strict";
	var object;

	object = {};

	object.columns = [
		{ key: 'todo', name: 'Unassigned' },
		{ key: 'wip', name: 'In Progress' },
		{ key: 'pending', name: 'Pending' },
		{ key: 'resolved', name: 'Done' }
	];

	object.lanes = [
		{ key: "external", name: "Service operation" },
		{ key: "internal", name: "Improvement" }
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

	makeArrayIterable(object.columns);
	makeArrayIterable(object.lanes);

	object.columns.reset();
	while (object.columns.next()) {
		object.lanes.reset();
		object[object.columns.value().key] = makeArrayIterable([]);
		while (object.lanes.next()) {
			object[object.columns.value().key + ":" + object.lanes.value().key] = makeArrayIterable([]);
		}
	}

	return object;
}());
