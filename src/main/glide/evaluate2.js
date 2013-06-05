/*global GlideRecord, taskboard */

(function () {
	"use strict";

	function loadTasks(tableName, taskConverter) {
		var records, task, boardKey;

		if (taskboard.currentGroups.isEmpty()) {
			// No groups, no access
			return;
		}

		records = new GlideRecord(tableName);
		records.addActiveFilter();
		records.addQuery('assignment_group', taskboard.currentGroups);
		records.query();

		while (records.next()) {
			task = taskConverter(records);

			task.taskboard_assigned_to_me = records.assigned_to == taskboard.currentUser.getID();
			task.taskboard_expedited = computeTaskExpedited(task);
			task.taskboard_priority = computeTaskPriority(task);

			boardKey = mapTaskToBoard(task);

			if (boardKey !== null) {
				taskboard[boardKey].push(task);
			}
		}
	}

	function defaultTaskConverter(record) {
		return {
			link: record.getLink(),
			number: record.number.toString(),
			opened_at: record.opened_at.toString(),
			assigned_to: record.assigned_to.getDisplayValue(),
			assigned_to_link: record.assigned_to.getRefRecord().getLink(),
			caller_id: record.caller_id.getDisplayValue(),
			caller_id_link: record.caller_id.getLink(),
			short_description: record.short_description.toString(),
			priority: record.priority.getDisplayValue(),
			priority_number: record.priority.toString(),
			state: record.state.getDisplayValue()
		};
	}

	function mapTaskToBoard(task) {
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

	//noinspection JSUnusedLocalSymbols
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

	loadTasks("incident", defaultTaskConverter);
	loadTasks("problem", defaultTaskConverter);

	taskboard.boards.reset();
	while (taskboard.boards.next()) {
		taskboard[taskboard.boards.value().key].sort(taskPriorityComparator);
	}
}());
