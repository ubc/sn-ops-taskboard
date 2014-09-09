/*global GlideRecord, taskboard */

(function () {
	"use strict";
	var tasks;

	function loadTasks(tableName, tasks, taskConverter) {
		var records, task;

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

			task.taskboard_type = tableName;
			task.taskboard_source_table = tableName;
			task.taskboard_assigned_to_me = records.assigned_to == taskboard.currentUser.getID();

			tasks.push(task);
		}
	}

	function baseTaskConverter(record) {
		return {
			link: record.getLink(true),
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

		function pushInExpeditedFlag(task) {
			var magic = "<*>";

			if (task.short_description.indexOf(magic) > -1) {
				task.taskboard_priority += 1000000;
				task.taskboard_expedited = true;
				task.short_description = task.short_description.replace(magic, "");
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

		function pushInComputedTaskAge(task) {
			var openedAtParsed, openedAtDate;

			// Date.parse seems to produce NaN no matter what.
			// Note that opened_at is actually in the caller's time zone. This can lead to scores that are off by up to one day.
			openedAtParsed = task.opened_at.match(/^(\d{4})-(\d{2})-(\d{2})\D(\d{2}):(\d{2}):(\d{2})/m);

			if (openedAtParsed[6] !== undefined) {
				openedAtDate = new Date(openedAtParsed[1], openedAtParsed[2] - 1, openedAtParsed[3], openedAtParsed[4], openedAtParsed[5], openedAtParsed[6]);
			} else {
				openedAtDate = new Date();
			}

			task.taskboard_age = (new Date().getTime() - openedAtDate.getTime()) / 86400000; // (days from milliseconds)
		}

		function pushInComputedTaskPriority(task) {
			var priorityScore, ageScore;

			priorityScore = (4 - task.priority_number) * 7;
			ageScore = task.taskboard_age;
			task.taskboard_priority = priorityScore + ageScore;
		}

		for (ix = 0; ix < tasks.length; ix++) {
			task = tasks[ix];
			pushInCustomTaskTypeFlag(task);
			pushInComputedTaskAge(task);
			pushInComputedTaskPriority(task);
			pushInExpeditedFlag(task);
		}
	}

	function loadColumns(tasks) {
		var ix, task, columnKey, laneKey;

		function mapTaskToColumn(task) {
			if (task.state == "New")                                    return null;
			if (task.state == "Closed")                                 return null;
			if (task.state == "Closed/Resolved")                        return null;
			if (!task.assigned_to)                                      return 'todo';
			if (task.state == "Resolved")                               return 'resolved';
			if (task.state == "Resolved - Pending User Confirmation")   return 'resolved';
			if (task.state == "Pending Change")                         return 'pending';
			if (task.state == "Pending Information")                    return 'pending';
			if (task.state == "Pending Parts")                          return 'pending';
			if (task.state == "Pending Recovery")                       return 'pending';
			if (task.state == "Pending Schedule")                       return 'pending';
			if (task.state == "Pending Vendor")                         return 'pending';
			return 'wip';
		}

		function mapTaskToLane(task) {
			if (task.taskboard_type == "task") {
				return "internal";
			}
			return "external";
		}

		for (ix = 0; ix < tasks.length; ix++) {
			task = tasks[ix];
			columnKey = mapTaskToColumn(task);
			laneKey = mapTaskToLane(task);
			taskboard[columnKey].push(task);
			taskboard[columnKey + ":" + laneKey].push(task);
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

	function prioritySort(a, b) {
		return b.taskboard_priority - a.taskboard_priority;
	}

	tasks = [];
	loadTasks("incident", tasks, incidentTaskConverter);
	loadTasks("problem", tasks, baseTaskConverter);

	postProcessTasks(tasks);
	loadColumns(tasks);

	taskboard.columns.reset();
	while (taskboard.columns.next()) {
		taskboard.lanes.reset();
		taskboard[taskboard.columns.value().key].sort(prioritySort);
		while (taskboard.lanes.next()) {
			taskboard[taskboard.columns.value().key + ":" + taskboard.lanes.value().key].sort(prioritySort);
		}
	}

}());
