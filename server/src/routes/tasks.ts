import { Router } from "express";

import { db } from "../lib/db.js";
import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    let sql = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.responsibility,

        t.startDate,
        t.originalTargetDate,
        t.currentTargetDate,

        t.delayCount,
        t.targetDateUpdateCount,

        t.createdAt,
        t.updatedAt,
        t.completedAt,

        d.id AS departmentId,
        d.name AS departmentName,

        creator.id AS createdById,
        creator.name AS createdByName,

        ea.id AS assignedEaId,
        ea.name AS assignedEaName,
        ea.email AS assignedEaEmail,

        emp.id AS assignedEmployeeId,
        emp.fullName AS assignedEmployeeName,
        emp.officialEmail AS assignedEmployeeEmail

      FROM Task t

      INNER JOIN Department d
        ON d.id = t.departmentId

      INNER JOIN \`User\` creator
        ON creator.id = t.createdById

      LEFT JOIN \`User\` ea
        ON ea.id = t.assignedEaId

      LEFT JOIN Employee emp
        ON emp.id = t.assignedEmployeeId
    `;

    const params: any[] = [];

    if (!["ADMIN", "MD", "EA"].includes(user.role)) {
      sql += `
        WHERE
          t.createdById = ?
          OR emp.userId = ?
      `;

      params.push(user.userId, user.userId);
    }

    sql += `
      ORDER BY t.createdAt DESC
    `;

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET TASKS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load tasks",
    });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const connection = await db.getConnection();

  try {
    const user = req.user!;

    const {
      title,
      description,
      priority,
      departmentId,
      assignedEaId,
    } = req.body;

    if (!title || !priority || !departmentId || !assignedEaId) {
      return res.status(400).json({
        success: false,
        message:
          "Title, priority, department and assigned EA are required",
      });
    }

    if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority",
      });
    }

    const [eaRows] = await connection.query(
      `
      SELECT id
      FROM \`User\`
      WHERE id = ?
        AND role = 'EA'
        AND isActive = true
      LIMIT 1
      `,
      [assignedEaId]
    );

    const eas = eaRows as any[];

    if (eas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected EA is invalid",
      });
    }

    const [departmentRows] = await connection.query(
      `
      SELECT id
      FROM Department
      WHERE id = ?
        AND isActive = true
      LIMIT 1
      `,
      [departmentId]
    );

    const departments = departmentRows as any[];

    if (departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected department is invalid",
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO Task
      (
        title,
        description,
        priority,
        status,
        responsibility,
        departmentId,
        createdById,
        assignedEaId,
        delayCount,
        targetDateUpdateCount,
        createdAt,
        updatedAt
      )
      VALUES
      (
        ?,
        ?,
        ?,
        'NEW',
        'EA',
        ?,
        ?,
        ?,
        0,
        0,
        NOW(3),
        NOW(3)
      )
      `,
      [
        title.trim(),
        description?.trim() || null,
        priority,
        Number(departmentId),
        user.userId,
        Number(assignedEaId),
      ]
    );

    const taskId = (result as any).insertId;

    await connection.query(
      `
      INSERT INTO TaskStatusHistory
      (
        taskId,
        fromStatus,
        toStatus,
        changedById,
        note,
        createdAt
      )
      VALUES
      (?, NULL, 'NEW', ?, ?, NOW(3))
      `,
      [
        taskId,
        user.userId,
        "Task created",
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Delegation created successfully",
      taskId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("CREATE TASK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create delegation",
    });
  } finally {
    connection.release();
  }
});

export default router;