// app/hooks/useLocalSync.ts
import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  initDatabase,
  getAllStudents,
  upsertStudent,
  getLatestPaymentDate,
  upsertPayment,
  getLastSyncTime,
  updateSyncTime,
} from "../database/localDB";
import { syncStudentTimetables } from "./useTimetableSync";
import { API_BASE_URL } from "../config";
import { syncServiceEnrollments } from "./useLocalSyncHelper";

export default function useLocalSync(user: any) {
  useEffect(() => {
    if (!user || !user.type) return;

    const syncLocalData = async () => {
      try {
        console.log(`🔄 Local sync started for user type: ${user.type}`);
        initDatabase();
        console.log("🧹 Local DB cleared after init");

        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log("📴 Offline mode: skipped syncing");
          return;
        }

        let children: any[] = [];
        let studentIds: number[] = [];

        // ============================================================
        // 🧩 Parent: preload children from local
        // ============================================================
        if (user.type === "parent") {
          children = getAllStudents();
          studentIds = children.map(s => s.student_id);
        }

        // ============================================================
        // 1️⃣ Parent: Student Sync
        // ============================================================
        if (user.type === "parent") {
          // === 1️⃣ 学生数据同步 ===
          let forceSync = false;
          if (children.length === 0) { forceSync = true }
          const lastStudentSync = getLastSyncTime("student");
          const shouldSyncStudents =
            !lastStudentSync ||
            daysDiff(lastStudentSync, new Date().toISOString()) >= 3;

          if (shouldSyncStudents || forceSync) {
            console.log("👩‍🎓 Syncing student list...");
            const localIds = children.map(s => s.student_id);
            const res = await fetch(
              `${API_BASE_URL}/student/${user.parent_id}/students`
            );
            const students = await res.json();

            students.forEach((stu: any) => {
              if (!localIds.includes(stu.student_id)) {
                upsertStudent(stu);
              }
            });


            // refresh children because newly synced students are added
            children = getAllStudents();
            studentIds = children.map(s => s.student_id);
            updateSyncTime("student", new Date().toISOString());
          }

          // ============================================================
          // 2️⃣ Parent: Payment Sync
          // ============================================================
          const lastPaymentDate = getLatestPaymentDate();
          const lastPaymentSync = getLastSyncTime("payment");

          const shouldSyncPayment =
            !lastPaymentSync ||
            daysDiff(lastPaymentSync, new Date().toISOString()) >= 15;

          if (shouldSyncPayment) {
            console.log("💳 Syncing payment data...");

            let url = `${API_BASE_URL}/payment/all/${user.parent_id}`;
            if (lastPaymentDate) {
              try {
                const fromDate = lastPaymentDate.split(" ")[0];
                const toDate = new Date();
                toDate.setMonth(toDate.getMonth() + 3);
                const toDateStr = toDate.toISOString().split("T")[0];

                url += `?from_date=${fromDate}&to_date=${toDateStr}`;
                console.log(
                  `📡 Fetching payment updates from ${fromDate} to ${toDateStr}`
                );
              } catch (err) {
                console.warn(
                  "⚠️ Failed to parse lastPaymentDate, fallback to full sync:",
                  err
                );
              }
            } else {
              console.log("📡 No local payment found — performing full sync");
            }

            try {
              const payRes = await fetch(url);
              if (!payRes.ok) throw new Error("Failed to fetch payments");

              const payments = await payRes.json();

              if (Array.isArray(payments) && payments.length > 0) {
                payments.forEach((p: any) => upsertPayment(p));
              } else {
                console.log("✅ No new payment updates found.");
              }

              updateSyncTime("payment", new Date().toISOString());
            } catch (err) {
              console.error("❌ Error syncing payments:", err);
            }
          }

          // ============================================================
          // 3️⃣ Parent: Service Enrollment Sync
          // ============================================================
          const lastServiceSync = getLastSyncTime("service_enroll");
          const shouldSyncService =
            !lastServiceSync ||
            daysDiff(lastServiceSync, new Date().toISOString()) >= 3;

          if (shouldSyncService) {
            console.log("🛎 Syncing service enrollments...");

            if (studentIds.length > 0) {
              await syncServiceEnrollments(studentIds);
            }

            updateSyncTime("service_enroll", new Date().toISOString());
          }

        }

        // ============================================================
        // 🕒 Timetable Sync（依用户类型）
        // ============================================================
        const lastTimetableSync = getLastSyncTime("timetable");
        const shouldSyncTimetable =
          !lastTimetableSync ||
          daysDiff(lastTimetableSync, new Date().toISOString()) >= 3;

        if (shouldSyncTimetable) {
          console.log("📚 Syncing timetables...");

          if (user.type === "parent") {
            if (studentIds.length > 0) {
              await syncStudentTimetables(studentIds);
            }
          } else if (user.type === "student") {
            await syncStudentTimetables([user.student_id]);
          } else {
            console.log("ℹ️ Skipped timetable sync (user type not applicable)");
          }

          updateSyncTime("timetable", new Date().toISOString());
        }

        console.log("✅ Local sync complete");
      } catch (err) {
        console.error("❌ Local sync failed:", err);
      }
    };

    syncLocalData();
  }, [user]);
}

// Helper: 计算日期间隔（天）
function daysDiff(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}


