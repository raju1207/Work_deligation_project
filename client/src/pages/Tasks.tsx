import {
  useEffect,
  useState,
} from "react";

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
  assignedEmployeeUserId?: number;

  startDate?: string;
  originalTargetDate?: string;
  currentTargetDate?: string;

  delayCount: number;
  targetDateUpdateCount: number;

  completedAt?: string;
  createdAt: string;
}

export default function Tasks() {
  const navigate = useNavigate();

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null
    );

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [
    departments,
    setDepartments,
  ] =
    useState<Department[]>([]);

  const [eas, setEas] =
    useState<EA[]>([]);

  const [
    employees,
    setEmployees,
  ] =
    useState<Employee[]>([]);

  /*
    CREATE TASK
  */

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState("MEDIUM");

  const [
    departmentId,
    setDepartmentId,
  ] = useState("");

  const [
    assignedEaId,
    setAssignedEaId,
  ] = useState("");

  /*
    EA ASSIGNMENT
  */

  const [
    selectedTask,
    setSelectedTask,
  ] =
    useState<Task | null>(null);

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    targetDate,
    setTargetDate,
  ] = useState("");

  /*
    EMPLOYEE UPDATE
  */

  const [
    updateTask,
    setUpdateTask,
  ] =
    useState<Task | null>(null);

  const [
    newStatus,
    setNewStatus,
  ] =
    useState("IN_PROGRESS");

  const [
    statusNote,
    setStatusNote,
  ] = useState("");

  const [
    delayReason,
    setDelayReason,
  ] = useState("");

  const [
    newTargetDate,
    setNewTargetDate,
  ] = useState("");

  /*
    COMMON
  */

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     LOAD PAGE DATA
  ===================================================== */

  async function loadData() {
    setError("");

    try {
      const userResponse =
        await api.get("/auth/me");

      setCurrentUser(
        userResponse.data.user
      );
    } catch (error: any) {
      if (
        error.response?.status ===
        401
      ) {
        navigate("/");
      }

      return;
    }

    try {
      const taskResponse =
        await api.get("/tasks");

      setTasks(
        taskResponse.data.data || []
      );
    } catch (error) {
      console.error(
        "TASK LOAD ERROR:",
        error
      );

      setTasks([]);
    }

    try {
      const departmentResponse =
        await api.get(
          "/departments"
        );

      setDepartments(
        departmentResponse.data
          .data || []
      );
    } catch (error) {
      console.error(
        "DEPARTMENT LOAD ERROR:",
        error
      );

      setDepartments([]);
    }

    try {
      const eaResponse =
        await api.get(
          "/users/eas"
        );

      setEas(
        eaResponse.data.data ||
          []
      );
    } catch (error) {
      console.error(
        "EA LOAD ERROR:",
        error
      );

      setEas([]);
    }
  }

  /* =====================================================
     CREATE DELEGATION
  ===================================================== */

  async function createTask(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.post(
        "/tasks",
        {
          title,
          description,
          priority,
          departmentId:
            Number(
              departmentId
            ),
          assignedEaId:
            Number(
              assignedEaId
            ),
        }
      );

      setMessage(
        "Delegation created successfully."
      );

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepartmentId("");
      setAssignedEaId("");

      setShowCreate(false);

      await loadData();
    } catch (error: any) {
      setError(
        error.response?.data
          ?.message ||
          "Unable to create delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     OPEN EA ASSIGNMENT
  ===================================================== */

  async function openAssignTask(
    task: Task
  ) {
    setSelectedTask(task);

    setEmployeeId("");
    setStartDate("");
    setTargetDate("");

    setMessage("");
    setError("");

    try {
      const response =
        await api.get(
          `/employees?departmentId=${task.departmentId}`
        );

      setEmployees(
        response.data.data || []
      );
    } catch (error: any) {
      setEmployees([]);

      setError(
        error.response?.data
          ?.message ||
          "Unable to load employees"
      );
    }
  }

  /* =====================================================
     ASSIGN EMPLOYEE
  ===================================================== */

  async function assignEmployee(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!selectedTask) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.patch(
        `/tasks/${selectedTask.id}/assign`,
        {
          assignedEmployeeId:
            Number(employeeId),
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
        error.response?.data
          ?.message ||
          "Unable to assign delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     OPEN EMPLOYEE UPDATE
  ===================================================== */

  function openUpdateTask(
    task: Task
  ) {
    setUpdateTask(task);

    setNewStatus(
      task.status === "DELAYED"
        ? "IN_PROGRESS"
        : task.status
    );

    setStatusNote("");
    setDelayReason("");
    setNewTargetDate("");

    setMessage("");
    setError("");
  }

  /* =====================================================
     EMPLOYEE STATUS UPDATE
  ===================================================== */

  async function submitTaskUpdate(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!updateTask) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.patch(
        `/tasks/${updateTask.id}/status`,
        {
          status: newStatus,

          note:
            newStatus !==
            "DELAYED"
              ? statusNote
              : undefined,

          delayReason:
            newStatus ===
            "DELAYED"
              ? delayReason
              : undefined,

          newTargetDate:
            newStatus ===
            "DELAYED"
              ? newTargetDate
              : undefined,
        }
      );

      setMessage(
        `Delegation #${updateTask.id} updated successfully.`
      );

      setUpdateTask(null);

      setNewStatus(
        "IN_PROGRESS"
      );

      setStatusNote("");
      setDelayReason("");
      setNewTargetDate("");

      await loadData();
    } catch (error: any) {
      setError(
        error.response?.data
          ?.message ||
          "Unable to update delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     PERMISSIONS
  ===================================================== */

  function canAssign(
    task: Task
  ) {
    if (!currentUser) {
      return false;
    }

    if (
      task.responsibility !==
      "EA"
    ) {
      return false;
    }

    if (
      currentUser.role ===
        "ADMIN" ||
      currentUser.role === "MD"
    ) {
      return true;
    }

    if (
      currentUser.role ===
        "EA" &&
      Number(
        task.assignedEaId
      ) ===
        Number(currentUser.id)
    ) {
      return true;
    }

    return false;
  }

  function canUpdateTask(
    task: Task
  ) {
    if (!currentUser) {
      return false;
    }

    if (
      task.responsibility !==
      "EMPLOYEE"
    ) {
      return false;
    }

    if (
      task.status ===
        "COMPLETED" ||
      task.status ===
        "CANCELLED"
    ) {
      return false;
    }

    if (
      currentUser.role ===
        "ADMIN" ||
      currentUser.role === "MD"
    ) {
      return true;
    }

    if (
      currentUser.role ===
        "EMPLOYEE" &&
      Number(
        task.assignedEmployeeUserId
      ) ===
        Number(currentUser.id)
    ) {
      return true;
    }

    return false;
  }

  /* =====================================================
     DATE FORMAT
  ===================================================== */

  function formatDate(
    value?: string
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(
      value
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleString();
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="tasks-page">

      {/* TOP BAR */}

      <div className="tasks-topbar">

        <div>
          <h1>
            Task Management
          </h1>

          <p>
            Delegation &
            responsibility tracking
          </p>
        </div>

        <div className="tasks-actions">

          <button
            className="back-button"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
          >
            Dashboard
          </button>

          <button
            className="primary-button"
            onClick={() => {
              setShowCreate(
                !showCreate
              );

              setMessage("");
              setError("");
            }}
          >
            + New Delegation
          </button>

        </div>

      </div>

      {/* STATS */}

      <div className="task-stats">

        <Stat
          label="Total"
          value={tasks.length}
        />

        <Stat
          label="New"
          value={
            tasks.filter(
              (task) =>
                task.status ===
                "NEW"
            ).length
          }
        />

        <Stat
          label="In Progress"
          value={
            tasks.filter(
              (task) =>
                task.status ===
                "IN_PROGRESS"
            ).length
          }
        />

        <Stat
          label="Delayed"
          value={
            tasks.filter(
              (task) =>
                task.status ===
                "DELAYED"
            ).length
          }
        />

      </div>

      {/* SUCCESS MESSAGE */}

      {message && (
        <div className="task-message">
          {message}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="task-error">
          {error}
        </div>
      )}

      {/* CREATE TASK */}

      {showCreate && (
        <form
          className="create-task-card"
          onSubmit={createTask}
        >

          <h2>
            Create New Delegation
          </h2>

          <div className="task-form-grid">

            <div className="form-group">

              <label>
                Task Title *
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                required
              />

            </div>

            <div className="form-group">

              <label>
                Department *
              </label>

              <select
                value={
                  departmentId
                }
                onChange={(e) =>
                  setDepartmentId(
                    e.target.value
                  )
                }
                required
              >

                <option value="">
                  Select Department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={
                        department.id
                      }
                      value={
                        department.id
                      }
                    >
                      {
                        department.name
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="form-group">

              <label>
                Priority *
              </label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value
                  )
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

              <label>
                Assign EA *
              </label>

              <select
                value={
                  assignedEaId
                }
                onChange={(e) =>
                  setAssignedEaId(
                    e.target.value
                  )
                }
                required
              >

                <option value="">
                  Select EA
                </option>

                {eas.map(
                  (ea) => (
                    <option
                      key={ea.id}
                      value={ea.id}
                    >
                      {ea.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="form-group full-width">

              <label>
                Description
              </label>

              <textarea
                rows={4}
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="task-form-actions">

            <button
              type="button"
              className="back-button"
              onClick={() =>
                setShowCreate(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
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

      {/* TASK TABLE */}

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
              <th>Target</th>
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
                  colSpan={11}
                  className="empty-table"
                >
                  No delegations
                  found.
                </td>
              </tr>

            ) : (

              tasks.map(
                (task) => (

                  <tr
                    key={task.id}
                  >

                    <td>
                      #{task.id}
                    </td>

                    <td>
                      <strong>
                        {task.title}
                      </strong>
                    </td>

                    <td>
                      {
                        task.departmentName
                      }
                    </td>

                    <td>
                      {task.priority}
                    </td>

                    <td>
                      {task.assignedEaName ||
                        "-"}
                    </td>

                    <td>
                      {task.assignedEmployeeName ||
                        "-"}
                    </td>

                    <td>
                      {formatDate(
                        task.currentTargetDate
                      )}
                    </td>

                    <td>
                      {
                        task.responsibility
                      }
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
                      {
                        task.createdByName
                      }
                    </td>

                    <td>

                      {canAssign(
                        task
                      ) ? (

                        <button
                          className="assign-button"
                          onClick={() =>
                            openAssignTask(
                              task
                            )
                          }
                        >
                          Assign
                        </button>

                      ) : canUpdateTask(
                          task
                        ) ? (

                        <button
                          className="update-task-button"
                          onClick={() =>
                            openUpdateTask(
                              task
                            )
                          }
                        >
                          Update
                        </button>

                      ) : (
                        "-"
                      )}

                    </td>

                  </tr>

                )
              )
            )}

          </tbody>

        </table>

      </div>

      {/* ===============================================
          EA ASSIGN EMPLOYEE MODAL
      =============================================== */}

      {selectedTask && (

        <div className="modal-overlay">

          <div className="assign-modal">

            <div className="modal-header">

              <div>

                <h2>
                  Assign Employee
                </h2>

                <p>
                  #{selectedTask.id}
                  {" — "}
                  {
                    selectedTask.title
                  }
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedTask(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="assignment-info">

              <div>
                <span>
                  Department
                </span>

                <strong>
                  {
                    selectedTask.departmentName
                  }
                </strong>
              </div>

              <div>
                <span>
                  Priority
                </span>

                <strong>
                  {
                    selectedTask.priority
                  }
                </strong>
              </div>

              <div>
                <span>
                  Responsibility
                </span>

                <strong>
                  {
                    selectedTask.responsibility
                  }
                </strong>
              </div>

            </div>

            <form
              onSubmit={
                assignEmployee
              }
            >

              <div className="form-group">

                <label>
                  Employee *
                </label>

                <select
                  value={
                    employeeId
                  }
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
                        key={
                          employee.id
                        }
                        value={
                          employee.id
                        }
                      >
                        {
                          employee.fullName
                        }

                        {employee.employeeCode
                          ? ` (${employee.employeeCode})`
                          : ""}
                      </option>

                    )
                  )}

                </select>

                {employees.length ===
                  0 && (
                  <small className="field-warning">
                    No active
                    employee found
                    for this
                    department.
                  </small>
                )}

              </div>

              <div className="form-group">

                <label>
                  Start Date &
                  Time *
                </label>

                <input
                  type="datetime-local"
                  value={
                    startDate
                  }
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
                  Target Date &
                  Time *
                </label>

                <input
                  type="datetime-local"
                  value={
                    targetDate
                  }
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
                    setSelectedTask(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    loading ||
                    employees.length ===
                      0
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

      {/* ===============================================
          EMPLOYEE UPDATE MODAL
      =============================================== */}

      {updateTask && (

        <div className="modal-overlay">

          <div className="assign-modal">

            <div className="modal-header">

              <div>

                <h2>
                  Update Delegation
                </h2>

                <p>
                  #{updateTask.id}
                  {" — "}
                  {
                    updateTask.title
                  }
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setUpdateTask(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="assignment-info">

              <div>

                <span>
                  Current Status
                </span>

                <strong>
                  {updateTask.status.replaceAll(
                    "_",
                    " "
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Current Target
                </span>

                <strong>
                  {formatDate(
                    updateTask.currentTargetDate
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Delay Count
                </span>

                <strong>
                  {updateTask.delayCount ||
                    0}
                </strong>

              </div>

            </div>

            <form
              onSubmit={
                submitTaskUpdate
              }
            >

              <div className="form-group">

                <label>
                  New Status *
                </label>

                <select
                  value={
                    newStatus
                  }
                  onChange={(e) =>
                    setNewStatus(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="IN_PROGRESS">
                    In Progress
                  </option>

                  <option value="ON_HOLD">
                    On Hold
                  </option>

                  <option value="DELAYED">
                    Delayed
                  </option>

                  <option value="COMPLETED">
                    Completed
                  </option>

                </select>

              </div>

              {/* DELAY */}

              {newStatus ===
                "DELAYED" && (
                <>

                  <div className="delay-warning">

                    Target date
                    revisions used:{" "}

                    <strong>
                      {updateTask.targetDateUpdateCount ||
                        0}
                      {" / 3"}
                    </strong>

                  </div>

                  <div className="form-group">

                    <label>
                      Delay Reason *
                    </label>

                    <textarea
                      rows={3}
                      value={
                        delayReason
                      }
                      onChange={(e) =>
                        setDelayReason(
                          e.target.value
                        )
                      }
                      placeholder="Enter reason for delay"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      New Target
                      Date & Time *
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        newTargetDate
                      }
                      onChange={(e) =>
                        setNewTargetDate(
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                </>
              )}

              {/* NORMAL NOTE */}

              {newStatus !==
                "DELAYED" && (
                <div className="form-group">

                  <label>
                    Remarks / Note
                  </label>

                  <textarea
                    rows={3}
                    value={
                      statusNote
                    }
                    onChange={(e) =>
                      setStatusNote(
                        e.target.value
                      )
                    }
                    placeholder="Enter remarks"
                  />

                </div>
              )}

              {/* COMPLETE WARNING */}

              {newStatus ===
                "COMPLETED" && (
                <div className="completion-warning">
                  This will mark
                  the delegation as
                  completed. After
                  completion it cannot
                  be updated.
                </div>
              )}

              <div className="task-form-actions">

                <button
                  type="button"
                  className="back-button"
                  onClick={() =>
                    setUpdateTask(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    loading ||
                    (
                      newStatus ===
                        "DELAYED" &&
                      (
                        updateTask.targetDateUpdateCount ||
                        0
                      ) >= 3
                    )
                  }
                >
                  {loading
                    ? "Updating..."
                    : "Update Delegation"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="task-stat">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}