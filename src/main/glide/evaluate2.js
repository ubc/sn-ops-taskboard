/*global gs, GlideRecord */
var ok, todoBoard, wipBoard, resolvedBoard;

(function () {
	"use strict";
	var user, groups, boards, incidents, problems;

	user = gs.getUser();
	groups = user.getMyGroups();

	boards = {
		todo: [],
		wip: [],
		resolved: []
	};

	incidents = (function () {

		function getBoardForTask(task) {
			if (task.state == "New") {
				return null;
			}
			if (task.state == "Closed") {
				return null;
			}
			if (!task.assigned_to) {
				return 'todo';
			}
			if (task.state == "Resolved") {
				return 'resolved';
			}
			return 'wip';
		}

		function loadTasks() {
			var incidentRecords, task, taskboard;

			if (groups.isEmpty()) {
				// No groups, no access
				return;
			}

			incidentRecords = new GlideRecord('incident');
			incidentRecords.addActiveFilter();
			incidentRecords.addQuery('assignment_group', groups);
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
					priority_number: incidentRecords.priority.toString(),
					state: incidentRecords.state.getDisplayValue()
				};

				task.taskboard_my_task = incidentRecords.assigned_to == user.getID();
				task.taskboard_priority = computeTaskPriority(task);

				taskboard = getBoardForTask(task);

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

		function getBoardForTask(task) {
			if (task.state == "New") {
				return null;
			}
			if (task.state == "Closed") {
				return null;
			}
			if (!task.assigned_to) {
				return 'todo';
			}
			if (task.state == "Resolved") {
				return 'resolved';
			}
			return 'wip';
		}

		function loadTasks() {
			var problemRecords, task, taskboard;

			if (groups.isEmpty()) {
				// No groups, no access
				return;
			}

			problemRecords = new GlideRecord('problem');
			problemRecords.addActiveFilter();
			problemRecords.addQuery('assignment_group', groups);
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
					priority_number: problemRecords.priority.toString(),
					state: problemRecords.state.getDisplayValue(),
				};

				task.taskboard_my_task = problemRecords.assigned_to == user.getID();
				task.taskboard_priority = computeTaskPriority(task);

				taskboard = getBoardForTask(task);

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

	function computeTaskPriority(task) {
		var assignedToScore, priorityScore, openedAtParsed, openedAtDate, ageScore;

		assignedToScore = task.taskboard_my_task ? 1000000 : 0;

		priorityScore = (4 - task.priority_number) * 10000;

		// Date.parse seems to produce NaN no matter what.
		// Note that opened_at is actually in the caller's time zone. This can lead to scores that are off by up to one day.
		openedAtParsed = task.opened_at.match(/^(\d{4})-(\d{2})-(\d{2})\D(\d{2}):(\d{2}):(\d{2})/m);
		if (openedAtParsed[6] !== undefined) {
			openedAtDate = new Date(openedAtParsed[1], openedAtParsed[2] - 1, openedAtParsed[3], openedAtParsed[4], openedAtParsed[5], openedAtParsed[6]);
		} else {
			openedAtDate = new Date();
		}
		ageScore = (new Date().getTime() - openedAtDate.getTime()) / 86400 / 1000 * 10; // (Ten points per day)

		return Math.round(assignedToScore + priorityScore + ageScore);
	}

	function taskPriorityComparator(a, b) {
		return b.taskboard_priority - a.taskboard_priority;
	}

	function getMethodListing(javaObject) {
		var output, javaClass, methods, methodsIx, method, params, paramsIx;

		javaClass = javaObject.getClass();
		output = javaClass.getName() + "\n";

		methods = javaClass.getMethods();
		for (methodsIx = 0; methodsIx < methods.length; methodsIx++) {
			method = methods[methodsIx];
			output += "  " + method.getName();

			output += "(";
			params = method.getParameterTypes();
			for (paramsIx = 0; paramsIx < params.length; paramsIx++) {
				if (paramsIx > 0) {
					output += ", ";
				}
				output += params[paramsIx].getName();
			}
			output += ")\n";
		}
		return output;
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
