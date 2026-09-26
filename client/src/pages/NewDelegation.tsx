import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "./NewDelegation.css";

interface Department {
  id: number;
  name: string;
}

interface EA {
  id: number;
  name: string;
  email: string;
}

export default function NewDelegation() {
  const navigate = useNavigate();

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

  const [eas, setEas] =
    useState<EA[]>([]);

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

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadFormData();
  }, []);

  async function loadFormData() {
    try {
      const [
        departmentResponse,
        eaResponse,
      ] = await Promise.all([
        api.get("/departments"),
        api.get("/users/eas"),
      ]);

      setDepartments(
        departmentResponse.data.data || []
      );

      setEas(
        eaResponse.data.data || []
      );
    } catch (error: any) {
      if (
        error.response?.status === 401
      ) {
        navigate("/");
        return;
      }

      setError(
        "Unable to load form data"
      );
    }
  }

  async function createTask(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response =
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
        `Delegation #${response.data.taskId} created successfully.`
      );

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepartmentId("");
      setAssignedEaId("");

    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Unable to create delegation"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="new-delegation-page">

      <main className="new-delegation-content">

        <div className="new-delegation-title">

          <h1>
            Create New Delegation
          </h1>

        </div>

        {message && (
          <div className="new-success">
            {message}
          </div>
        )}

        {error && (
          <div className="new-error">
            {error}
          </div>
        )}

        <form
          className="new-delegation-card"
          onSubmit={createTask}
        >

          <div className="new-form-grid">

            <div className="new-field">

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
                placeholder="Enter task title"
                required
              />

            </div>

            <div className="new-field">

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

            <div className="new-field">

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
                required
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

            <div className="new-field">

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

            <div className="new-field new-full">

              <label>
                Description *
              </label>

              <textarea
                rows={6}
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Enter task description"
                required
              />

            </div>

          </div>

          <div className="new-form-actions">

            <button
              type="button"
              className="new-cancel"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="new-submit"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Delegation"}
            </button>

          </div>

        </form>

      </main>

    </div>
  );
} 