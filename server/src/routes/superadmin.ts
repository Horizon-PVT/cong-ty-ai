import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { companies, instanceUserRoles } from "@paperclipai/db";
import { eq } from "drizzle-orm";

export function superadminRoutes(db: Db) {
  const router = Router();

  // Middleware bảo vệ: CHỈ DÀNH CHO INSTANCE_ADMIN (BOSS)
  router.use(async (req, res, next) => {
    const actor = req.actor;
    if (!actor || actor.type !== "board") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const roles = await db.select().from(instanceUserRoles).where(eq(instanceUserRoles.userId, actor.userId!));
    const isAdmin = roles.some(r => r.role === "instance_admin");
    if (!isAdmin) {
      res.status(403).json({ error: "Forbidden: Đòi hỏi quyền Super Admin" });
      return;
    }
    next();
  });

  // Liệt kê toàn bộ công ty trên hệ thống
  router.get("/companies", async (req, res, next) => {
    try {
      const allCompanies = await db.select().from(companies);
      res.json(allCompanies);
    } catch (error) {
      next(error);
    }
  });

  // Xóa / Cấm sổ 1 công ty
  router.delete("/companies/:companyId", async (req, res, next) => {
    try {
      const { companyId } = req.params;
      // Soft delete: Chuyển trạng thái sang "archived" (cấm)
      await db.update(companies).set({ status: "archived" }).where(eq(companies.id, companyId));
      res.json({ success: true, message: "Công ty đã bị Ban/Khóa thành công." });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
