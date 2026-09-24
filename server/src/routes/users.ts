import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/eas", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        email
      FROM \`User\`
      WHERE role = 'EA'
        AND isActive = true
      ORDER BY name
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET EA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load EA users",
    });
  }
});

export default router;