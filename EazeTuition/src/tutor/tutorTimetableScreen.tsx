import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl
} from "react-native";
import moment from "moment";
import { Card, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  getTimetableByTutor,
} from "../database/localDB";

import WeekSelector from "../components/WeekSelector";
import { syncOneStudentTimetable } from "../hooks/useTimetableSync";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TutorBottomBar from "./tutorBottomBar";


export default function TutorTimeTableScreen() {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState(moment());
  const [weekDays, setWeekDays] = useState<moment.Moment[]>([]);

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);


  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.tutor_id) return;

    const load = async () => {
      await syncOneStudentTimetable(user.tutor_id);

      computeWeek(selectedDate);
      loadTimetable(user.tutor_id);
    };

    load();
  }, [user, selectedDate]);



  const loadTimetable = (tutor_id: number) => {
    setLoading(true);
    const all = getTimetableByTutor(tutor_id);

    const filtered = all.filter(c =>
      moment(c.start_time).isSame(selectedDate, "day")
    );

    setClasses(filtered);
    setLoading(false);
    computeWeek(selectedDate);
  };

  const computeWeek = (date: moment.Moment) => {
    const start = date.clone().startOf("week").add(1, "day");
    setWeekDays([...Array(7)].map((_, i) => start.clone().add(i, "day")));
  };

  const handleSelectDay = (day: moment.Moment) => {
    setSelectedDate(day);
    if (user) {
      const all = getTimetableByTutor(user.tutor_id);
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

    if (user) {
      loadTimetable(user.tutor_id);
    }
  };

  const classDays = user
    ? getTimetableByTutor(user.tutor_id)
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


  // ==================================
  //      UI STARTS HERE (UPDATED)
  // ==================================

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              console.log("🔄 Pull-to-refresh triggered");
              if (user?.tutor_id) {
                loadTimetable(user.tutor_id);
              }
            }}
            tintColor="#0078D4"
            colors={["#0078D4"]}
          />
        }
      >

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

        {loading ? (
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
                      <View style={[
                        styles.statusTag,
                        { backgroundColor: status.bg }
                      ]}>
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </Text>
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

                  if (user.tutor_id) {
                    loadTimetable(user.tutor_id);
                  }
                }

              }}
            />
          )
        }
      </ScrollView>
      {/* Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0">
        <TutorBottomBar />
      </View>

    </SafeAreaView>

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
