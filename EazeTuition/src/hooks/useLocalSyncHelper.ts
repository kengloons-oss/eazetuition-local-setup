import { bulkUpsertServiceEnrollments, clearServiceEnrollmentsByStudent, updateSyncTime, upsertPayment } from "../database/localDB";
import { API_BASE_URL } from "../config";

/**
 * 🔄 Immediate sync: fetch recent payments and store into local DB
 * Used after successful Stripe payment or any payment update.
 */
export const syncLatestPayment = async (parentId: number) => {
    try {
        // Fetch payments within recent 3 months
        const today = new Date();
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - 3);

        const url =
            `${API_BASE_URL}/payment/all/${parentId}` +
            `?from_date=${fromDate.toISOString().split("T")[0]}` +
            `&to_date=${today.toISOString().split("T")[0]}`;

        const res = await fetch(url);
        const payments = await res.json();
        
        if (Array.isArray(payments)) {
            for (const p of payments) {
                upsertPayment(p);   // <-- 真正触发崩溃的地方
            }

            console.log(`💾 Immediate Payment Sync: ${payments.length} payments updated`);
        } else {
            console.log("ℹ️ No payment updates found");
        }
    } catch (err) {
        console.log("❌ Error during immediate payment sync:", err);
    }
};


export const syncServiceEnrollments = async (studentIds: number[]) => {
  for (const sid of studentIds) {
    try {
      console.log(`🔄 Syncing service enrollment for student ${sid}...`);

      // You may include incremental logic later; for now full replace
      clearServiceEnrollmentsByStudent(sid);

      const res = await fetch(
        `${API_BASE_URL}/service/enrollment/mobile/${sid}`
      );

      if (!res.ok) {
        console.error("❌ Failed to fetch service enrollment:", sid);
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        bulkUpsertServiceEnrollments(data);
      }

      updateSyncTime(`service_enroll_${sid}`, new Date().toISOString());

    } catch (err) {
      console.error("❌ Error syncing service enrollment:", err);
    }
  }
};