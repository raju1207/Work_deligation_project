import { Router } from "express";
import bcrypt from "bcrypt";

import { db } from "../lib/db.js";

import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

/* ============================================
   ROLE RULES
============================================ */

const managementViewRoles = [
  "ADMIN",
  "HR",
  "MD",
  "EA",
];

const validRoles = [
  "ADMIN",
  "MD",
  "HR",
  "EA",
  "DEPARTMENT_HOD",
  "PROCESS",
  "SC_TEAM",
  "EMPLOYEE",
];

function canViewUsers(
  role: string
) {
  return managementViewRoles.includes(
    role
  );
}

function canCreateUser(
  role: string
) {
  return (
    role === "ADMIN" ||
    role === "HR"
  );
}

/*
  HR cannot create or modify
  ADMIN / MD accounts.
*/

function hrCanManageRole(
  targetRole: string
) {
  return ![
    "ADMIN",
    "MD",
  ].includes(
    targetRole
  );
}

/* ============================================
   GET ALL USERS
============================================ */

router.get(
  "/",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const currentUser =
        req.user!;

      if (
        !canViewUsers(
          currentUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to view users",
          });
      }

      const [rows] =
        await db.query(
          `
          SELECT

            u.id,
            u.name,
            u.email,
            u.role,
            u.isActive,

            u.departmentId,

            d.name
              AS departmentName,

            e.id
              AS employeeId,

            e.employeeCode,

            e.fullName
              AS employeeName,

            e.officialEmail,

            u.createdAt,
            u.updatedAt

          FROM \`User\` u

          LEFT JOIN Department d
            ON d.id =
               u.departmentId

          LEFT JOIN Employee e
            ON e.userId =
               u.id

          ORDER BY
            u.isActive DESC,
            u.name ASC
          `
        );

      return res.json({
        success: true,
        data: rows,
      });

    } catch (error) {

      console.error(
        "GET USERS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load users",
        });
    }
  }
);

/* ============================================
   GET SINGLE USER
============================================ */

router.get(
  "/:id",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const currentUser =
        req.user!;

      if (
        !canViewUsers(
          currentUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to view users",
          });
      }

      const userId =
        Number(
          req.params.id
        );

      if (
        !Number.isInteger(
          userId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid user ID",
          });
      }

      const [rows] =
        await db.query(
          `
          SELECT

            u.id,
            u.name,
            u.email,
            u.role,
            u.isActive,

            u.departmentId,

            d.name
              AS departmentName,

            e.id
              AS employeeId,

            e.employeeCode,

            e.fullName
              AS employeeName,

            e.officialEmail,

            u.createdAt,
            u.updatedAt

          FROM \`User\` u

          LEFT JOIN Department d
            ON d.id =
               u.departmentId

          LEFT JOIN Employee e
            ON e.userId =
               u.id

          WHERE
            u.id = ?

          LIMIT 1
          `,
          [userId]
        );

      const user =
        (rows as any[])[0];

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      return res.json({
        success: true,
        data: user,
      });

    } catch (error) {

      console.error(
        "GET USER ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load user",
        });
    }
  }
);

/* ============================================
   CREATE USER
============================================ */

router.post(
  "/",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const currentUser =
        req.user!;

      if (
        !canCreateUser(
          currentUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to create users",
          });
      }

      const {
        name,
        email,
        password,
        role,
        departmentId,
      } =
        req.body;

      if (
        !name?.trim() ||
        !email?.trim() ||
        !password ||
        !role
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Name, email, password and role are required",
          });
      }

      if (
        !validRoles.includes(
          role
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid user role",
          });
      }

      /*
        HR RESTRICTION
      */

      if (
        currentUser.role ===
          "HR" &&
        !hrCanManageRole(
          role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "HR cannot create ADMIN or MD accounts",
          });
      }

      if (
        String(
          password
        ).length < 8
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Password must be at least 8 characters",
          });
      }

      const normalizedEmail =
        String(
          email
        )
          .trim()
          .toLowerCase();

      /* EMAIL CHECK */

      const [existingRows] =
        await db.query(
          `
          SELECT id

          FROM \`User\`

          WHERE
            LOWER(email) =
            LOWER(?)

          LIMIT 1
          `,
          [
            normalizedEmail,
          ]
        );

      if (
        (existingRows as any[])
          .length > 0
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "A user with this email already exists",
          });
      }

      /* DEPARTMENT CHECK */

      let finalDepartmentId:
        number | null =
        null;

      if (
        departmentId
      ) {
        const [departmentRows] =
          await db.query(
            `
            SELECT id

            FROM Department

            WHERE
              id = ?
              AND isActive = 1

            LIMIT 1
            `,
            [
              Number(
                departmentId
              ),
            ]
          );

        if (
          (departmentRows as any[])
            .length === 0
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid department",
            });
        }

        finalDepartmentId =
          Number(
            departmentId
          );
      }

      /* HASH PASSWORD */

      const passwordHash =
        await bcrypt.hash(
          String(
            password
          ),
          12
        );

      /* CREATE USER */

      const [result]: any =
        await db.query(
          `
          INSERT INTO \`User\`
          (
            name,
            email,
            passwordHash,

            role,

            departmentId,

            isActive,

            createdAt,
            updatedAt
          )

          VALUES
          (
            ?,
            ?,
            ?,

            ?,

            ?,

            1,

            NOW(),
            NOW()
          )
          `,
          [
            String(
              name
            ).trim(),

            normalizedEmail,

            passwordHash,

            role,

            finalDepartmentId,
          ]
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "User created successfully",

          userId:
            result.insertId,
        });

    } catch (error) {

      console.error(
        "CREATE USER ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to create user",
        });
    }
  }
);

/* ============================================
   UPDATE USER
============================================ */

router.patch(
  "/:id",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const currentUser =
        req.user!;

      if (
        !canCreateUser(
          currentUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to update users",
          });
      }

      const userId =
        Number(
          req.params.id
        );

      if (
        !Number.isInteger(
          userId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid user ID",
          });
      }

      const {
        name,
        email,
        role,
        departmentId,
        isActive,
      } =
        req.body;

      /* CURRENT TARGET USER */

      const [targetRows] =
        await db.query(
          `
          SELECT

            id,
            name,
            email,
            role,
            departmentId,
            isActive

          FROM \`User\`

          WHERE
            id = ?

          LIMIT 1
          `,
          [userId]
        );

      const targetUser =
        (targetRows as any[])[0];

      if (!targetUser) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      /*
        HR CANNOT MANAGE
        ADMIN / MD
      */

      if (
        currentUser.role ===
          "HR" &&
        !hrCanManageRole(
          targetUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "HR cannot modify ADMIN or MD accounts",
          });
      }

      const finalRole =
        role ||
        targetUser.role;

      if (
        !validRoles.includes(
          finalRole
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid user role",
          });
      }

      if (
        currentUser.role ===
          "HR" &&
        !hrCanManageRole(
          finalRole
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "HR cannot assign ADMIN or MD roles",
          });
      }

      const finalName =
        name !== undefined
          ? String(
              name
            ).trim()
          : targetUser.name;

      const finalEmail =
        email !== undefined
          ? String(
              email
            )
              .trim()
              .toLowerCase()
          : targetUser.email;

      if (
        !finalName ||
        !finalEmail
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Name and email cannot be blank",
          });
      }

      /* EMAIL DUPLICATE */

      const [duplicateRows] =
        await db.query(
          `
          SELECT id

          FROM \`User\`

          WHERE
            LOWER(email) =
            LOWER(?)

            AND id <> ?

          LIMIT 1
          `,
          [
            finalEmail,
            userId,
          ]
        );

      if (
        (duplicateRows as any[])
          .length > 0
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Another user already uses this email",
          });
      }

      /* DEPARTMENT */

      let finalDepartmentId =
        targetUser.departmentId;

      if (
        departmentId === null ||
        departmentId === ""
      ) {
        finalDepartmentId =
          null;

      } else if (
        departmentId !==
        undefined
      ) {

        const [departmentRows] =
          await db.query(
            `
            SELECT id

            FROM Department

            WHERE
              id = ?
              AND isActive = 1

            LIMIT 1
            `,
            [
              Number(
                departmentId
              ),
            ]
          );

        if (
          (departmentRows as any[])
            .length === 0
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid department",
            });
        }

        finalDepartmentId =
          Number(
            departmentId
          );
      }

      const finalIsActive =
        isActive === undefined
          ? targetUser.isActive
          : isActive
            ? 1
            : 0;

      /*
        DO NOT ALLOW USER TO
        DEACTIVATE THEIR OWN ACCOUNT
      */

      if (
        Number(
          currentUser.userId
        ) ===
          userId &&
        finalIsActive === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "You cannot deactivate your own account",
          });
      }

      await db.query(
        `
        UPDATE \`User\`

        SET
          name = ?,
          email = ?,
          role = ?,
          departmentId = ?,
          isActive = ?,
          updatedAt = NOW()

        WHERE
          id = ?
        `,
        [
          finalName,
          finalEmail,
          finalRole,
          finalDepartmentId,
          finalIsActive,
          userId,
        ]
      );

      return res.json({
        success: true,
        message:
          "User updated successfully",
      });

    } catch (error) {

      console.error(
        "UPDATE USER ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to update user",
        });
    }
  }
);

/* ============================================
   RESET PASSWORD
============================================ */

router.patch(
  "/:id/password",
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const currentUser =
        req.user!;

      if (
        !canCreateUser(
          currentUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You do not have permission to reset passwords",
          });
      }

      const userId =
        Number(
          req.params.id
        );

      const {
        newPassword,
      } =
        req.body;

      if (
        !Number.isInteger(
          userId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid user ID",
          });
      }

      if (
        !newPassword ||
        String(
          newPassword
        ).length < 8
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "New password must be at least 8 characters",
          });
      }

      const [targetRows] =
        await db.query(
          `
          SELECT
            id,
            role

          FROM \`User\`

          WHERE
            id = ?

          LIMIT 1
          `,
          [userId]
        );

      const targetUser =
        (targetRows as any[])[0];

      if (!targetUser) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "User not found",
          });
      }

      if (
        currentUser.role ===
          "HR" &&
        !hrCanManageRole(
          targetUser.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "HR cannot reset ADMIN or MD passwords",
          });
      }

      const passwordHash =
        await bcrypt.hash(
          String(
            newPassword
          ),
          12
        );

      await db.query(
        `
        UPDATE \`User\`

        SET
          passwordHash = ?,
          updatedAt = NOW()

        WHERE
          id = ?
        `,
        [
          passwordHash,
          userId,
        ]
      );

      return res.json({
        success: true,

        message:
          "Password reset successfully",
      });

    } catch (error) {

      console.error(
        "RESET PASSWORD ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to reset password",
        });
    }
  }
);

export default router;