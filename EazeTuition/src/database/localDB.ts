import * as SQLite from "expo-sqlite";
import { ChatRoom } from "../../types/chat";


const db = SQLite.openDatabaseSync("eazetuition.db");
let DB_INIT_DONE = false;

export interface PaymentRecord {
  payment_id: number;
  name: string;
  amount: number;
  description: string;
  payment_status: string;
  created_at?: string;
}

// ✅ 初始化数据库
export const initDatabase = () => {
  // db.execSync("DROP TABLE IF EXISTS service_enrollments;");
  // clearDBdata();
  // dropDbTable();
  if (DB_INIT_DONE) {
    console.log("📦 Local DB already initialized — skipped");
    return;
  }

  // ─────────────── 学生表 ───────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS students (
      student_id INTEGER PRIMARY KEY,
      user_id INTEGER,
      parent_id INTEGER,
      edu_lvl_id INTEGER,
      age INTEGER,
      payment_status TEXT,
      name TEXT,
      edu_level_name TEXT,
      created_at TEXT
    );
  `);

  // ─────────────── 学生课表（Timetable） ───────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS timetables (
      timetable_id INTEGER PRIMARY KEY,
      student_id INTEGER,
      schedule_id INTEGER,
      class_detail_id INTEGER,
      subject_id INTEGER,
      tutor_id INTEGER,
      subject_name TEXT,
      tutor_name TEXT,
      room_name TEXT,
      day_of_week TEXT,
      start_time TEXT,   -- ✅ ISO 格式 datetime
      end_time TEXT,     -- ✅ ISO 格式 datetime
      set_id INTEGER,
      class_type TEXT,
      status TEXT DEFAULT '1',
      attendance_status TEXT
    );
  `);

  // ─────────────── 付款主表 ───────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY,
      student_id INTEGER,
      final_amt REAL DEFAULT 0.0,
      discount_amt REAL DEFAULT 0.0,
      received_amt REAL DEFAULT 0.0,
      change_amt REAL DEFAULT 0.0,
      payment_method TEXT,
      payment_status TEXT,
      payment_datetime TEXT,
      created_at TEXT
    );
  `);

  // ─────────────── 付款明细表 ───────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS payment_details (
      payment_detail_id INTEGER PRIMARY KEY,
      payment_id INTEGER,
      class_detail_id INTEGER,
      class_enrollment_id INTEGER,
      set_id INTEGER,
      class_name TEXT,
      class_fee REAL,
      service_name TEXT,
      service_fee REAL,
      service_attend_time INTEGER,
      fee_type TEXT
    );
  `);

  // ─────────────── Service Enrollment（含服务信息）───────────────
  db.execSync(`
  CREATE TABLE IF NOT EXISTS service_enrollments (
    service_enrollment_id INTEGER PRIMARY KEY,
    student_id INTEGER,
    service_id INTEGER,
    service_name TEXT,
    description TEXT,
    service_type TEXT,
    fee_type TEXT,
    deposit_fee REAL,
    fee_month REAL,
    fee_attend REAL,
    enroll_datetime TEXT,
    address TEXT,
    status TEXT
  );
`);

  // ─────────────── Chat ───────────────
  db.execSync(`
  CREATE TABLE IF NOT EXISTS chat_rooms (
    chat_room_id INTEGER PRIMARY KEY,
    room_name TEXT,
    last_message TEXT,
    last_time TEXT,
    unread_count INTEGER DEFAULT 0
  );
`);

  db.execSync(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    message_id INTEGER PRIMARY KEY,
    chat_room_id INTEGER,
    sender_id INTEGER,
    content TEXT,
    send_datetime TEXT,
    read_by TEXT
  );
`);

  db.execSync(`
  CREATE TABLE IF NOT EXISTS chat_members (
    chat_room_id INTEGER,
    user_id INTEGER,
    PRIMARY KEY (chat_room_id, user_id)
  );
`);



  // ─────────────── 同步日志表 ───────────────
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_log (
      key TEXT PRIMARY KEY,
      last_sync TEXT
    );
  `);

  // Mark initialization complete only after every table has been created.
  DB_INIT_DONE = true;
};

// Create local tables as soon as this module is imported. Screens can mount
// before the root-level network sync effect runs, so waiting for that effect
// can otherwise leave payment reads racing ahead of the table creation.
initDatabase();


const clearDBdata = () => {
  db.execAsync(`
    DELETE FROM students;
    DELETE FROM timetables;
    DELETE FROM service_enrollments;
    DELETE FROM payments;
    DELETE FROM payment_details;
    DELETE FROM chat_members;
    DELETE FROM chat_messages;
    DELETE FROM chat_rooms;
    DELETE FROM sync_log;
  `);
}

const dropDbTable = () => {
  db.execAsync(`
      DROP TABLE IF EXISTS payment_details;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS timetables;
      DROP TABLE IF EXISTS students;
      DROP TABLE IF EXISTS sync_log;
    `);

}
//
// ──────────────────────────────────────────────────────────────────────────────
//  学生操作
// ──────────────────────────────────────────────────────────────────────────────
//
export const upsertStudent = (student: any) => {
  const existing = db.getFirstSync(
    "SELECT student_id FROM students WHERE student_id = ?",
    [student.student_id]
  );

  if (existing) {
    // UPDATE
    db.runSync(
      `UPDATE students SET
        user_id = ?, parent_id = ?, edu_lvl_id = ?, age = ?, payment_status = ?,
        name = ?, edu_level_name = ?, created_at = ?
       WHERE student_id = ?`,
      [
        student.user_id,
        student.parent_id,
        student.edu_lvl_id,
        student.age,
        student.payment_status || "0",
        student.name || null,
        student.edu_level_name || null,
        student.created_at || new Date().toISOString(),
        student.student_id,
      ]
    );
  } else {
    // INSERT
    db.runSync(
      `INSERT INTO students (
         student_id, user_id, parent_id, edu_lvl_id, age, payment_status,
         name, edu_level_name, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.student_id,
        student.user_id,
        student.parent_id,
        student.edu_lvl_id,
        student.age,
        student.payment_status || "0",
        student.name || null,
        student.edu_level_name || null,
        student.created_at || new Date().toISOString(),
      ]
    );
  }
};


// ✅ 获取所有学生
export const getAllStudents = (): any[] => {
  return db.getAllSync("SELECT * FROM students ORDER BY name ASC;");
};

// ──────────────────────────────────────────────────────────────────────────────
//  付款操作
// ──────────────────────────────────────────────────────────────────────────────
//
export const upsertPayment = (payment: any) => {
  const existing = db.getFirstSync(
    "SELECT payment_id FROM payments WHERE payment_id = ?",
    [payment.payment_id]
  );

  if (existing) {
    db.runSync(
      `UPDATE payments SET
        student_id = ?, final_amt = ?, discount_amt = ?, received_amt = ?, change_amt = ?,
        payment_method = ?, payment_status = ?, payment_datetime = ?, created_at = ?
       WHERE payment_id = ?`,
      [
        payment.student_id,
        payment.final_amt || payment.amount || 0,
        payment.discount_amt || 0,
        payment.received_amt || 0,
        payment.change_amt || 0,
        payment.method || null,
        payment.payment_status || "pending",
        payment.payment_datetime || null,
        payment.created_at || new Date().toISOString(),
        payment.payment_id,
      ]
    );
  } else {
    // 3️⃣ INSERT (首次加入)
    db.runSync(
      `INSERT INTO payments (
        payment_id, student_id, final_amt, discount_amt, received_amt, change_amt,
        payment_method, payment_status, payment_datetime, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.payment_id,
        payment.student_id,
        payment.final_amt || payment.amount || 0,
        payment.discount_amt || 0,
        payment.received_amt || 0,
        payment.change_amt || 0,
        payment.method || null,
        payment.status || payment.payment_status || "pending",
        payment.payment_datetime || null,
        payment.created_at || new Date().toISOString(),
      ]
    );
  }

  if (Array.isArray(payment.details)) {
    payment.details.forEach((d: any) => {
      upsertPaymentDetail(d, payment.payment_id);
    });
  }


};

const upsertPaymentDetail = (detail: any, payment_id: number) => {
  // 1️⃣ Check if detail exists
  const existing = db.getFirstSync(
    "SELECT payment_detail_id FROM payment_details WHERE payment_detail_id = ?",
    [detail.payment_detail_id]
  );

  if (existing) {
    // 2️⃣ UPDATE (不会清除 PK，不会触发 FK)
    db.runSync(
      `UPDATE payment_details SET
        payment_id = ?, class_name = ?, class_fee = ?, 
        service_name = ?, service_fee = ?, service_attend_time = ?, fee_type = ?,
        class_detail_id = ?, set_id = ?, class_enrollment_id = ?
       WHERE payment_detail_id = ?`,
      [
        payment_id,
        detail.class_name,
        detail.class_fee,
        detail.service_name,
        detail.service_fee,
        detail.service_attend_time,
        detail.fee_type,
        detail.class_detail_id,
        detail.set_id,
        detail.class_enrollment_id,
        detail.payment_detail_id,
      ]
    );
  } else {
    // 3️⃣ INSERT (全新记录)
    db.runSync(
      `INSERT INTO payment_details (
        payment_detail_id, payment_id, class_name, class_fee,
        service_name, service_fee, service_attend_time, fee_type,
        class_detail_id, set_id, class_enrollment_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        detail.payment_detail_id,
        payment_id,
        detail.class_name,
        detail.class_fee,
        detail.service_name,
        detail.service_fee,
        detail.service_attend_time,
        detail.fee_type,
        detail.class_detail_id,
        detail.set_id,
        detail.class_enrollment_id,
      ]
    );
  }
};


export function getAllPayments(): PaymentRecord[] {
  try {
    const rows = db.getAllSync("SELECT * FROM payments ORDER BY created_at DESC;");
    return rows as PaymentRecord[];
  } catch (error) {
    console.error("❌ Failed to fetch all payments:", error);
    return [];
  }
}


// ✅ 获取学生付款
export const getPaymentsByStudent = (student_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC`,
    [student_id]
  );
};

// ✅ 获取付款明细
export const getPaymentDetails = (payment_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM payment_details WHERE payment_id = ?`,
    [payment_id]
  );
};

// ✅ 获取最后付款时间
export const getLatestPaymentDate = (): string | null => {
  const result = db.getFirstSync<{ latest: string }>(
    "SELECT MAX(created_at) as latest FROM payments;"
  );
  return result?.latest || null;
};

import moment from "moment";


export const getAllPaymentsDetailed = async (): Promise<any[]> => {
  try {
    const payments = await db.getAllAsync<any>("SELECT * FROM payments ORDER BY created_at DESC;");

    // console.log("📌 Raw Payments from SQLite:", JSON.stringify(payments, null, 2));

    const results = [];
    for (const p of payments) {
      const student = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM students WHERE student_id = ?;",
        [p.student_id]
      );
      const studentName = student?.name || "Student";

      const details = await db.getAllAsync(
        "SELECT class_name, service_name FROM payment_details WHERE payment_id = ?;",
        [p.payment_id]
      );

      const description =
        details.length > 0
          ? details.map((d: any) => d.class_name || d.service_name).filter(Boolean).join(", ")
          : "No details available";

      const createdDate = moment(p.created_at || p.payment_datetime);
      const month = createdDate.format("MMMM");
      const year = createdDate.format("YYYY");

      results.push({
        ...p,
        student_name: studentName,
        name: `${studentName}'s ${month} ${year} Payment`,
        description,
      });
    }

    return results;
  } catch (error) {
    console.error("❌ Failed to load detailed payments:", error);
    return [];
  }
};


//
// ──────────────────────────────────────────────────────────────────────────────
//  课表操作
// ──────────────────────────────────────────────────────────────────────────────
//
export const upsertTimetable = (entry: any) => {
  const existing = db.getFirstSync(
    "SELECT timetable_id FROM timetables WHERE timetable_id = ?",
    [entry.timetable_id]
  );

  if (existing) {
    // UPDATE
    db.runSync(
      `UPDATE timetables SET
        student_id = ?, schedule_id = ?, class_detail_id = ?, subject_id = ?,
        tutor_id = ?, subject_name = ?, tutor_name = ?, room_name = ?,
        day_of_week = ?, start_time = ?, end_time = ?, set_id = ?,
        class_type = ?, status = ?, attendance_status = ?
       WHERE timetable_id = ?`,
      [
        entry.student_id,
        entry.schedule_id,
        entry.class_detail_id,
        entry.subject_id,
        entry.tutor_id,
        entry.subject_name,
        entry.tutor_name,
        entry.room_name,
        entry.day_of_week,
        entry.start_time,
        entry.end_time,
        entry.set_id,
        entry.class_type,
        entry.status,
        entry.attendance_status ?? "",
        entry.timetable_id,
      ]
    );
  } else {
    // INSERT
    db.runSync(
      `INSERT INTO timetables (
        timetable_id, student_id, schedule_id, class_detail_id, subject_id,
        tutor_id, subject_name, tutor_name, room_name, day_of_week,
        start_time, end_time, set_id, class_type, status, attendance_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.timetable_id,
        entry.student_id,
        entry.schedule_id,
        entry.class_detail_id,
        entry.subject_id,
        entry.tutor_id,
        entry.subject_name,
        entry.tutor_name,
        entry.room_name,
        entry.day_of_week,
        entry.start_time,
        entry.end_time,
        entry.set_id,
        entry.class_type,
        entry.status,
        entry.attendance_status ?? ""
      ]
    );
  }
};


// ✅ 获取学生课表
export const getTimetableByStudent = (student_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM timetables WHERE student_id = ? ORDER BY start_time ASC`,
    [student_id]
  );
};

// ✅ 删除学生旧课表（重新同步用）
export const clearTimetableByStudent = (student_id: number) => {
  db.runSync(`DELETE FROM timetables WHERE student_id = ?`, [student_id]);
};

export const getTimetableByTutor = (tutor_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM timetables WHERE tutor_id = ? ORDER BY start_time ASC`,
    [tutor_id]
  );
};

export const clearTimetableByTutor = (tutor_id: number) => {
  db.runSync(`DELETE FROM timetables WHERE tutor_id = ?`, [tutor_id]);
};


//
// ──────────────────────────────────────────────────────────────────────────────
//  Service Process
// ──────────────────────────────────────────────────────────────────────────────
//
export const upsertServiceEnrollment = (enroll: any) => {

  const existing = db.getFirstSync(
    `SELECT student_id FROM service_enrollments 
     WHERE service_enrollment_id = ?`,
    [enroll.service_enrollment_id]
  );

  const values = [
    enroll.service_name,
    enroll.service_type,
    enroll.description,
    enroll.fee_type,
    enroll.deposit_fee,
    enroll.fee_month,
    enroll.fee_attend,
    enroll.enroll_datetime,
    enroll.address,
    enroll.status,
    enroll.student_id,
    enroll.service_id,
    enroll.service_enrollment_id
  ];


  if (existing) {
    db.runSync(
      `UPDATE service_enrollments SET
        service_name = ?, service_type = ?, description = ?, fee_type = ?, deposit_fee = ?, 
        fee_month = ?, fee_attend = ?, enroll_datetime = ?, 
        address = ?, status = ?, student_id = ?, service_id = ?
       WHERE service_enrollment_id = ?`,
      values
    );
  } else {
    db.runSync(
      `INSERT INTO service_enrollments (
        service_name, service_type, description, fee_type, deposit_fee, fee_month, fee_attend,
        enroll_datetime, address, status,
        student_id, service_id, service_enrollment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

  }
};

export const bulkUpsertServiceEnrollments = (items: any[]) => {
  if (!Array.isArray(items)) return;
  db.runSync("BEGIN");
  try {
    items.forEach((item) => upsertServiceEnrollment(item));
    db.runSync("COMMIT");
  } catch (err) {
    console.error("❌ bulkUpsertServiceEnrollments failed:", err);
    db.runSync("ROLLBACK");
  }
};

export const clearServiceEnrollmentsByStudent = (student_id: number) => {
  db.runSync(`DELETE FROM service_enrollments WHERE student_id = ?`, [student_id]);
};

export const getServiceEnrollmentsByStudent = (student_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM service_enrollments WHERE student_id = ? ORDER BY enroll_datetime DESC`,
    [student_id]
  );
};

export const getServiceEnrollment = (service_enrollment_id: number): any[] => {
  return db.getAllSync(
    `SELECT * FROM service_enrollments WHERE service_enrollment_id = ?`,
    [service_enrollment_id]
  );
};


//
// ──────────────────────────────────────────────────────────────
//  Chat Local Storage
// ──────────────────────────────────────────────────────────────
//

// Insert or update a chat room
export const upsertChatRoom = (room: any) => {
  const safeRoomName = room.room_name ?? "";
  const safeLastMessage = room.last_message ?? "";
  const safeLastTime = room.last_time ?? "";
  const safeUnread = room.unread_count ?? 0;

  const existing = db.getFirstSync(
    "SELECT chat_room_id FROM chat_rooms WHERE chat_room_id = ?",
    [room.chat_room_id]
  );

  if (existing) {
    db.runSync(
      `UPDATE chat_rooms SET
        room_name = ?, last_message = ?, last_time = ?, unread_count = ?
       WHERE chat_room_id = ?`,
      [
        safeRoomName,
        safeLastMessage,
        safeLastTime,
        safeUnread,
        room.chat_room_id,
      ]
    );
  } else {
    db.runSync(
      `INSERT INTO chat_rooms (
        chat_room_id, room_name, last_message, last_time, unread_count
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        room.chat_room_id,
        safeRoomName,
        safeLastMessage,
        safeLastTime,
        safeUnread,
      ]
    );
  }
};


export const getAllChatRooms = (user_id: number): ChatRoom[] => {
    return db.getAllSync(
    `
    SELECT r.*
    FROM chat_rooms r
    JOIN chat_members m
      ON r.chat_room_id = m.chat_room_id
    WHERE m.user_id = ?
    ORDER BY r.last_time DESC
    `,
    [user_id]
  ) as ChatRoom[];
};

export const getChatRoomById = (chat_room_id: number): ChatRoom | null => {
  return db.getFirstSync(
    "SELECT * FROM chat_rooms WHERE chat_room_id = ?",
    [chat_room_id]
  ) as ChatRoom | null;
};

// Insert or update a message
export const upsertMessage = (msg: any) => {
  const existing = db.getFirstSync(
    "SELECT message_id FROM chat_messages WHERE message_id = ?",
    [msg.message_id]
  );

  if (existing) {
    db.runSync(
      `UPDATE chat_messages SET 
        chat_room_id = ?, sender_id = ?, content = ?, 
        send_datetime = ?, read_by = ?
       WHERE message_id = ?`,
      [
        msg.chat_room_id,
        msg.sender_id,
        msg.content,
        msg.send_datetime,
        msg.read_by || "[]",
        msg.message_id,
      ]
    );
  } else {
    db.runSync(
      `INSERT INTO chat_messages (
        message_id, chat_room_id, sender_id, content,
        send_datetime, read_by
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        msg.message_id,
        msg.chat_room_id,
        msg.sender_id,
        msg.content,
        msg.send_datetime,
        msg.read_by || "[]",
      ]
    );
  }
};

export const upsertChatMember = (room_id: number, user_id: number) => {
  db.runSync(
    `INSERT OR IGNORE INTO chat_members (chat_room_id, user_id)
     VALUES (?, ?)`,
    [room_id, user_id]
  );
};

export const upsertChatMembers = (chat_room_id: number, members: number[]) => {
  if (!Array.isArray(members)) return;

  members.forEach(user_id => {
    db.runSync(
      `INSERT OR IGNORE INTO chat_members (chat_room_id, user_id)
       VALUES (?, ?)`,
      [chat_room_id, user_id]
    );
  });
};


export const getMessagesByRoom = (chat_room_id: number) => {
  return db.getAllSync(
    `SELECT * FROM chat_messages 
     WHERE chat_room_id = ? 
     ORDER BY send_datetime ASC`,
    [chat_room_id]
  );
};

// Delete old messages (optional sync cleanup)
export const clearMessagesByRoom = (chat_room_id: number) => {
  db.runSync(`DELETE FROM chat_messages WHERE chat_room_id = ?`, [
    chat_room_id,
  ]);
};




//
// ──────────────────────────────────────────────────────────────────────────────
//  同步日志
// ──────────────────────────────────────────────────────────────────────────────
//

export const getLastSyncTime = (key: string): string | null => {
  const result = db.getFirstSync<{ last_sync: string }>(
    "SELECT last_sync FROM sync_log WHERE key = ?",
    [key]
  );
  return result?.last_sync || null;
};

export const updateSyncTime = (key: string, timestamp: string) => {
  db.runSync(
    `INSERT OR REPLACE INTO sync_log (key, last_sync)
     VALUES (?, ?)`,
    [key, timestamp]
  );
};


