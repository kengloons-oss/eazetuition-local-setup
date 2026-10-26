// app/screens/ServiceEnrollmentScreen.tsx
import NetInfo from "@react-native-community/netinfo";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";


import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { parentDropdownStyles, parentSelectStyles, parentDividerStyles } from "../styles/parentStyles";
import { API_BASE_URL } from "../config";

import {
  getAllStudents,
  getServiceEnrollmentsByStudent,
  bulkUpsertServiceEnrollments,
} from "../database/localDB";

export default function ServiceEnrollmentScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  //      LOAD STUDENTS
  // -----------------------------

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const localStudents = getAllStudents();
    const userData = await AsyncStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    setUser(user);   // ⭐ 保存到 state

    const filtered = localStudents.filter(s => s.parent_id === user.parent_id);
    setStudents(filtered);

    if (filtered.length > 0) {
      setSelectedStudent(filtered[0]);
      loadServiceEnrollments(filtered[0].student_id);
    }
  };


  // -----------------------------
  //      LOAD SERVICES
  // -----------------------------
  async function syncServiceEnrollment(student_id: number) {
    console.log(student_id);
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      console.log("📴 Offline: using local DB only");
      return getServiceEnrollmentsByStudent(student_id);
    }

    try {
      console.log("🌐 Fetching from backend...");
      const res = await fetch(`${API_BASE_URL}/service/enrollment/mobile/${student_id}`);
      const data = await res.json();

      console.log("📦 Syncing to SQLite:", data.length);

      bulkUpsertServiceEnrollments(data);

      return getServiceEnrollmentsByStudent(student_id);
    } catch (err) {
      console.warn("❌ Backend failed, fallback to local:", err);
      return getServiceEnrollmentsByStudent(student_id);
    }
  }

  useEffect(() => {
    if (!selectedStudent?.student_id) return;
    loadServiceEnrollments(selectedStudent.student_id);
  }, [selectedStudent, selectedStatus]);


  const loadServiceEnrollments = async (student_id: number) => {
    setLoading(true);
    if (!student_id) return;

    const list = await syncServiceEnrollment(student_id);

    let filteredList = list;

    if (selectedStatus === "active") {
      filteredList = filteredList.filter(s => s.status?.toString() === "1");
    } else if (selectedStatus === "inactive") {
      filteredList = filteredList.filter(s => s.status?.toString() === "0");
    }

    setServices(filteredList);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (!selectedStudent?.student_id) return;

      console.log("🔄 ServiceEnrollmentScreen focused → refreshing...");
      loadServiceEnrollments(selectedStudent.student_id);
    }, [selectedStudent?.student_id, selectedStatus])
  );


  const handleRefresh = async () => {
    if (!selectedStudent?.student_id) return;

    console.log("🔄 Pull-to-refresh triggered");

    setLoading(true);

    await loadServiceEnrollments(selectedStudent.student_id);

    setLoading(false);
  };


  type Nav = NativeStackNavigationProp<RootStackParamList>;
  const navigation = useNavigation<Nav>();


  // -----------------------------
  // COMPONENT RENDER
  // -----------------------------
  return (
    <View style={styles.container}>
      {/* ============================== */}
      {/*     ENROLL NEW Service BUTTON     */}
      {/* ============================== */}
      <TouchableOpacity
        style={[
          styles.enrollBtn,
          students.length === 0 && { backgroundColor: "#A0A6AC" }  // 灰色
        ]}
        disabled={students.length === 0}
        onPress={() =>
          navigation.navigate("EnrollNewService", {
            student: selectedStudent,
          })
        }
      >
        <MaterialCommunityIcons
          name="plus"
          size={20}
          color="#fff"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.enrollText}>Enroll New Service</Text>

        <MaterialCommunityIcons
          name="chevron-right"
          size={26}
          color="#fff"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>
        {/* CHILD SELECTOR */}


        <View style={{ width: "48%" }}>
          <Text style={parentSelectStyles.label}>Select Child to View:</Text>
          <Dropdown
            style={parentDropdownStyles.dropdown}
            placeholderStyle={parentDropdownStyles.placeholder}
            selectedTextStyle={parentDropdownStyles.selectedText}
            iconStyle={parentDropdownStyles.icon}
            containerStyle={parentDropdownStyles.container}
            itemTextStyle={parentDropdownStyles.itemText}

            data={students.map(s => ({
              label: s.name,
              value: s.student_id,
            }))}
            labelField="label"
            valueField="value"
            placeholder="Select Student"
            value={selectedStudent?.student_id}
            onChange={item => {
              const found = students.find(s => s.student_id === item.value);
              setSelectedStudent(found || null);
            }}
          />
        </View>
        {/* STATUS FILTER */}
        <View style={{ width: "48%" }}>
          <Text style={parentSelectStyles.label}>Filter By Status:</Text>
          <Dropdown
            style={parentDropdownStyles.dropdown}
            placeholderStyle={parentDropdownStyles.placeholder}
            selectedTextStyle={parentDropdownStyles.selectedText}
            iconStyle={parentDropdownStyles.icon}
            containerStyle={parentDropdownStyles.container}
            itemTextStyle={parentDropdownStyles.itemText}

            data={[
              { label: "All", value: "all" },
              { label: "Active Only", value: "active" },
              { label: "Inactive Only", value: "inactive" },
            ]}
            labelField="label"
            valueField="value"
            placeholder="Select Status"
            value={selectedStatus}
            onChange={item => {
              setSelectedStatus(item.value);
            }}
          />
        </View>
      </View>

      <View style={parentDividerStyles.dashedDivider} />

      {/* SERVICES LIST */}
      {/* Case 1: no child at all */}
      {students.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 60 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 16 }}>
            No child yet
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#0A84FF",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
            onPress={() => navigation.navigate("AddStudent", { parent_id: user.parent_id })}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Add Child
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (

        /* Case 2: loading spinner */
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />

      ) : services.length === 0 ? (

        /* Case 3: child exists but no service */
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={{ fontSize: 16, color: "#777" }}>No services found.</Text>
        </View>

      ) : (
        <ScrollView
          style={{ marginTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => handleRefresh()}
              tintColor="#0078D4"
              colors={["#0078D4"]}
            />
          }>
          {services.map((svc, idx) => {
            const isActive = svc.status?.toString() === "1";

            return (
              <TouchableOpacity
                key={`${svc.service_enrollment_id}`}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate("ServiceEnrollmentDetail", {
                    service_enrollment_id: svc.service_enrollment_id
                  });
                }}
              >
                <Card style={styles.serviceCard} mode="elevated">
                  <Card.Content>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceTitle}>{svc.service_name}</Text>

                        {/* Fee info */}
                        <Text style={styles.serviceInfo}>
                          {svc.fee_type === "1"
                            ? `Monthly Fee: RM ${svc.fee_month}`
                            : `Deposit: RM ${svc.deposit_fee}, Per Attend: RM ${svc.fee_attend}`}
                        </Text>

                        {/* Address (transport type) */}
                        {svc.address ? (
                          <Text style={styles.serviceInfo}>Address: {svc.address}</Text>
                        ) : null}

                        <Text style={styles.serviceInfo}>
                          Enrolled: {svc.enroll_datetime}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: isActive ? "#DFF3E3" : "#F8D7DA" },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isActive ? "#2E7D32" : "#B00020",
                          }}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}


// ------------------------------------------------
// STYLES
// ------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    paddingTop: 10,
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

  statusSelector: {
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

  serviceCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
  },

  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  serviceInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    height: 30,
    justifyContent: "center",
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

});
