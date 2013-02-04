/*global gs, GlideRecord */
var ok, todoBoard, wipBoard, resolvedBoard;

(function () {
	"use strict";
	var user, boards, incidents, problems;

	user = gs.getUser();

	boards = {
		todo: [],
		wip: [],
		resolved: []
	};

	incidents = (function () {
		var stateTaskboardMap;

		stateTaskboardMap = {
			'New': null,
			'Accepted': 'todo',
			'Assigned': 'wip',
			'Work in progress': 'wip',
			'Pending Change': 'wip',
			'Pending Vendor': 'wip',
			'Resolved': 'resolved',
			'Active': 'wip' // DEMO INSTANCE ONLY
		};

		function loadTasks() {
			var incidentRecords, task, taskboard;

			incidentRecords = new GlideRecord('incident');
			incidentRecords.addActiveFilter();
			// TODO: Filter for assignment group
			incidentRecords.query();

			while (incidentRecords.next()) {
				task = {
					link: incidentRecords.getLink(),
					number: incidentRecords.number.toString(),
					opened_at: incidentRecords.opened_at.toString(),
					assigned_to: incidentRecords.assigned_to.getDisplayValue(),
					assigned_to_link: incidentRecords.assigned_to.getRefRecord().getLink(),
					caller_id: incidentRecords.caller_id.getDisplayValue(),
					caller_id_link: incidentRecords.caller_id.getLink(),
					short_description: incidentRecords.short_description.toString(),
					priority: incidentRecords.priority.getDisplayValue(),
					state: incidentRecords.state.getDisplayValue(),
					taskboard_priority: computeTaskPriority(incidentRecords)
				};

				taskboard = stateTaskboardMap[task.state];
				if (taskboard === undefined) {
					taskboard = 'todo';
					task.short_description = '(unknown state ' + task.state + ') ' + task.short_description;
				}
				if (taskboard !== null) {
					boards[taskboard].push(task);
				}
			}
		}

		return {
			loadTasks: loadTasks
		};
	}());

	problems = (function () {
		var stateTaskboardMap;

		stateTaskboardMap = {
			'New': 'todo',
			'Accepted': 'todo',
			'Assigned': 'wip',
			'Work in progress': 'wip',
			'Pending Change': 'wip',
			'Pending Schedule': 'wip',
			'Pending Vendor': 'wip',
			'Resolved': 'resolved',
			'Open': 'wip', // DEMO INSTANCE ONLY
			'Closed/Resolved': 'resolved' // DEMO INSTANCE ONLY
		};

		function loadTasks() {
			var problemRecords, task, taskboard;

			problemRecords = new GlideRecord('problem');
			problemRecords.addActiveFilter();
			// TODO: Filter for assignment group
			problemRecords.query();

			while (problemRecords.next()) {
				task = {
					link: problemRecords.getLink(),
					number: problemRecords.number.toString(),
					opened_at: problemRecords.opened_at.toString(),
					assigned_to: problemRecords.assigned_to.getDisplayValue(),
					assigned_to_link: problemRecords.assigned_to.getRefRecord().getLink(),
					caller_id: problemRecords.caller_id.getDisplayValue(),
					caller_id_link: problemRecords.caller_id.getLink(),
					short_description: problemRecords.short_description.toString(),
					priority: problemRecords.priority.getDisplayValue(),
					state: problemRecords.state.getDisplayValue(),
					taskboard_priority: computeTaskPriority(problemRecords)
				};

				taskboard = stateTaskboardMap[task.state];
				if (taskboard === undefined) {
					taskboard = 'todo';
					task.short_description = '(unknown state ' + task.state + ') ' + task.short_description;
				}
				if (taskboard !== null) {
					boards[taskboard].push(task);
				}
			}
		}

		return {
			loadTasks: loadTasks
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
			next: function (max) {
				ix += 1;
				if (max !== undefined) {
					return ix < array.length && ix < max;
				} else {
					return ix < array.length;
				}
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
		var assignedToScore, priorityScore, openedAtParsed, openedAtDate, ageScore;

		//noinspection JSLint
		assignedToScore = taskRecord.assigned_to.toString() == user.getID().toString() ? 10000 : 0;

		priorityScore = (4 - taskRecord.priority.toString()) * 1000;

		// Date.parse seems to produce NaN no matter what.
		// Note that opened_at is actually in the caller's time zone. This can lead to scores that are off by up to one day.
		openedAtParsed = taskRecord.opened_at.toString().match(/^(\d{4})-(\d{2})-(\d{2})\D(\d{2}):(\d{2}):(\d{2})/m);
		if (openedAtParsed[6] !== undefined) {
			openedAtDate = new Date(openedAtParsed[1], openedAtParsed[2] - 1, openedAtParsed[3], openedAtParsed[4], openedAtParsed[5], openedAtParsed[6]);
		} else {
			openedAtDate = new Date();
		}
		ageScore = (new Date().getTime() - openedAtDate.getTime()) / 86400000;

		return assignedToScore + priorityScore + ageScore;
	}

	function taskPriorityComparator(a, b) {
		return b.taskboard_priority - a.taskboard_priority;
	}

	incidents.loadTasks();
	problems.loadTasks();

	boards.todo.sort(taskPriorityComparator);
	boards.wip.sort(taskPriorityComparator);
	boards.resolved.sort(taskPriorityComparator);

	todoBoard = makeIterableArray(boards.todo);
	wipBoard = makeIterableArray(boards.wip);
	resolvedBoard = makeIterableArray(boards.resolved);

	ok = 1;
}());
