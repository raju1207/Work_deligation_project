import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
}

interface EA {
  id: number;
  name: string;
  email: string;
}

interface Employee {
  id: number;
  employeeCode?: string;
  fullName: string;
  officialEmail?: string;
  departmentId?: number;
  departmentName?: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  responsibility: string;

  departmentId: number;
  departmentName: string;

  createdById: number;
  createdByName: string;

  assignedEaId?: number;
  assignedEaName?: string;

  assignedEmployeeId?: number;
  assignedEmployeeName?: string;

  startDate?: string;
  originalTargetDate?: string;
  currentTargetDate?: string;

  createdAt: string;
}

export default function Tasks() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eas, setEas] = useState<EA[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // CREATE TASK
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedEaId, setAssignedEaId] = useState("");

  // ASSIGN EMPLOYEE
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [
        userResponse,
        taskResponse,
        departmentResponse,
        eaResponse,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tasks"),
        api.get("/departments"),
        api.get("/users/eas"),
      ]);

      setCurrentUser(userResponse.data.user);
      setTasks(taskResponse.data.data || []);
      setDepartments(departmentResponse.data.data || []);
      setEas(eaResponse.data.data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate("/");
      }
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.post("/tasks", {
        title,
        description,
        priority,
        departmentId: Number(departmentId),
        assignedEaId: Number(assignedEaId),
      });

      setMessage("Delegation created successfully.");

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepartmentId("");
      setAssignedEaId("");

      setShowCreate(false);

      await loadData();
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Unable to create delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  async function openAssignTask(task: Task) {
    setSelectedTask(task);

    setEmployeeId("");
    setStartDate("");
    setTargetDate("");
    setMessage("");
    setError("");

    try {
      const response = await api.get(
        `/employees?departmentId=${task.departmentId}`
      );

      setEmployees(response.data.data || []);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Unable to load employees"
      );
    }
  }

  async function assignEmployee(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTask) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `/tasks/${selectedTask.id}/assign`,
        {
          assignedEmployeeId: Number(employeeId),
          startDate,
          targetDate,
        }
      );

      setMessage(
        `Delegation #${selectedTask.id} assigned successfully.`
      );

      setSelectedTask(null);

      setEmployeeId("");
      setStartDate("");
      setTargetDate("");

      await loadData();
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Unable to assign delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  function canAssign(task: Task) {
    if (!currentUser) return false;

    if (task.responsibility !== "EA") {
      return false;
    }

    if (
      currentUser.role === "ADMIN" ||
      currentUser.role === "MD"
    ) {
      return true;
    }

    if (
      currentUser.role === "EA" &&
      task.assignedEaId === currentUser.id
    ) {
      return true;
    }

    return false;
  }

  return (
    <div className="tasks-page">

      <div className="tasks-topbar">
        <div>
          <h1>Task Management</h1>
          <p>
            Delegation & responsibility tracking
          </p>
        </div>

        <div className="tasks-actions">
          <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="primary-button"
            onClick={() => {
              setShowCreate(!showCreate);
              setMessage("");
              setError("");
            }}
          >
            + New Delegation
          </button>
        </div>
      </div>

      <div className="task-stats">

        <Stat
          label="Total"
          value={tasks.length}
        />

        <Stat
          label="New"
          value={
            tasks.filter(
              (task) => task.status === "NEW"
            ).length
          }
        />

        <Stat
          label="In Progress"
          value={
            tasks.filter(
              (task) =>
                task.status === "IN_PROGRESS"
            ).length
          }
        />

        <Stat
          label="Delayed"
          value={
            tasks.filter(
              (task) =>
                task.status === "DELAYED"
            ).length
          }
        />

      </div>

      {message && (
        <div className="task-message">
          {message}
        </div>
      )}

      {error && (
        <div className="task-error">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          className="create-task-card"
          onSubmit={createTask}
        >
          <h2>Create New Delegation</h2>

          <div className="task-form-grid">

            <div className="form-group">
              <label>Task Title *</label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Department *</label>

              <select
                value={departmentId}
                onChange={(e) =>
                  setDepartmentId(e.target.value)
                }
                required
              >
                <option value="">
                  Select Department
                </option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority *</label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
              >
                <option value="HIGH">
                  High
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="LOW">
                  Low
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Assign EA *</label>

              <select
                value={assignedEaId}
                onChange={(e) =>
                  setAssignedEaId(e.target.value)
                }
                required
              >
                <option value="">
                  Select EA
                </option>

                {eas.map((ea) => (
                  <option
                    key={ea.id}
                    value={ea.id}
                  >
                    {ea.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description</label>

              <textarea
                rows={4}
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />
            </div>

          </div>

          <div className="task-form-actions">

            <button
              type="button"
              className="back-button"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Delegation"}
            </button>

          </div>
        </form>
      )}

      <div className="task-table-card">

        <table className="task-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Task</th>
              <th>Department</th>
              <th>Priority</th>
              <th>EA</th>
              <th>Employee</th>
              <th>Responsibility</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="empty-table"
                >
                  No delegations found.
                </td>
              </tr>
            ) : (

              tasks.map((task) => (

                <tr key={task.id}>

                  <td>
                    #{task.id}
                  </td>

                  <td>
                    <strong>
                      {task.title}
                    </strong>
                  </td>

                  <td>
                    {task.departmentName}
                  </td>

                  <td>
                    {task.priority}
                  </td>

                  <td>
                    {task.assignedEaName || "-"}
                  </td>

                  <td>
                    {task.assignedEmployeeName || "-"}
                  </td>

                  <td>
                    {task.responsibility}
                  </td>

                  <td>

                    <span
                      className={`status-pill status-${task.status.toLowerCase()}`}
                    >
                      {task.status.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                  </td>

                  <td>
                    {task.createdByName}
                  </td>

                  <td>

                    {canAssign(task) ? (
                      <button
                        className="assign-button"
                        onClick={() =>
                          openAssignTask(task)
                        }
                      >
                        Assign
                      </button>
                    ) : (
                      "-"
                    )}

                  </td>

                </tr>

              ))
            )}

          </tbody>

        </table>

      </div>

      {selectedTask && (

        <div className="modal-overlay">

          <div className="assign-modal">

            <div className="modal-header">

              <div>
                <h2>
                  Assign Employee
                </h2>

                <p>
                  #{selectedTask.id} —{" "}
                  {selectedTask.title}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedTask(null)
                }
              >
                ×
              </button>

            </div>

            <div className="assignment-info">

              <div>
                <span>Department</span>
                <strong>
                  {selectedTask.departmentName}
                </strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>
                  {selectedTask.priority}
                </strong>
              </div>

              <div>
                <span>Current Responsibility</span>
                <strong>
                  {selectedTask.responsibility}
                </strong>
              </div>

            </div>

            <form onSubmit={assignEmployee}>

              <div className="form-group">

                <label>
                  Employee *
                </label>

                <select
                  value={employeeId}
                  onChange={(e) =>
                    setEmployeeId(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select Employee
                  </option>

                  {employees.map(
                    (employee) => (

                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.fullName}
                        {employee.employeeCode
                          ? ` (${employee.employeeCode})`
                          : ""}
                      </option>

                    )
                  )}

                </select>

                {employees.length === 0 && (
                  <small className="field-warning">
                    No active employee found
                    for this department.
                  </small>
                )}

              </div>

              <div className="form-group">

                <label>
                  Start Date & Time *
                </label>

                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Target Date & Time *
                </label>

                <input
                  type="datetime-local"
                  value={targetDate}
                  onChange={(e) =>
                    setTargetDate(
                      e.target.value
                    )
                  }
                  required
                />

              </div>

              <div className="assignment-result">

                <span>
                  After assignment:
                </span>

                <strong>
                  Responsibility →
                  EMPLOYEE
                </strong>

                <strong>
                  Status →
                  IN PROGRESS
                </strong>

              </div>

              <div className="task-form-actions">

                <button
                  type="button"
                  className="back-button"
                  onClick={() =>
                    setSelectedTask(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    loading ||
                    employees.length === 0
                  }
                >
                  {loading
                    ? "Assigning..."
                    : "Assign & Start"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="task-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}