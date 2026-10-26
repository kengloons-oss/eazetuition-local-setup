// app/hooks/useTimetableSync.ts
import NetInfo from "@react-native-community/netinfo";
import { API_BASE_URL } from "../config";
import {
  upsertTimetable,
  clearTimetableByStudent,
  updateSyncTime,
  getLastSyncTime,
} from "../database/localDB";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 📅 同步学生课表（支持多名学生 or 单一学生）
 * @param studentIds 可选参数，若传入则使用指定学生；否则自动从 AsyncStorage 加载 parent → 学生
 */
export const syncStudentTimetables = async (studentIds?: number[]) => {
  console.log("🔄 Starting timetable sync...");

  try {
    // ✅ 检查网络连接
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log("⚠️ No internet connection, skipping timetable sync");
      return;
    }

    // ✅ 获取当前年份 & 下一年
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    // ✅ 如果没传 studentIds，则尝试从本地用户数据获取（Parent fallback）
    let idsToSync: number[] = [];
    if (studentIds && studentIds.length > 0) {
      idsToSync = studentIds;
    } else {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        console.log("⚠️ No user data found, cannot sync timetables.");
        return;
      }
      const user = JSON.parse(userData);

      if (user.type === "parent") {
        console.log(`👨‍👩‍👧 Fetching students for parent ${user.parent_id}`);
        const studentsRes = await fetch(
          `${API_BASE_URL}/student/${user.parent_id}/students`
        );
        if (!studentsRes.ok) throw new Error("Failed to fetch students");

        const students = await studentsRes.json();
        if (Array.isArray(students) && students.length > 0) {
          idsToSync = students.map((s: any) => s.student_id);
        } else {
          console.log("ℹ️ No students found for parent.");
          return;
        }
      } else if (user.type === "student" && user.student_id) {
        idsToSync = [user.student_id];
      } else {
        console.log("⚠️ Not a parent/student user, skipping timetable sync");
        return;
      }
    }

    if (idsToSync.length === 0) {
      console.log("ℹ️ No student IDs to sync.");
      return;
    }

    // ✅ 取得上次同步时间（可选）
    const lastSync = getLastSyncTime("timetable");
    console.log("🕓 Last timetable sync:", lastSync || "Never");

    // ✅ 遍历每个学生，获取其课表
    for (const studentId of idsToSync) {
      console.log(`📘 Syncing timetable for student_id=${studentId}...`);

      try {
        const res = await fetch(`${API_BASE_URL}/class/schedule/student/${studentId}`);
        if (!res.ok) {
          console.log(`⚠️ Failed to fetch timetable for student ${studentId}`);
          continue;
        }

        const timetables = await res.json();
        if (!Array.isArray(timetables)) continue;

        // ✅ 清空旧课表
        clearTimetableByStudent(studentId);

        // ✅ 仅保留当前年 + 下一年的课表
        const filtered = timetables.filter((t) => {
          const date = new Date(t.start_time);
          const year = date.getFullYear();
          return year === currentYear || year === nextYear;
        });

        console.log(`🧾 ${filtered.length} timetable entries kept for ${studentId}`);

        // ✅ 插入记录
        filtered.forEach((entry) => {
          upsertTimetable({
            ...entry,
            start_time: entry.start_time,
            end_time: entry.end_time,
          });
        });
      } catch (e) {
        console.error(`❌ Error syncing timetable for student ${studentId}:`, e);
      }
    }

    // ✅ 更新同步时间
    updateSyncTime("timetable", new Date().toISOString());
    console.log("✅ Timetable sync completed successfully.");
  } catch (err) {
    console.error("❌ Error in syncStudentTimetables:", err);
  }
};

export const syncOneStudentTimetable = async (studentId: number) => {
  try {
    console.log(`🔄 Syncing timetable for student ${studentId}...`);

    // 1️⃣ 网络检查
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      console.log("📴 Offline - skip sync");
      return false;
    }

    // 2️⃣ 拉取 API
    const res = await fetch(`${API_BASE_URL}/class/schedule/student/${studentId}`);
    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return false;

    // 3️⃣ 清空旧记录
    clearTimetableByStudent(studentId);

    // 4️⃣ 写入新的
    data.forEach((row: any) => upsertTimetable(row));

    // 5️⃣ 更新时间戳
    updateSyncTime(`timetable_${studentId}`, new Date().toISOString());


    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};


export const syncTutorTimetable = async () => {
  try {
    console.log("🔄 Syncing tutor timetable...");

    // 1️⃣ Load user
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr) return;

    const user = JSON.parse(userStr);
    if (user.type !== "tutor") {
      console.log("ℹ️ Not a tutor user. Skipping tutor timetable sync.");
      return;
    }

    const tutorId = user.tutor_id;
    if (!tutorId) return;

    // 2️⃣ Network check
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      console.log("📴 Offline - skip tutor sync");
      return;
    }

    // 3️⃣ Fetch API
    const res = await fetch(`${API_BASE_URL}/class/schedule/tutor/${tutorId}`);
    if (!res.ok) {
      console.log("❌ Failed to fetch tutor timetable");
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return;

    // 4️⃣ Clear old
    await clearTimetableByStudent(tutorId); // reuse same table

    // 5️⃣ Insert new
    data.forEach((row) => upsertTimetable({ ...row}));

    // 6️⃣ Update sync time
    updateSyncTime(`tutor_timetable_${tutorId}`, new Date().toISOString());

    console.log("✅ Tutor timetable sync completed.");
  } catch (err) {
    console.error("❌ Tutor timetable sync error:", err);
  }
};
