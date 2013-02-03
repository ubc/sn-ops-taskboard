/*global gs, GlideRecord */
var ok, table, todoBoard, wipBoard, resolvedBoard;

(function () {
	"use strict";
	var user, boards, incidents;

	user = gs.getUser();

	boards = {
		todo: [],
		wip: [],
		resolved: []
	};

	incidents = (function () {
		function loadIncidents() {
			var incidentRecords, task, taskboard;

			incidentRecords = new GlideRecord('incident');
			incidentRecords.addActiveFilter();
			incidentRecords.setLimit(10);
			incidentRecords.query();

			while (incidentRecords.next()) {
				task = {
					link: incidentRecords.getLink(),
					number: incidentRecords.number.toString(),
					assigned_to: incidentRecords.assigned_to.getRefRecord(),
					short_description: incidentRecords.short_description.toString(),
					taskboard_priority: computeTaskPriority(incidentRecords)
				};

				//boards[taskboard].push(task);
				boards.todo.push(task);
			}
		}

		return {
			loadTasks: loadIncidents
		};
	}());

	function getKeyNames(object) {
		var key, keys;

		keys = [];
		for (key in object) {
			if (Object.prototype.hasOwnProperty.call(object, key)) {
				keys.push(key);
			}
		}
		return keys;
	}

	function makeIterableArray(array) {
		var ix = -1;

		return {
			next: function () {
				ix += 1;
				return ix < array.length;
			},
			key: function () {
				return ix;
			},
			value: function () {
				return array[ix];
			},
			array: array
		};
	}

	function makeIterableObject(object) {
		var keyIx, keys;

		keys = getKeyNames(object);
		keyIx = -1;

		return {
			next: function () {
				keyIx += 1;
				return keyIx < keys.length;
			},
			key: function () {
				return keys[keyIx];
			},
			value: function () {
				return object[keys[keyIx]];
			},
			object: object,
			keys: makeIterableArray(keys)
		};
	}

	function computeTaskPriority(taskRecord) {
		var assignedToScore, priorityScore, openedAtDate, ageScore;

		assignedToScore = (taskRecord.assigned_to === user.getID()) ? 10000 : 0;

		priorityScore = (4 - taskRecord.priority) * 1000;

		openedAtDate = new Date(taskRecord.opened_at.replace(' ', 'T'));
		ageScore = (new Date().getTime() - openedAtDate.getTime()) / 86400000;

		return assignedToScore + priorityScore + ageScore;
	}

	incidents.loadTasks();

	todoBoard = makeIterableArray(boards.todo);
	wipBoard = makeIterableArray(boards.wip);
	resolvedBoard = makeIterableArray(boards.resolved);

	table = makeIterableObject(boards.todo[0]);
	ok = 1;
}());
