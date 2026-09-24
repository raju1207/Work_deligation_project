import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface Department {
  id: number;
  name: string;
}

interface EA {
  id: number;
  name: string;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  responsibility: string;
  departmentName: string;
  createdByName: string;
  assignedEaName?: string;
  assignedEmployeeName?: string;
  createdAt: string;
}

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eas, setEas] = useState<EA[]>([]);

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedEaId, setAssignedEaId] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [
        taskResponse,
        departmentResponse,
        eaResponse,
      ] = await Promise.all([
        api.get("/tasks"),
        api.get("/departments"),
        api.get("/users/eas"),
      ]);

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

    try {
      await api.post("/tasks", {
        title,
        description,
        priority,
        departmentId: Number(departmentId),
        assignedEaId: Number(assignedEaId),
      });

      setMessage("Delegation created successfully");

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepartmentId("");
      setAssignedEaId("");

      setShowCreate(false);

      await loadData();
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Unable to create delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tasks-page">
      <div className="tasks-topbar">
        <div>
          <h1>Task Management</h1>
          <p>Delegation & responsibility tracking</p>
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
            onClick={() => setShowCreate(!showCreate)}
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
          value={tasks.filter((t) => t.status === "NEW").length}
        />

        <Stat
          label="In Progress"
          value={
            tasks.filter((t) => t.status === "IN_PROGRESS").length
          }
        />

        <Stat
          label="Delayed"
          value={
            tasks.filter((t) => t.status === "DELAYED").length
          }
        />
      </div>

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
                onChange={(e) => setTitle(e.target.value)}
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
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
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
                    {ea.name} ({ea.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description</label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={4}
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

      {message && (
        <div className="task-message">
          {message}
        </div>
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
              <th>Responsibility</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table">
                  No delegations found.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td>#{task.id}</td>

                  <td>
                    <strong>{task.title}</strong>
                  </td>

                  <td>{task.departmentName}</td>

                  <td>{task.priority}</td>

                  <td>
                    {task.assignedEaName || "-"}
                  </td>

                  <td>
                    {task.responsibility}
                  </td>

                  <td>
                    <span
                      className={`status-pill status-${task.status.toLowerCase()}`}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </td>

                  <td>{task.createdByName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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