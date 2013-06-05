/*global GlideRecord, taskboard */

(function () {
	"use strict";
	var tasks;

	function loadTasks(tableName, taskConverter) {
		var tasks, records, task;

		tasks = [];

		if (taskboard.currentGroups.isEmpty()) {
			// No groups, no access
			return tasks;
		}

		records = new GlideRecord(tableName);
		records.addActiveFilter();
		records.addQuery('assignment_group', taskboard.currentGroups);
		records.query();

		function computeTaskPriority(task) {
			var assignedToScore, priorityScore, openedAtParsed, openedAtDate, ageScore;

			assignedToScore = 0; // task.taskboard_assigned_to_me ? 1000000 : 0;

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

		while (records.next()) {
			task = taskConverter(records);

			task.taskboard_type = tableName;
			task.taskboard_source_table = tableName;
			task.taskboard_assigned_to_me = records.assigned_to == taskboard.currentUser.getID();
			task.taskboard_priority = computeTaskPriority(task);

			tasks.push(task);
		}

		return tasks;
	}

	function pushInExpeditedFlag(task) {
		var magic = "<*>";

		if (task.short_description.indexOf(magic) > -1) {
			task.taskboard_priority += 1000000;
			task.taskboard_expedited = true;
			task.short_description = task.short_description.replace(magic,  "");
		}
	}

	function pushInCustomTaskTypeFlag(task) {
		if (task.taskboard_source_table == "incident") {
			if (task.incident_type == "Request") {
				task.taskboard_type = "request";
				if (task.short_description.match(/^TASK - /)) {
					task.taskboard_type = "task";
					task.short_description = task.short_description.substr(7);
				}
			}
			if (task.incident_type == "Incident") {
				if (task.short_description.match(/^EVENT - /)) {
					task.taskboard_type = "event";
					task.short_description = task.short_description.substr(8);
				}
			}
		}
	}

	function baseTaskConverter(record) {
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

	function incidentTaskConverter(record) {
		var task = baseTaskConverter(record);
		task.incident_type = record.u_type.toString();
		return task;
	}

	function postProcessTasks(tasks) {
		var ix, task;

		for (ix = 0; ix < tasks.length; ix++) {
			task = tasks[ix];
			pushInExpeditedFlag(task);
			pushInCustomTaskTypeFlag(task);
		}
	}

	function loadBoards(tasks) {
		var ix, task, boardKey;

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

		for (ix = 0; ix < tasks.length; ix++) {
			task = tasks[ix];
			boardKey = mapTaskToBoard(task);
			taskboard[boardKey].push(task);
		}
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

	tasks = [];
	tasks = tasks.concat(loadTasks("incident", incidentTaskConverter));
	tasks = tasks.concat(loadTasks("problem", baseTaskConverter));

	postProcessTasks(tasks);
	loadBoards(tasks);

	taskboard.boards.reset();
	while (taskboard.boards.next()) {
		taskboard[taskboard.boards.value().key].sort(function (a, b) {
			return b.taskboard_priority - a.taskboard_priority;
		});
	}

}());
