import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from "react-native";
import { Card, Menu, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import DateTimePicker from "@react-native-community/datetimepicker";
import moment from "moment";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";

import {
  getAllStudents,
  getTimetableByStudent,
} from "../database/localDB";
import { syncStudentTimetables, syncOneStudentTimetable } from "../hooks/useTimetableSync";

import AsyncStorage from "@react-native-async-storage/async-storage";
import WeekSelector from "../components/WeekSelector";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TimetableScreen() {
  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [menuVisible, setMenuVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState(moment());
  const [weekDays, setWeekDays] = useState<moment.Moment[]>([]);

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // -----------------------------
  //    LOAD STUDENTS & TIMETABLE
  // -----------------------------

  useEffect(() => {
    const init = async () => {
      await syncStudentTimetables();
      loadStudents();
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;

    computeWeek(selectedDate);
    loadTimetable(selectedStudent.student_id);
  }, [selectedDate]);



  const loadStudents = async () => {
    const list = getAllStudents();
    const userData = await AsyncStorage.getItem("user");
    const u = JSON.parse(userData || "{}");
    setUser(u);

    const filtered = list.filter((s) => s.parent_id === u.parent_id);
    setStudents(filtered);

    if (filtered.length === 0) {
      setLoading(false);
      return;
    }

    setSelectedStudent(filtered[0]);
    loadTimetable(filtered[0].student_id);
  };


  const loadTimetable = (student_id: number) => {
    setLoading(true);
    const all = getTimetableByStudent(student_id);

    const filtered = all.filter(c =>
      moment(c.start_time).isSame(selectedDate, "day")
    );

    setClasses(filtered);
    setLoading(false);
    computeWeek(selectedDate);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (selectedStudent) {
        loadTimetable(selectedStudent.student_id);
      }
    }, [selectedStudent])
  );


  const computeWeek = (date: moment.Moment) => {
    const start = date.clone().startOf("week").add(1, "day");
    setWeekDays([...Array(7)].map((_, i) => start.clone().add(i, "day")));
  };

  const handleSelectDay = (day: moment.Moment) => {
    setSelectedDate(day);
    if (selectedStudent) {
      const all = getTimetableByStudent(selectedStudent.student_id);
      const targetWeekday = day.weekday();
      const filtered = all.filter((c) => {
        const dbWeekday = parseInt(c.day_of_week, 10);
        const mapped = dbWeekday === 7 ? 0 : dbWeekday;
        return mapped === targetWeekday;
      });
      setClasses(filtered);
    }
  };

  const goToToday = () => {
    const today = moment();
    setSelectedDate(today);
    computeWeek(today);

    if (selectedStudent) {
      loadTimetable(selectedStudent.student_id);
    }
  };

  const classDays = selectedStudent
    ? getTimetableByStudent(selectedStudent.student_id)
      .map((c) => moment(c.start_time).format("YYYY-MM-DD"))
    : [];


  const getStatusInfo = (statusCode: string) => {
    switch (statusCode) {
      case "0":
        return { label: "Canceled", bg: "#F8D7DA", color: "#B00020" };
      case "1":
        return { label: "Scheduled", bg: "#D9EFFF", color: "#0A84FF" };
      case "2":
        return { label: "Ongoing", bg: "#DFF3E3", color: "#2E7D32" };
      case "3":
        return { label: "Finished", bg: "#EEEEEE", color: "#6F6F6F" };
      default:
        return { label: "Unknown", bg: "#F4F4F4", color: "#999" };
    }
  };

  const getAttendanceInfo = (att: string) => {
    switch (att) {
      case "attended":
        return { label: "Attended", bg: "#DFF3E3", color: "#2E7D32" };
      case "absent":
        return { label: "Absent", bg: "#F8D7DA", color: "#B00020" };
      default:
        return null; // "" or null → 不显示
    }
  };

  // ==================================
  //      UI STARTS HERE (UPDATED)
  // ==================================

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={async () => {
            if (selectedStudent?.student_id) {
              const ok = await syncOneStudentTimetable(selectedStudent.student_id);
              console.log("Sync result:", ok);
              loadTimetable(selectedStudent.student_id);
            }
          }}

          tintColor="#0078D4"
          colors={["#0078D4"]}
        />
      }
    >

      {/* ============================== */}
      {/*     ENROLL NEW CLASS BUTTON     */}
      {/* ============================== */}
      <TouchableOpacity
        style={[
          styles.enrollBtn,
          students.length === 0 && { backgroundColor: "#A0A6AC" }  // 灰色
        ]}
        disabled={students.length === 0}
        onPress={() =>
          navigation.navigate("EnrollNewClass", { student: selectedStudent })
        }
      >

        <MaterialCommunityIcons
          name="plus"
          size={20}
          color="#fff"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.enrollText}>Enroll New Class</Text>

        <MaterialCommunityIcons
          name="chevron-right"
          size={26}
          color="#fff"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>


      {/* ============================== */}
      {/*         CHILD FILTER            */}
      {/* ============================== */}
      <Text style={styles.label}>Select Child to View:</Text>

      <View style={styles.childFilterRow}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.childSelector}
              onPress={() => setMenuVisible(true)}
            >
              <MaterialCommunityIcons
                name="account-child"
                size={20}
                color="#555"
                style={{ marginRight: 6 }}
              />

              <Text style={styles.childText}>
                {selectedStudent ? selectedStudent.name : "Select Student"}
              </Text>

              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#555"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>

          }
        >
          {students.map((s) => (
            <Menu.Item
              key={s.student_id}
              onPress={() => {
                setMenuVisible(false);
                setSelectedStudent(s);
                loadTimetable(s.student_id);
              }}
              title={s.name}
            />
          ))}
        </Menu>
      </View>

      {/* ============================== */}
      {/*       DATE HEADER + TODAY       */}
      {/* ============================== */}
      <View style={styles.dateHeaderRow}>
        <Text style={styles.dateHeaderText}>
          {selectedDate.format("dddd - DD/MM/YYYY")}
        </Text>

        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons
            name="calendar"
            size={26}
            color="#444"
          />

        </TouchableOpacity>

        <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
          <Text style={styles.todayBtnText}>TODAY</Text>
        </TouchableOpacity>
      </View>
      {/* Week Row */}
      <WeekSelector
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDay={handleSelectDay}
        classDays={classDays}
      />

      {students.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <Text style={{ fontSize: 18, color: "#666", marginBottom: 16 }}>
            No child yet
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#0A84FF",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
            onPress={() =>
              navigation.navigate("AddStudent", { parent_id: user?.parent_id })
            }
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Add Child
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : classes.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#777" }}>No classes on this day.</Text>
        </View>
      ) : (

        classes.map((cls, index) => {
          const status = getStatusInfo(cls.status); // <-- HERE

          return (
            <View key={index} style={styles.classRow}>

              {/* Left timeline */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{moment(cls.start_time).format("HH:mm")}</Text>
                <Text style={styles.timeDash}>—</Text>
                <Text style={styles.timeText}>{moment(cls.end_time).format("HH:mm")}</Text>
              </View>

              {/* Right class card */}
              <Card style={styles.classCard} mode="elevated">
                <Card.Content>

                  <View style={styles.classContentRow}>

                    {/* Left side text */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classTitle}>{cls.subject_name}</Text>
                      <Text style={styles.classInfo}>Tutor: {cls.tutor_name}</Text>
                      <Text style={styles.classInfo}>Room: {cls.room_name}</Text>
                    </View>

                    {/* RIGHT — STATUS TAG */}
                    {/* RIGHT — STATUS TAGS (status + attendance) */}
                    <View style={{ flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      {/* Attendance tag — 只有当 attendance_status 不为空 */}
                      {getAttendanceInfo(cls.attendance_status) && (
                        <View style={[
                          styles.statusTag,
                          { backgroundColor: getAttendanceInfo(cls.attendance_status)!.bg }
                        ]}>
                          <Text
                            style={[
                              styles.statusText,
                              { color: getAttendanceInfo(cls.attendance_status)!.color }
                            ]}
                          >
                            {getAttendanceInfo(cls.attendance_status)!.label}
                          </Text>
                        </View>
                      )}

                      {/* 主 status tag */}
                      <View style={[
                        styles.statusTag,
                        { backgroundColor: status.bg }
                      ]}>
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>


                    </View>


                  </View>
                </Card.Content>
              </Card>

            </View>
          );
        })



      )
      }

      {/* Date Picker */}
      {
        showDatePicker && (
          <DateTimePicker
            value={selectedDate.toDate()}
            mode="date"
            display="calendar"
            onChange={(event, chosenDate) => {
              setShowDatePicker(false);

              if (chosenDate) {
                const newDate = moment(chosenDate);
                setSelectedDate(newDate);
                computeWeek(newDate);

                if (selectedStudent) {
                  loadTimetable(selectedStudent.student_id);
                }
              }

            }}
          />
        )
      }


    </ScrollView>
  );
}

//
// Styles
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    paddingTop: 10,
  },

  sectionTitle: {
    marginLeft: 16,
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },

  classRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  timeColumn: {
    width: "28%",
    alignItems: "flex-end",
    paddingRight: 10,
    justifyContent: "center",
  },

  timeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  timeDash: {
    color: "#333",
    marginVertical: -3,
  },

  classCard: {
    width: "72%",
    borderRadius: 12,
  },

  classTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  classInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  halfWidth: {
    width: "50%",
  },

  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  enrollText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  label: {
    marginLeft: 16,
    marginBottom: 4,
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },

  childFilterRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  childSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    width: "50%",
  },

  childText: {
    fontSize: 15,
    color: "#333",
  },

  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },

  dateHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    flex: 1,
  },

  todayBtn: {
    backgroundColor: "#E5EAF0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  todayBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0078D4",
  },
  classContentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  statusTag: {
    backgroundColor: "#E8EEF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-end", // push to bottom-right
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
