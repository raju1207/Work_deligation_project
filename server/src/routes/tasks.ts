import {
  Router,
} from "express";

import {
  db,
} from "../lib/db.js";

import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

const router =
  Router();

router.use(
  requireAuth
);

const managementRoles = [
  "ADMIN",
  "MD",
  "HR",
  "EA",
];

const delegationCreatorRoles = [
  "ADMIN",
  "MD",
  "HR",
  "EA",
  "EMPLOYEE",
];

/* =========================================================
   GET TASK LIST
========================================================= */

router.get(
  "/",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const user =
        req.user!;

      const isManagement =
        managementRoles.includes(
          user.role
        );

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

          t.eaFirstActionAt,
          t.eaLateResponse,

          t.delayCount,
          t.targetDateUpdateCount,

          t.completedAt,
          t.cancelledAt,

          t.createdAt,
          t.updatedAt,

          d.id AS departmentId,
          d.name AS departmentName,

          creator.id AS createdById,
          creator.name AS createdByName,

          ea.id AS assignedEaId,
          ea.name AS assignedEaName,
          ea.email AS assignedEaEmail,

          emp.id AS assignedEmployeeId,
          emp.fullName AS assignedEmployeeName,
          emp.officialEmail AS assignedEmployeeEmail,
          emp.userId AS assignedEmployeeUserId

        FROM Task t

        INNER JOIN Department d
          ON d.id =
             t.departmentId

        INNER JOIN \`User\` creator
          ON creator.id =
             t.createdById

        LEFT JOIN \`User\` ea
          ON ea.id =
             t.assignedEaId

        LEFT JOIN Employee emp
          ON emp.id =
             t.assignedEmployeeId
      `;

      const params:
        any[] = [];

      /*
        MANAGEMENT:
        ADMIN / MD / HR / EA
        can see all delegations.

        EMPLOYEE:
        can only see delegation:
        1. created by employee
        2. assigned to employee
      */

      if (!isManagement) {
        sql += `
          WHERE
            t.createdById = ?
            OR emp.userId = ?
        `;

        params.push(
          user.userId,
          user.userId
        );
      }

      sql += `
        ORDER BY
          t.createdAt DESC
      `;

      const [rows] =
        await db.query(
          sql,
          params
        );

      return res.json({
        success: true,
        data: rows,
      });

    } catch (error) {

      console.error(
        "GET TASKS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load tasks",
        });

    }
  }
);

/* =========================================================
   GET SINGLE TASK + COMPLETE HISTORY
========================================================= */

router.get(
  "/:id/details",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const user =
        req.user!;

      const taskId =
        Number(
          req.params.id
        );

      if (!taskId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid task ID",
          });
      }

      const [taskRows] =
        await db.query(
          `
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

            t.eaFirstActionAt,
            t.eaLateResponse,

            t.delayCount,
            t.targetDateUpdateCount,

            t.completedAt,
            t.cancelledAt,

            t.createdAt,
            t.updatedAt,

            d.id AS departmentId,
            d.name AS departmentName,

            creator.id AS createdById,
            creator.name AS createdByName,
            creator.email AS createdByEmail,

            ea.id AS assignedEaId,
            ea.name AS assignedEaName,
            ea.email AS assignedEaEmail,

            emp.id AS assignedEmployeeId,
            emp.fullName AS assignedEmployeeName,
            emp.officialEmail AS assignedEmployeeEmail,
            emp.userId AS assignedEmployeeUserId

          FROM Task t

          INNER JOIN Department d
            ON d.id =
               t.departmentId

          INNER JOIN \`User\` creator
            ON creator.id =
               t.createdById

          LEFT JOIN \`User\` ea
            ON ea.id =
               t.assignedEaId

          LEFT JOIN Employee emp
            ON emp.id =
               t.assignedEmployeeId

          WHERE
            t.id = ?

          LIMIT 1
          `,
          [
            taskId,
          ]
        );

      const tasks =
        taskRows as any[];

      if (
        tasks.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Task not found",
          });
      }

      const task =
        tasks[0];

      const isManagement =
        managementRoles.includes(
          user.role
        );

      const createdByUser =
        Number(
          task.createdById
        ) ===
        Number(
          user.userId
        );

      const assignedEmployee =
        Number(
          task.assignedEmployeeUserId
        ) ===
        Number(
          user.userId
        );

      if (
        !isManagement &&
        !createdByUser &&
        !assignedEmployee
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to view this delegation",
          });
      }

      const [historyRows] =
        await db.query(
          `
          SELECT
            h.id,
            h.fromStatus,
            h.toStatus,
            h.note,
            h.createdAt,

            u.id AS changedById,
            u.name AS changedByName,
            u.email AS changedByEmail,
            u.role AS changedByRole

          FROM TaskStatusHistory h

          INNER JOIN \`User\` u
            ON u.id =
               h.changedById

          WHERE
            h.taskId = ?

          ORDER BY
            h.createdAt ASC,
            h.id ASC
          `,
          [
            taskId,
          ]
        );

      const [delayRows] =
        await db.query(
          `
          SELECT
            td.id,
            td.delayNumber,
            td.oldTargetDate,
            td.newTargetDate,
            td.reason,
            td.createdAt,

            u.id AS createdById,
            u.name AS createdByName,
            u.email AS createdByEmail,
            u.role AS createdByRole

          FROM TaskDelay td

          INNER JOIN \`User\` u
            ON u.id =
               td.createdById

          WHERE
            td.taskId = ?

          ORDER BY
            td.delayNumber ASC,
            td.createdAt ASC
          `,
          [
            taskId,
          ]
        );

      return res.json({
        success: true,

        data: {
          task,

          statusHistory:
            historyRows,

          delays:
            delayRows,
        },
      });

    } catch (error) {

      console.error(
        "GET TASK DETAILS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load task details",
        });

    }
  }
);

/* =========================================================
   CREATE NEW DELEGATION
========================================================= */

router.post(
  "/",
  async (
    req: AuthRequest,
    res
  ) => {
    const connection =
      await db.getConnection();

    try {
      const user =
        req.user!;

      /*
        ONLY:
        EMPLOYEE
        EA
        HR
        MD
        ADMIN
        CAN CREATE
      */

      if (
        !delegationCreatorRoles.includes(
          user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to create a delegation",
          });
      }

      const {
        title,
        description,
        priority,
        departmentId,
        assignedEaId,
      } =
        req.body;

      /* REQUIRED FIELDS */

      if (
        !title?.trim() ||
        !description?.trim() ||
        !priority ||
        !departmentId ||
        !assignedEaId
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Title, description, priority, department and assigned EA are required",
          });
      }

      if (
        ![
          "HIGH",
          "MEDIUM",
          "LOW",
        ].includes(
          priority
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid priority",
          });
      }

      /* CHECK EA */

      const [eaRows] =
        await connection.query(
          `
          SELECT
            id
          FROM \`User\`
          WHERE
            id = ?
            AND role = 'EA'
            AND isActive = true
          LIMIT 1
          `,
          [
            Number(
              assignedEaId
            ),
          ]
        );

      const eas =
        eaRows as any[];

      if (
        eas.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected EA is invalid",
          });
      }

      /* CHECK DEPARTMENT */

      const [departmentRows] =
        await connection.query(
          `
          SELECT
            id
          FROM Department
          WHERE
            id = ?
            AND isActive = true
          LIMIT 1
          `,
          [
            Number(
              departmentId
            ),
          ]
        );

      const departments =
        departmentRows as any[];

      if (
        departments.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected department is invalid",
          });
      }

      await connection.beginTransaction();

      const [result] =
        await connection.query(
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

            description.trim(),

            priority,

            Number(
              departmentId
            ),

            user.userId,

            Number(
              assignedEaId
            ),
          ]
        );

      const taskId =
        (
          result as any
        ).insertId;

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
        (
          ?,
          NULL,
          'NEW',
          ?,
          ?,
          NOW(3)
        )
        `,
        [
          taskId,

          user.userId,

          "Delegation created",
        ]
      );

      await connection.commit();

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Delegation created successfully",

          taskId,
        });

    } catch (error) {

      await connection.rollback();

      console.error(
        "CREATE TASK ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to create delegation",
        });

    } finally {

      connection.release();

    }
  }
);

/* =========================================================
   MANAGEMENT ASSIGNS EMPLOYEE
========================================================= */

router.patch(
  "/:id/assign",
  async (
    req: AuthRequest,
    res
  ) => {
    const connection =
      await db.getConnection();

    try {
      const user =
        req.user!;

      /*
        FULL MANAGEMENT PERMISSION
      */

      if (
        !managementRoles.includes(
          user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only EA, HR, MD or Admin can assign an employee",
          });
      }

      const taskId =
        Number(
          req.params.id
        );

      const {
        assignedEmployeeId,
        startDate,
        targetDate,
      } =
        req.body;

      if (
        !taskId ||
        !assignedEmployeeId ||
        !startDate ||
        !targetDate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Employee, start date and target date are required",
          });
      }

      const parsedStartDate =
        new Date(
          startDate
        );

      const parsedTargetDate =
        new Date(
          targetDate
        );

      if (
        Number.isNaN(
          parsedStartDate.getTime()
        ) ||
        Number.isNaN(
          parsedTargetDate.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid start date or target date",
          });
      }

      if (
        parsedTargetDate <
        parsedStartDate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Target date cannot be earlier than start date",
          });
      }

      /* LOAD TASK */

      const [taskRows] =
        await connection.query(
          `
          SELECT
            id,
            status,
            responsibility,
            assignedEaId,
            departmentId,
            createdAt,
            eaFirstActionAt

          FROM Task

          WHERE
            id = ?

          LIMIT 1
          `,
          [
            taskId,
          ]
        );

      const tasks =
        taskRows as any[];

      if (
        tasks.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Task not found",
          });
      }

      const task =
        tasks[0];

      if (
        task.responsibility !==
        "EA"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This delegation is no longer pending for assignment",
          });
      }

      /* CHECK EMPLOYEE */

      const [employeeRows] =
        await connection.query(
          `
          SELECT
            id,
            departmentId,
            isActive

          FROM Employee

          WHERE
            id = ?
            AND isActive = true

          LIMIT 1
          `,
          [
            Number(
              assignedEmployeeId
            ),
          ]
        );

      const employees =
        employeeRows as any[];

      if (
        employees.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Selected employee is invalid",
          });
      }

      const employee =
        employees[0];

      if (
        employee.departmentId &&
        Number(
          employee.departmentId
        ) !==
          Number(
            task.departmentId
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Employee does not belong to this task department",
          });
      }

      /* EA RESPONSE TIME */

      const now =
        new Date();

      const createdAt =
        new Date(
          task.createdAt
        );

      const responseHours =
        (
          now.getTime() -
          createdAt.getTime()
        ) /
        (
          1000 *
          60 *
          60
        );

      const eaLateResponse =
        responseHours >
        2;

      await connection.beginTransaction();

      await connection.query(
        `
        UPDATE Task

        SET
          assignedEmployeeId = ?,

          startDate = ?,

          originalTargetDate = ?,

          currentTargetDate = ?,

          responsibility = 'EMPLOYEE',

          status = 'IN_PROGRESS',

          eaFirstActionAt =
            COALESCE(
              eaFirstActionAt,
              NOW(3)
            ),

          eaLateResponse =
            CASE
              WHEN eaFirstActionAt IS NULL
              THEN ?
              ELSE eaLateResponse
            END,

          updatedAt =
            NOW(3)

        WHERE
          id = ?
        `,
        [
          Number(
            assignedEmployeeId
          ),

          parsedStartDate,

          parsedTargetDate,

          parsedTargetDate,

          eaLateResponse,

          taskId,
        ]
      );

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
        (
          ?,
          ?,
          'IN_PROGRESS',
          ?,
          ?,
          NOW(3)
        )
        `,
        [
          taskId,

          task.status,

          user.userId,

          "Employee assigned and delegation started",
        ]
      );

      await connection.commit();

      return res.json({
        success: true,

        message:
          "Delegation assigned successfully",
      });

    } catch (error) {

      await connection.rollback();

      console.error(
        "ASSIGN TASK ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to assign delegation",
        });

    } finally {

      connection.release();

    }
  }
);

/* =========================================================
   MANAGEMENT STATUS UPDATE
========================================================= */

router.patch(
  "/:id/status",
  async (
    req: AuthRequest,
    res
  ) => {
    const connection =
      await db.getConnection();

    try {
      const user =
        req.user!;

      /*
        EMPLOYEE CANNOT UPDATE.

        ONLY:
        EA
        HR
        MD
        ADMIN
      */

      if (
        !managementRoles.includes(
          user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only EA, HR, MD or Admin can update delegation status",
          });
      }

      const taskId =
        Number(
          req.params.id
        );

      const {
        status,
        note,
        delayReason,
        newTargetDate,
      } =
        req.body;

      if (!taskId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid task ID",
          });
      }

      const allowedStatuses = [
        "IN_PROGRESS",
        "ON_HOLD",
        "DELAYED",
        "COMPLETED",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid task status",
          });
      }

      /* LOAD TASK */

      const [taskRows] =
        await connection.query(
          `
          SELECT
            t.id,
            t.status,
            t.responsibility,
            t.assignedEmployeeId,
            t.currentTargetDate,
            t.delayCount,
            t.targetDateUpdateCount

          FROM Task t

          WHERE
            t.id = ?

          LIMIT 1
          `,
          [
            taskId,
          ]
        );

      const tasks =
        taskRows as any[];

      if (
        tasks.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Task not found",
          });
      }

      const task =
        tasks[0];

      /* CLOSED TASK */

      if (
        task.status ===
          "COMPLETED" ||
        task.status ===
          "CANCELLED"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This delegation is already closed",
          });
      }

      /* =====================================
         DELAY VALIDATION
      ===================================== */

      let parsedNewTargetDate:
        | Date
        | null =
        null;

      if (
        status ===
        "DELAYED"
      ) {
        if (
          !delayReason?.trim()
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Delay reason is required",
            });
        }

        if (
          !newTargetDate
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "New target date is required",
            });
        }

        if (
          Number(
            task.targetDateUpdateCount ||
              0
          ) >= 3
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Maximum 3 target date revisions are allowed",
            });
        }

        parsedNewTargetDate =
          new Date(
            newTargetDate
          );

        if (
          Number.isNaN(
            parsedNewTargetDate.getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid new target date",
            });
        }

        if (
          task.currentTargetDate
        ) {
          const currentTarget =
            new Date(
              task.currentTargetDate
            );

          if (
            parsedNewTargetDate <=
            currentTarget
          ) {
            return res
              .status(400)
              .json({
                success: false,

                message:
                  "New target date must be later than the current target date",
              });
          }
        }
      }

      await connection.beginTransaction();

      /* =====================================
         DELAYED
      ===================================== */

      if (
        status ===
          "DELAYED" &&
        parsedNewTargetDate
      ) {
        const delayNumber =
          Number(
            task.delayCount ||
              0
          ) + 1;

        await connection.query(
          `
          INSERT INTO TaskDelay
          (
            taskId,
            oldTargetDate,
            newTargetDate,
            reason,
            delayNumber,
            createdById,
            createdAt
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NOW(3)
          )
          `,
          [
            taskId,

            task.currentTargetDate,

            parsedNewTargetDate,

            delayReason.trim(),

            delayNumber,

            user.userId,
          ]
        );

        await connection.query(
          `
          UPDATE Task

          SET
            status =
              'DELAYED',

            currentTargetDate =
              ?,

            delayCount =
              delayCount + 1,

            targetDateUpdateCount =
              targetDateUpdateCount + 1,

            updatedAt =
              NOW(3)

          WHERE
            id = ?
          `,
          [
            parsedNewTargetDate,
            taskId,
          ]
        );
      }

      /* =====================================
         COMPLETED
      ===================================== */

      else if (
        status ===
        "COMPLETED"
      ) {
        await connection.query(
          `
          UPDATE Task

          SET
            status =
              'COMPLETED',

            completedAt =
              NOW(3),

            updatedAt =
              NOW(3)

          WHERE
            id = ?
          `,
          [
            taskId,
          ]
        );
      }

      /* =====================================
         IN PROGRESS / ON HOLD
      ===================================== */

      else {
        await connection.query(
          `
          UPDATE Task

          SET
            status = ?,

            updatedAt =
              NOW(3)

          WHERE
            id = ?
          `,
          [
            status,
            taskId,
          ]
        );
      }

      /* =====================================
         HISTORY
      ===================================== */

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
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          NOW(3)
        )
        `,
        [
          taskId,

          task.status,

          status,

          user.userId,

          status ===
          "DELAYED"
            ? delayReason.trim()
            : note?.trim() ||
              null,
        ]
      );

      await connection.commit();

      return res.json({
        success: true,

        message:
          status ===
          "COMPLETED"
            ? "Delegation completed successfully"
            : status ===
              "DELAYED"
            ? "Delegation delay recorded successfully"
            : "Delegation status updated successfully",
      });

    } catch (error) {

      await connection.rollback();

      console.error(
        "UPDATE TASK STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to update delegation",
        });

    } finally {

      connection.release();

    }
  }
);

export default router;