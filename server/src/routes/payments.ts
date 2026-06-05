import { Router } from "express";
import { eq } from "drizzle-orm";
import { companies, payosTransactions } from "@paperclipai/db";
import { getPayOS } from "../services/payos.js";
import type { Db } from "@paperclipai/db";

export function paymentsRoutes(db: Db) {
  const router = Router();

  // Bắt HTTP POST -> tạo link thanh toán
  router.post("/create", async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor || actor.type !== "board") {
        res.status(401).json({ error: "Chưa xác thực" });
        return;
      }
      
      const { companyId, amount } = req.body;
      if (!companyId || !amount || amount < 2000) {
        res.status(400).json({ error: "Số tiền nạp tối thiểu là 2000 VND" });
        return;
      }

      // Quy tắc OrderCode PayOS là số nguyên <= 53 bytes.
      const orderCode = Number(String(Date.now()).slice(-9)); 
      const payos = getPayOS();
      
      // Frontend origin để redirect lại sau khi thanh toán
      const YOUR_DOMAIN = req.headers.origin || "http://localhost:3100";
      
      // Thông tin khởi tạo hóa đơn QR PayOS
      const requestBody = {
        orderCode: orderCode,
        amount: amount,
        description: `NapTien.Company`,
        cancelUrl: `${YOUR_DOMAIN}`,
        returnUrl: `${YOUR_DOMAIN}?payos=success`,
      };

      const paymentLinkRes = await payos.createPaymentLink(requestBody);

      // Lưu transaction vào CSDL
      await db.insert(payosTransactions).values({
        companyId: companyId,
        orderCode: orderCode,
        amountCents: amount,
        status: "PENDING",
        checkoutUrl: paymentLinkRes.checkoutUrl,
        paymentLinkId: paymentLinkRes.paymentLinkId,
      });

      res.json({ checkoutUrl: paymentLinkRes.checkoutUrl });
    } catch (err) {
      console.error("[PayOS] Lỗi tạo payment link", err);
      // Fallback khi chạy Local ko có webhook ngrok, bypass cho Sếp test
      next(err);
    }
  });

  // Hứng Webhook từ máy chủ PayOS trả về
  router.post("/webhook", async (req, res, next) => {
    try {
      const payos = getPayOS();
      // Hàm này tự xác thực checksum
      const webhookData = payos.verifyPaymentWebhookData(req.body);

      // Code "00" có nghĩa là đã thanh toán thành công
      if (webhookData.code === "00") {
        const transactions = await db
          .select()
          .from(payosTransactions)
          .where(eq(payosTransactions.orderCode, webhookData.orderCode));

        const txn = transactions[0];

        // Rào chắn double-webhooking (chỉ cộng tiền khi đang ở PENDING)
        if (txn && txn.status === "PENDING") {
          await db
            .update(payosTransactions)
            .set({ status: "PAID", updatedAt: new Date() })
            .where(eq(payosTransactions.id, txn.id));

          // Tỷ giá quy ước: 25.000 VNĐ = 1 USD (100 Cents USD cho hệ thống lõi)
          // => 1 VNĐ = 100/25000 USD Cents = (1/250) Cents
          const companyList = await db.select().from(companies).where(eq(companies.id, txn.companyId));
          if (companyList.length > 0) {
            const addedBudgetCents = Math.floor(txn.amountCents / 250);
            await db
              .update(companies)
              .set({
                budgetMonthlyCents: companyList[0].budgetMonthlyCents + addedBudgetCents
              })
              .where(eq(companies.id, txn.companyId));
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("[PayOS] Webhook Error", err);
      res.status(400).json({ error: "Lỗi xử lý Webhook" });
    }
  });

  return router;
}
