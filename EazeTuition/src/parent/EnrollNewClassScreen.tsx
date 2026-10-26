import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import moment from "moment";
import { Dropdown } from "react-native-element-dropdown";

import { getAllStudents, clearTimetableByStudent, upsertTimetable } from "../database/localDB";
import { API_BASE_URL } from "../config";
import { parentDropdownStyles, parentSelectStyles, parentDividerStyles, parentCheckboxStyles } from "../styles/parentStyles";
import SelectableCard from "../components/SelectableCard";
import { StatusTag } from "../components/StatusTag";
import SweetAlertModal from "../components/SweetAlertModel";
import { useEnrollment } from "../hooks/useEnrollment";
import { useStripePayment } from "../hooks/useStripePayment";
import { useSweetAlert } from "../hooks/useSweetAlert";
import { syncOneStudentTimetable } from "../hooks/useTimetableSync";
import { syncLatestPayment } from "../hooks/useLocalSyncHelper";
import LoadingOverlay from "../components/LoadingOverlay";

interface StripeSheetData {
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
}

interface EduLevel {
  edu_lvl_id: number;
  name: string;
}

interface PackageClassDetail {
  class_detail_id: number;
  set_id: number;
  subject_id: number;
  subject_name: string;

  day_of_week: string;
  start_time: string | null;
  end_time: string | null;

  tutor_id: number | null;
  tutor_name: string | null;

  room_id: number | null;
  room_name: string | null;
  max_capacity: number;

  normal_class_fee: number;
  focus_class_fee: number;
  material_fee: number;

  class_type: string; // N / F
  duration: number;
  time_per_week: number;

  is_enrolled: boolean;
}

interface PackageSet {
  set_id: number;
  set_name: string;
  created_at: string;
  classes: PackageClassDetail[];
}

interface SchedulePackage {
  package_id: number;
  name: string;
  intake_year: string;
  edu_lvl_id: number;
  is_open_for_enrollment: boolean;
  sets: PackageSet[];
}

export default function EnrollNewClassScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { student } = route.params as { student: any }; // from timetable

  const currentYear = moment().year();
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(false);
  const [isCheckoutExpanded, setIsCheckoutExpanded] = useState(false);

  const [intakeYear, setIntakeYear] = useState<string | null>(String(currentYear));
  const [selectedChild, setSelectedChild] = useState(student);
  const [allChildren, setAllChildren] = useState<any[]>([]);
  const [educationLevels, setEducationLevels] = useState<EduLevel[]>([]);
  const [selectedEduLvl, setSelectedEduLvl] = useState<number>(student.edu_lvl_id);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  const [discountMetrics, setDiscountMetrics] = useState<
    { num_of_enrolment: number; discount_amt: number }[]
  >([]);

  const [discountAmt, setDiscountAmt] = useState(0);
  const [finalFee, setFinalFee] = useState(0);

  const [availablePackages, setAvailablePackages] = useState<SchedulePackage[]>([]);
  const [conflictedClassIds, setConflictedClassIds] = useState<number[]>([]);

  const [totalFee, setTotalFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const { alert, showAlert, hideAlert } = useSweetAlert();
  const { createEnrollment, createStripePaymentSheet } = useEnrollment();
  const { payWithStripe } = useStripePayment();

  const paymentOptions = [
    "Credit/Debit Card (Stripe)",
  ];

  const [expandedSet, setExpandedSet] = useState<number | null>(null);
  const [selectedSets, setSelectedSets] = useState<number[]>([]);  // store selected set_id
  const [expandedPackage, setExpandedPackage] = useState<number | null>(null);
  const isCheckoutDisabled = selectedClasses.length === 0 || !paymentMethod;
  const isDropdownDisabled = selectedClasses.length === 0;



  const dayName: Record<string, string> = {
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "7": "Sunday",
  };

  const resetSelections = () => {
    setSelectedClasses([]);
    setSelectedSets([]);
    setConflictedClassIds([]);
    setTotalFee(0);
  };

  const showErrorModal = (msg: string) => {
    showAlert({
      type: "error",
      title: "Error",
      message: msg,
      onConfirm: hideAlert
    });

  };


  // -----------------------------
  //   DATA LOAD
  // -----------------------------
  useEffect(() => {
    loadDiscountMetrics();
  }, []);

  const loadDiscountMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/class/discount/metrics`);

      const data: { num_of_enrolment: number; discount_amt: number }[] = await res.json();

      // 按 enrolment asc 排序
      data.sort((a, b) => a.num_of_enrolment - b.num_of_enrolment);

      setDiscountMetrics(data);
    } catch (e) {
      console.log("❌ Failed to load discount metrics", e);
    }
  };


  useEffect(() => {
    loadChildren();
    loadEducationLevels();
  }, []);

  useEffect(() => {
    if (selectedEduLvl !== null && intakeYear !== null) {
      loadSchedulePackages();
    }
  }, [selectedEduLvl, intakeYear]);

  useEffect(() => {
    const newSelectedSets: number[] = [];

    availablePackages.forEach(pkg => {
      pkg.sets.forEach(set => {
        const classIds = set.classes.map(c => c.class_detail_id);

        // 如果所有 classId 都在 selectedClasses 内
        const allSelected = classIds.every(id => selectedClasses.includes(id));

        if (allSelected && classIds.length > 0) {
          newSelectedSets.push(set.set_id);
        }
      });
    });

    setSelectedSets(newSelectedSets);
  }, [selectedClasses, availablePackages]);

  useEffect(() => {
    if (allChildren.length > 0) {
      const match = allChildren.find(c => c.student_id === student.student_id);

      if (match) {
        setSelectedChild(match);
        setSelectedEduLvl(match.edu_lvl_id);
      }
    }
  }, [allChildren]);

  const loadChildren = async () => {
    const children = getAllStudents(); // local DB
    setAllChildren(children);
  };

  const loadEducationLevels = async () => {
    const res = await fetch(`${API_BASE_URL}/education/active`);
    const data = await res.json();
    setEducationLevels(data);
  };

  const loadSchedulePackages = async () => {
    const res = await fetch(
      `${API_BASE_URL}/schedule_package/available?edu_lvl_id=${selectedEduLvl}&intake_year=${intakeYear}&student_id=${selectedChild.student_id}`
    );

    let data: SchedulePackage[] = await res.json();

    data = data.map((pkg) => ({
      ...pkg,
      sets: pkg.sets.map((set) => ({
        ...set,
        classes: set.classes.map((cls) => ({
          ...cls,
          is_enrolled: Boolean(cls.is_enrolled)
        })),
      })),
    }));

    setAvailablePackages(data);
    setExpandedPackage(data[0]?.package_id ?? null);
    setExpandedSet(data[0]?.package_id ?? null);
  };

  const getClassStatus = (cls: PackageClassDetail) => {
    if (cls.is_enrolled) return "enrolled";
    if (conflictedClassIds.includes(cls.class_detail_id)) return "conflicted";
    return "available";
  };

  const isTimeConflict = (a: PackageClassDetail, b: PackageClassDetail) => {
    if (a.day_of_week !== b.day_of_week) return false;

    const startA = moment(a.start_time, "HH:mm");
    const endA = moment(a.end_time, "HH:mm");
    const startB = moment(b.start_time, "HH:mm");
    const endB = moment(b.end_time, "HH:mm");

    return startA.isBefore(endB) && startB.isBefore(endA);
  };

  const recalcState = (updatedClassIds: number[]) => {
    const allClasses: PackageClassDetail[] =
      availablePackages.flatMap(pkg =>
        pkg.sets.flatMap(set => set.classes)
      );

    // ---- Conflict detection ----
    const newConflicts = new Set<number>();

    updatedClassIds.forEach(selId => {
      const selectedClass = allClasses.find(c => c.class_detail_id === selId);
      if (!selectedClass) return;

      allClasses.forEach(cls => {
        if (cls.class_detail_id === selectedClass.class_detail_id) return;
        if (cls.is_enrolled) return;
        if (isTimeConflict(selectedClass, cls)) {
          newConflicts.add(cls.class_detail_id);
        }
      });
    });

    setConflictedClassIds([...newConflicts]);

    // ---- Fee calculation ----
    let total = 0;
    updatedClassIds.forEach(id => {
      const cls = allClasses.find(c => c.class_detail_id === id);
      if (!cls) return;

      const fee = cls.class_type === "F"
        ? cls.focus_class_fee
        : cls.normal_class_fee;

      total += fee + cls.material_fee;
    });

    // ------- NEW: discount -------
    let discount = 0;

    if (discountMetrics.length > 0) {
      const classCount = updatedClassIds.length;

      // 找 num_of_enrolment ≤ classCount 的最大 discount
      let matched = discountMetrics
        .filter(m => m.num_of_enrolment <= classCount)
        .sort((a, b) => b.num_of_enrolment - a.num_of_enrolment)[0];

      discount = matched ? matched.discount_amt : 0;
    }

    setDiscountAmt(discount);
    setTotalFee(total);
    setFinalFee(Math.max(0, total - discount));

  };

  const intakeYears = Array.from({ length: 5 }).map((_, i) =>
    String(moment().year() + i)
  );

  const submitEnrollment = async () => {
    setProcessingCheckout(true);
    setLoadingOverlayVisible(true);

    const classPairs = selectedClasses.map(id => {
      const setId = availablePackages
        .flatMap(pkg => pkg.sets)
        .flatMap(set => set.classes)
        .find(c => c.class_detail_id === id)?.set_id;

      return { class_detail_id: id, set_id: setId };
    });

    // 1️⃣ create enrollment (creates payment)
    const enrollRes = await createEnrollment(
      selectedChild.student_id,
      selectedEduLvl,
      intakeYear!,
      classPairs
    );

    if ("error" in enrollRes) {
      setLoadingOverlayVisible(false);
      setProcessingCheckout(false);
      showErrorModal(enrollRes.error);
      return;
    }

    const paymentId = enrollRes.paymentId;

    // 2️⃣ create payment sheet
    const sheetRes = await createStripePaymentSheet(paymentId);

    if ("error" in sheetRes) {
      setLoadingOverlayVisible(false);
      setProcessingCheckout(false);
      showErrorModal(sheetRes.error);
      return;
    }

    setLoadingOverlayVisible(false);
    setProcessingCheckout(false);

    // 3️⃣ go into payment sheet
    presentPaymentSheet(sheetRes, paymentId);
  };



  const presentPaymentSheet = async (stripeData: StripeSheetData, paymentId: number) => {
    setLoadingOverlayVisible(true);

    const result = await payWithStripe(stripeData);

    setLoadingOverlayVisible(false);

    // ----------- 用户取消，不问，不重复，不绕 -----------  
    if ("cancelled" in result && result.cancelled) {

      setLoadingOverlayVisible(true);

      try {
        const res = await fetch(`${API_BASE_URL}/payment/delete-pending/${paymentId}`, {
          method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
          console.log("❌ Delete payment failed:", data);
        }
      } catch (err) {
        console.log("❌ API error:", err);
      }

      setLoadingOverlayVisible(false);

      showAlert({
        type: "warning",
        title: "Payment Cancelled",
        message: "Your payment has been cancelled.",
        onlyConfirm: true,     // ⭐ Activate single-button mode
        onConfirm: hideAlert,
      });

      return;
    }

    // ----------- 失败 -----------  
    if ("error" in result) {
      showErrorModal(result.error || "Unknown payment error.");
      return;
    }

    // ----------- 成功 -----------  
    setLoadingOverlayVisible(true);

    await refreshTimetable();
    await syncLatestPayment(selectedChild.parent_id);

    setLoadingOverlayVisible(false);

    showAlert({
      type: "success",
      title: "Success",
      message: "Enrollment completed!",
      onConfirm: () => {
        hideAlert();
        navigation.goBack();
      }
    });
  };


  const refreshTimetable = async () => {
    try {
      await syncOneStudentTimetable(selectedChild.student_id);
      console.log("📌 Timetable synced locally.");
    } catch (err) {
      console.log("❌ Failed to refresh timetable:", err);
    }
  };



  // -----------------------------
  //   UI
  // -----------------------------
  const toggle = (classId: number) => {
    setSelectedClasses(prev => {
      const updated = prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId];

      recalcState(updated);
      return updated;
    });
  };


  const toggleSet = (set: PackageSet) => {
    setSelectedClasses(prev => {
      const selectableClasses = set.classes
        .filter(c => !c.is_enrolled && !conflictedClassIds.includes(c.class_detail_id))
        .map(c => c.class_detail_id);

      if (selectableClasses.length === 0) {
        return prev; // don't do anything
      }

      const allSelected = selectableClasses.every(id => prev.includes(id));

      let updated;
      if (allSelected) {

        updated = prev.filter(id => !selectableClasses.includes(id));
      } else {

        updated = Array.from(new Set([...prev, ...selectableClasses]));
      }

      recalcState(updated);
      return updated;
    });
  };




  return (
    <View style={styles.container}>
      {/* ===== Intake Year + Child (50/50 in one row) ===== */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>

        {/* Intake Year (Left 50%) */}
        <View style={{ width: "48%" }}>
          <Text style={parentSelectStyles.label}>Intake Year</Text>

          <Dropdown
            style={parentDropdownStyles.dropdown}
            placeholderStyle={parentDropdownStyles.placeholder}
            selectedTextStyle={parentDropdownStyles.selectedText}
            iconStyle={parentDropdownStyles.icon}
            containerStyle={parentDropdownStyles.container}
            itemTextStyle={parentDropdownStyles.itemText}

            data={intakeYears.map(y => ({ label: y, value: y }))}
            labelField="label"
            valueField="value"
            placeholder="Select Intake Year"
            value={intakeYear}
            onChange={item => {
              resetSelections();
              setIntakeYear(item.value);
            }}
          />
        </View>

        {/* Select Child (Right 50%) */}
        <View style={{ width: "48%" }}>
          <Text style={parentSelectStyles.label}>Select Child</Text>

          <Dropdown
            style={parentDropdownStyles.dropdown}
            placeholderStyle={parentDropdownStyles.placeholder}
            selectedTextStyle={parentDropdownStyles.selectedText}
            iconStyle={parentDropdownStyles.icon}
            containerStyle={parentDropdownStyles.container}
            itemTextStyle={parentDropdownStyles.itemText}

            data={allChildren.map(c => ({
              label: c.name,
              value: c.student_id,
            }))}

            labelField="label"
            valueField="value"

            placeholder="Select Child"
            value={selectedChild.student_id}
            onChange={item => {
              const found = allChildren.find(c => c.student_id === item.value);
              if (found) {
                setSelectedChild(found);
                setSelectedEduLvl(found.edu_lvl_id);
                setIntakeYear(String(currentYear));
              }
            }}
          />
        </View>
      </View>


      {/* ===== Education Level ===== */}
      <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
        <Text style={parentSelectStyles.label}>Education Level</Text>

        <Dropdown
          style={parentDropdownStyles.dropdown}
          placeholderStyle={parentDropdownStyles.placeholder}
          selectedTextStyle={parentDropdownStyles.selectedText}
          iconStyle={parentDropdownStyles.icon}
          containerStyle={parentDropdownStyles.container}
          itemTextStyle={parentDropdownStyles.itemText}
          renderLeftIcon={() => (
            <MaterialCommunityIcons
              name="school"
              size={20}
              color="#555"
              style={{ marginRight: 6 }}
            />
          )}

          data={educationLevels.map(lvl => ({
            label: lvl.name,
            value: lvl.edu_lvl_id,
          }))}

          labelField="label"
          valueField="value"

          placeholder="Select Education Level"
          value={selectedEduLvl}

          onChange={item => {
            resetSelections();
            setSelectedEduLvl(item.value);
          }}

        />
      </View>

      <View style={parentDividerStyles.dashedDivider} />

      {/* ===== Package 列表保持你之前的卡片风格 ===== */}
      <Text style={styles.sectionLabel}>Available Packages</Text>
      <ScrollView style={{ marginTop: 8 }}>
        {availablePackages.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="calendar-remove" size={40} color="#999" />
            <Text style={styles.emptyText}>No Class for this Education Level</Text>
          </View>
        ) : (availablePackages.map((pkg: SchedulePackage) => {
          const isPkgExpanded = expandedPackage === pkg.package_id;

          return (
            <View key={pkg.package_id} style={{ marginBottom: 12 }}>

              {/* PACKAGE HEADER (Row Only) */}
              <TouchableOpacity
                style={styles.pkgRow}
                onPress={() =>
                  setExpandedPackage(isPkgExpanded ? null : pkg.package_id)
                }
              >
                <Text style={styles.pkgRowTitle}>{pkg.name}</Text>

                <MaterialCommunityIcons
                  name={isPkgExpanded ? "chevron-up" : "chevron-down"}
                  size={26}
                  color="#555"
                />
              </TouchableOpacity>

              {/* PACKAGE CONTENT (Expandable) */}
              {isPkgExpanded && (
                <View style={styles.pkgExpandPanel}>
                  {pkg.sets.map((set: PackageSet) => {
                    const selectable = set.classes
                      .filter(c => !c.is_enrolled && !conflictedClassIds.includes(c.class_detail_id))
                      .map(c => c.class_detail_id);

                    const isSetSelected =
                      selectable.length > 0 &&
                      selectable.every(id => selectedClasses.includes(id));

                    const isExpanded = expandedSet === set.set_id;
                    const isSetDisabled = selectable.length === 0;

                    return (
                      <View key={set.set_id} style={styles.setWrapper}>

                        {/* Set Header */}
                        <TouchableOpacity
                          style={styles.setHeader}
                          onPress={() =>
                            setExpandedSet(isExpanded ? null : set.set_id)
                          }
                        >
                          <TouchableOpacity
                            onPress={() => {
                              if (!isSetDisabled) toggleSet(set);
                            }}
                            style={[
                              parentCheckboxStyles.box,
                              isSetDisabled && parentCheckboxStyles.disabledBox,
                              isSetSelected && !isSetDisabled && parentCheckboxStyles.selectedBox,
                            ]}
                            activeOpacity={isSetDisabled ? 1 : 0.7} // 禁止动画
                          >
                            {isSetSelected && !isSetDisabled && <View style={parentCheckboxStyles.tick} />}
                          </TouchableOpacity>


                          <View style={{ flex: 1 }}>
                            <Text style={styles.setTitle}>{set.set_name}</Text>
                            <Text style={styles.setCount}>
                              {set.classes.length} classes
                            </Text>
                          </View>

                          <MaterialCommunityIcons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={26}
                            color="#555"
                          />
                        </TouchableOpacity>

                        {/* Set Content */}
                        {isExpanded && (
                          <View style={styles.expandPanel}>
                            {set.classes.map((cls: PackageClassDetail) => {
                              const isDisabled =
                                cls.is_enrolled || conflictedClassIds.includes(cls.class_detail_id);

                              const status = getClassStatus(cls);

                              let statusTag = null;

                              if (status === "enrolled") {
                                statusTag = (
                                  <StatusTag
                                    label="Enrolled"
                                    bg="#DFF3E3"
                                    color="#2E7D32"
                                  />
                                );
                              } else if (status === "conflicted") {
                                statusTag = (
                                  <StatusTag
                                    label="Conflicted"
                                    bg="#F8D7DA"
                                    color="#B00020"
                                  />
                                );
                              }

                              return (
                                <SelectableCard
                                  key={cls.class_detail_id}
                                  disabled={isDisabled}
                                  selected={status === "available" && selectedClasses.includes(cls.class_detail_id)}
                                  onToggle={() => toggle(cls.class_detail_id)}
                                  fee={cls.class_type === "F" ? cls.focus_class_fee : cls.normal_class_fee}
                                  statusTag={statusTag}
                                >
                                  <Text style={{ fontSize: 16, fontWeight: "600" }}>
                                    {cls.subject_name} (
                                    {cls.class_type === "F" ? "Focus" : "Normal"})
                                  </Text>

                                  <Text style={{ fontSize: 13, color: "#666" }}>
                                    Teacher: {cls.tutor_name}
                                  </Text>

                                  <Text style={{ fontSize: 13, color: "#666" }}>
                                    Time: {dayName[cls.day_of_week]} {cls.start_time} - {cls.end_time}
                                  </Text>

                                  <Text style={{ fontSize: 13, color: "#666" }}>
                                    Material Fee: RM {cls.material_fee}
                                  </Text>

                                </SelectableCard>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {/* ===========================
       MINI MODE（未展开）
     =========================== */}
        {!isCheckoutExpanded && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>

            {/* 左边：Small price summary */}
            <View>
              {/* 原价 (划线) */}
              {totalFee > 0 && (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#888",
                    textDecorationLine: discountAmt > 0 ? "line-through" : "none",
                  }}
                >
                  RM {totalFee.toFixed(2)}
                </Text>
              )}

              {/* 折扣 */}
              {discountAmt > 0 && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#D32F2F",
                  }}
                >
                  - RM {discountAmt.toFixed(2)} OFF
                </Text>
              )}

              {/* Final price */}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#2E7D32",
                }}
              >
                RM {finalFee.toFixed(2)}
              </Text>
            </View>

            {/* 右边：Mini Checkout 按钮 */}
            <TouchableOpacity
              style={{
                backgroundColor: selectedClasses.length === 0 ? "#ccc" : "#0077E6",
                paddingVertical: 10,
                paddingHorizontal: 22,
                borderRadius: 10,
              }}
              disabled={selectedClasses.length === 0}
              onPress={() => setIsCheckoutExpanded(true)}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Checkout
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===========================
       EXPANDED MODE（展开）
     =========================== */}
        {isCheckoutExpanded && (
          <>
            {/* Full Price Summary */}
            <View style={{ marginBottom: 12 }}>
              {totalFee > 0 && (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#888",
                    textDecorationLine: discountAmt > 0 ? "line-through" : "none",
                  }}
                >
                  RM {totalFee.toFixed(2)}
                </Text>
              )}

              {discountAmt > 0 && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#D32F2F",
                  }}
                >
                  - RM {discountAmt.toFixed(2)} OFF
                </Text>
              )}

              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#2E7D32",
                  marginTop: 4,
                }}
              >
                RM {finalFee.toFixed(2)}
              </Text>
            </View>

            {/* Payment method dropdown */}
            <Text style={styles.paymentLabel}>Select Payment Method</Text>

            <Dropdown
              style={[
                parentDropdownStyles.dropdown,
                { height: 60, marginBottom: 20 },
                selectedClasses.length === 0 && { opacity: 0.4 },
              ]}
              placeholderStyle={parentDropdownStyles.placeholder}
              selectedTextStyle={parentDropdownStyles.selectedText}
              iconStyle={parentDropdownStyles.icon}
              containerStyle={[parentDropdownStyles.container, { marginTop: 6 }]}
              itemTextStyle={parentDropdownStyles.itemText}
              data={paymentOptions.map(method => ({ label: method, value: method }))}
              labelField="label"
              valueField="value"
              placeholder="Select Payment Method"
              value={paymentMethod}
              onChange={item => setPaymentMethod(item.value)}
              disable={selectedClasses.length === 0}
            />

            {/* Checkout Now button */}
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (isCheckoutDisabled || processingCheckout) && { backgroundColor: "#ccc" },
              ]}
              disabled={isCheckoutDisabled || processingCheckout}
              onPress={() => {
                if (!isCheckoutDisabled) {
                  showAlert({
                    type: "warning",
                    title: "Confirm Enrollment",
                    message: `Are you sure to enroll ${selectedClasses.length} class(es) for ${selectedChild.name}?`,
                    onConfirm: () => {
                      hideAlert();
                      submitEnrollment();
                    },
                    onCancel: hideAlert,
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.checkoutButtonText,
                  isCheckoutDisabled && { color: "#777" },
                ]}
              >
                Checkout Now
              </Text>
            </TouchableOpacity>

            {/* Collapse button */}
            <TouchableOpacity
              onPress={() => setIsCheckoutExpanded(false)}
              style={{ marginTop: 10, alignItems: "center" }}
            >
              <Text style={{ color: "#0077E6", fontWeight: "600" }}>
                Hide
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>


      <SweetAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
        onlyConfirm={alert.onlyConfirm}
      />

      <LoadingOverlay visible={loadingOverlayVisible} message="Processing..." />


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB", // 跟 timetable 一样的背景
    paddingTop: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 16,
    color: "#222",
  },

  sectionLabel: {
    marginLeft: 16,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  packageCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },

  setBox: {
    backgroundColor: "#F2F6FF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  set_name: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#0A84FF",
  },

  setWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },

  setTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  setCount: {
    fontSize: 13,
    color: "#666",
  },

  expandPanel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#E6EDFF",  // <- 更明显的浅蓝 (接近 RN Paper filled input)
    borderRadius: 10,
  },

  pkgRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    marginHorizontal: 10,
  },

  pkgRowTitle: {
    flex: 1,
    fontSize: 16,        // 小一点的字体
    fontWeight: "600",   // 稍微降低重量
    color: "#444",
  },

  pkgExpandPanel: {
    marginTop: 8,
  },

  bottomBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  totalText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },

  paymentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },

  paymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    backgroundColor: "#fff",
  },

  paymentSelectorText: {
    fontSize: 15,
    color: "#333",
  },

  checkoutButton: {
    backgroundColor: "#0077E6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  checkoutButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
