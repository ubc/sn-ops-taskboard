/*global gs, GlideRecord, taskboard */

(function () {
	"use strict";
	var user, groups, incidents, problems;

	user = gs.getUser();
	groups = user.getMyGroups();

	incidents = (function () {
		function loadTasks() {
			var incidentRecords, task, boardKey;

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

				task.taskboard_assigned_to_me = incidentRecords.assigned_to == user.getID();
				task.taskboard_expedited = computeTaskExpedited(task);
				task.taskboard_priority = computeTaskPriority(task);

				boardKey = getBoardForTask(task);

				if (boardKey) {
					taskboard[boardKey].push(task);
				}
			}
		}

		return {
			loadTasks: loadTasks
		};
	}());

	problems = (function () {
		function loadTasks() {
			var problemRecords, task, boardKey;

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
					state: problemRecords.state.getDisplayValue()
				};

				task.taskboard_assigned_to_me = problemRecords.assigned_to == user.getID();
				task.taskboard_expedited = computeTaskExpedited(task);
				task.taskboard_priority = computeTaskPriority(task);

				boardKey = getBoardForTask(task);

				if (boardKey !== null) {
					taskboard[boardKey].push(task);
				}
			}
		}

		return {
			loadTasks: loadTasks
		};
	}());

	function getBoardForTask(task) {
		if (task.state == "New") {
			return null;
		}
		if (task.state == "Closed") {
			return null;
		}
		if (task.state == "Closed/Resolved") {
			return null;
		}
		if (!task.assigned_to) {
			return 'todo';
		}
		if (task.state == "Resolved") {
			return 'resolved';
		}
		if (task.state == "Pending Information") {
			return 'resolved';
		}
		if (task.state == "Pending Vendor") {
			return 'resolved';
		}
		return 'wip';
	}

	function computeTaskPriority(task) {
		var assignedToScore, priorityScore, expeditedScore, openedAtParsed, openedAtDate, ageScore;

		assignedToScore = 0; // task.taskboard_assigned_to_me ? 1000000 : 0;
		expeditedScore = task.taskboard_expedited ? 1000000 : 0;

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

		return Math.round(assignedToScore + expeditedScore + priorityScore + ageScore);
	}

	function computeTaskExpedited(task) {
		return !!task.short_description.match(/<\*>/);
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

	taskboard.boards.reset();
	while (taskboard.boards.next()) {
		taskboard[taskboard.boards.value().key].sort(taskPriorityComparator);
	}
}());
