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

    /*
      MANAGEMENT VIEW
      ADMIN / MD / EA can see all tasks.

      Other users see:
      - tasks they created
      - tasks assigned to their linked Employee account
    */

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

export default router;