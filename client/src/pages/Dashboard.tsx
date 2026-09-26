import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "./Dashboard.css";

interface TaskCounts {
  total: number;
  new: number;
  inProgress: number;
  onHold: number;
  delayed: number;
  completed: number;
}

interface RecentTask {
  id: number;

  title: string;

  priority: string;

  status: string;

  responsibility: string;

  departmentName: string;

  createdByName: string;

  assignedEaName?: string;

  assignedEmployeeName?: string;

  startDate?: string;

  originalTargetDate?: string;

  currentTargetDate?: string;

  createdAt: string;

  updatedAt: string;
}

const managementRoles = [
  "ADMIN",
  "MD",
  "HR",
  "EA",
];

export default function Dashboard() {
  const navigate =
    useNavigate();

  const [
    taskCounts,
    setTaskCounts,
  ] =
    useState<TaskCounts>({
      total: 0,
      new: 0,
      inProgress: 0,
      onHold: 0,
      delayed: 0,
      completed: 0,
    });

  const [
    recentTasks,
    setRecentTasks,
  ] =
    useState<RecentTask[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const userResponse =
        await api.get(
          "/auth/me"
        );

      const user =
        userResponse.data.user;

      /*
        EMPLOYEE DOES NOT USE
        MANAGEMENT DASHBOARD
      */

      if (
        !managementRoles.includes(
          user.role
        )
      ) {
        navigate(
          "/tasks",
          {
            replace: true,
          }
        );

        return;
      }

      const dashboardResponse =
        await api.get(
          "/dashboard"
        );

      setTaskCounts(
        dashboardResponse.data
          .taskCounts
      );

      setRecentTasks(
        dashboardResponse.data
          .recentTasks || []
      );

    } catch (error: any) {

      if (
        error.response?.status ===
        401
      ) {
        navigate("/");
        return;
      }

      setError(
        error.response?.data
          ?.message ||
          "Unable to load delegation dashboard"
      );

    } finally {

      setLoading(false);

    }
  }

  function formatDate(
    value?: string
  ) {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleString();
  }

  function prettyStatus(
    value: string
  ) {
    return value.replaceAll(
      "_",
      " "
    );
  }

  if (loading) {
    return (
      <div className="main-loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="main-dashboard">

      <main className="main-content">

        {error && (

          <div className="dashboard-error">
            {error}
          </div>

        )}

        {/* =====================================
            DELEGATION OVERVIEW
        ===================================== */}

        <section>

          <div className="dashboard-section-title">

            <h2>
              Delegation Overview
            </h2>

          </div>

          <div className="metric-grid task-metrics">

            <MetricCard
              label="Total"
              value={
                taskCounts.total
              }
            />

            <MetricCard
              label="New"
              value={
                taskCounts.new
              }
            />

            <MetricCard
              label="In Progress"
              value={
                taskCounts.inProgress
              }
            />

            <MetricCard
              label="Delayed"
              value={
                taskCounts.delayed
              }
            />

            <MetricCard
              label="Completed"
              value={
                taskCounts.completed
              }
            />

          </div>

        </section>

        {/* =====================================
            DELEGATION HISTORY
        ===================================== */}

        <section className="dashboard-panel">

          <div className="dashboard-section-title">

            <h2>
              Delegation History
            </h2>

            <button
              className="text-action-button"
              onClick={() =>
                navigate(
                  "/tasks"
                )
              }
            >
              View All
            </button>

          </div>

          <div className="dashboard-table-wrap">

            <table className="dashboard-table">

              <thead>

                <tr>

                  <th>
                    ID
                  </th>

                  <th>
                    Task
                  </th>

                  <th>
                    Department
                  </th>

                  <th>
                    Created By
                  </th>

                  <th>
                    EA
                  </th>

                  <th>
                    Employee
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Target
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {recentTasks.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={9}
                      className="dashboard-empty"
                    >
                      No delegations
                      found.
                    </td>

                  </tr>

                ) : (

                  recentTasks.map(
                    (task) => (

                      <tr
                        key={
                          task.id
                        }
                      >

                        <td>
                          #{task.id}
                        </td>

                        <td>

                          <strong>
                            {
                              task.title
                            }
                          </strong>

                        </td>

                        <td>
                          {
                            task.departmentName
                          }
                        </td>

                        <td>
                          {
                            task.createdByName
                          }
                        </td>

                        <td>
                          {
                            task.assignedEaName ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            task.assignedEmployeeName ||
                            "-"
                          }
                        </td>

                        <td>

                          <span
                            className={`dashboard-status status-${task.status.toLowerCase()}`}
                          >
                            {prettyStatus(
                              task.status
                            )}
                          </span>

                        </td>

                        <td>
                          {formatDate(
                            task.currentTargetDate
                          )}
                        </td>

                        <td>

                          <button
                            className="view-history-button"

                            onClick={() =>
                              navigate(
                                `/tasks/${task.id}`
                              )
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="metric-card">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}