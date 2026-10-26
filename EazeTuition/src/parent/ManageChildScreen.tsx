import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import axios from 'axios';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { API_BASE_URL } from "../config";

interface Student {
  student_id: number;
  name: string;
  age: number;
  edu_lvl_id: number;
  edu_lvl_name: string;
  payment_status: string;
}

interface ProgressResult {
  result_id: number;
  raw_score: number;
  total_questions: number;
  percentage: number;
  level_name: string;
  completed_at: string;
  comment: string;
}

interface HomeworkProgress {
  submission_id: number;
  homework_id: number;
  homework_subject: string;
  grade: number;
  percentage: number;
  status: string;
  comment: string;
  upload_time: string;
  graded_time: string;
  feedback_from_tutor: string | null;
  feedback_from_ai: string | null;
}

interface AttendanceRecord {
  session_id: number;
  attended: number;
  total_classes: number;
  percentage: number;
}

type NavigationProp = any;

export default function ManageChildScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [testResults, setTestResults] = useState<ProgressResult[]>([]);
  const [homeworkResults, setHomeworkResults] = useState<HomeworkProgress[]>([]);
  const [attendanceLabels, setAttendanceLabels] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<number[]>([]);
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceRecord[]>([]);

  const [progressLoading, setProgressLoading] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);
  const [selectedProgressType, setSelectedProgressType] = useState<'test' | 'homework' | 'attendance'>('test');

  // Load parent ID
  useEffect(() => {
    const loadParent = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          const user = JSON.parse(data);
          if (user.type === "parent") setParentId(user.parent_id);
        }
      } catch (err) {
        console.error("Failed to load parent info:", err);
      }
    };
    loadParent();
  }, []);

  // Fetch children
  useEffect(() => {
    if (!parentId) return;

    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/progress/parent/students`, {
          params: { user_id: parentId },
        });
        const fetchedStudents = response.data.students || [];
        setStudents(fetchedStudents);

        if (fetchedStudents.length === 0) {
          Alert.alert(
            "No Students Found",
            "You have no children linked. Please add a student.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("AddStudent", { parent_id: parentId }),
              },
            ]
          );
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [parentId]);

  const processAttendanceData = (
    labels: string[], 
    percentages: number[], 
    details: AttendanceRecord[]
  ) => {
    if (!labels || labels.length === 0) 
      return { labels, percentages, details };

    const total = labels.length;

    // Last 7 items
    const startIndex = Math.max(0, total - 6);

    const slicedLabels = labels.slice(startIndex);
    const slicedPercentages = percentages.slice(startIndex);
    const slicedDetails = details.slice(startIndex);

    const formattedLabels = slicedLabels.map(lbl =>
      dayjs(lbl + "-01").format("MM/YY")
    );

    return {
      labels: formattedLabels,
      percentages: slicedPercentages,
      details: slicedDetails,
    };
  };


  // Fetch student progress
  const fetchProgress = async (student: Student) => {
    setSelectedStudent(student);
    setProgressLoading(true);

    try {
      const [testResp, hwResp, attendanceResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/progress/student/progress`, { params: { student_id: student.student_id } }),
        axios.get(`${API_BASE_URL}/progress/student/homework/progress`, { params: { student_id: student.student_id } }),
        axios.get(`${API_BASE_URL}/progress/student/attendance/progress`, { params: { student_id: student.student_id } }),
      ]);

      setTestResults(testResp.data.progress || []);
      setHomeworkResults(hwResp.data.homework_progress || []);

      // Process attendance for latest 12 months
      const attendanceProcessed = processAttendanceData(
        attendanceResp.data.labels || [],
        attendanceResp.data.percentages || [],
        attendanceResp.data.attendance_list || []
      );

      setAttendanceLabels(attendanceProcessed.labels);
      setAttendanceData(attendanceProcessed.percentages);
      setAttendanceDetails(attendanceProcessed.details);

    } catch (err) {
      console.error(err);
      setTestResults([]);
      setHomeworkResults([]);
      setAttendanceLabels([]);
      setAttendanceData([]);
      setAttendanceDetails([]);
    } finally {
      setProgressLoading(false);
    }
  };

  // Export PDF
  const exportPDF = (type: 'progress' | 'attendance') => {
    if (!selectedStudent) return;
    const url = `${API_BASE_URL}/progress/student/export/${type}-report?student_id=${selectedStudent.student_id}`;
    Linking.openURL(url).catch(err => Alert.alert("Error", "Unable to download report"));
  };

  const renderBarChart = (data: number[], labels: string[], title: string) => (
    <>
      <Text style={styles.subtitle}>{title}</Text>
      {data.length === 0 ? (
        <Text>No data available.</Text>
      ) : (
        <BarChart
          data={{ labels, datasets: [{ data }] }}
          width={Dimensions.get('window').width - 40}
          height={220}
          fromZero
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      )}
    </>
  );

  if (loading)
    return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

  if (error)
    return <View style={styles.center}><Text style={{ color: 'red' }}>{error}</Text></View>;

  // Get last 7 items for Test & Homework
  const latestTestResults = testResults.slice(-7);
  const latestHomeworkResults = homeworkResults.slice(-7);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8f8f8', padding: 16 }}>
      <Text style={styles.title}>Manage Child Screen</Text>

      <FlatList
        data={students}
        keyExtractor={(item) => item.student_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => fetchProgress(item)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Age: {item.age}</Text>
            <Text>Education Level: {item.edu_lvl_name}</Text>
            <Text>Payment Status: {item.payment_status === '1' ? 'Paid' : 'Pending'}</Text>
          </TouchableOpacity>
        )}
        scrollEnabled={false}
      />

      {selectedStudent && (
        <View style={{ marginTop: 24 }}>
          {/* Export Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.toggleButton, { backgroundColor: '#28a745' }]}
              onPress={() => exportPDF('progress')}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Export Progress PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, { backgroundColor: '#17a2b8' }]}
              onPress={() => exportPDF('attendance')}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Export Attendance PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.toggleButton, selectedProgressType === 'test' && styles.toggleButtonActive]}
              onPress={() => setSelectedProgressType('test')}
            >
              <Text style={selectedProgressType === 'test' ? styles.toggleTextActive : styles.toggleText}>Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, selectedProgressType === 'homework' && styles.toggleButtonActive]}
              onPress={() => setSelectedProgressType('homework')}
            >
              <Text style={selectedProgressType === 'homework' ? styles.toggleTextActive : styles.toggleText}>Homework</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, selectedProgressType === 'attendance' && styles.toggleButtonActive]}
              onPress={() => setSelectedProgressType('attendance')}
            >
              <Text style={selectedProgressType === 'attendance' ? styles.toggleTextActive : styles.toggleText}>Attendance</Text>
            </TouchableOpacity>
          </View>

          {progressLoading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <>
              {/* TEST */}
              {selectedProgressType === 'test' && (
                <>
                  {renderBarChart(
                    latestTestResults.map(r => r.percentage),
                    latestTestResults.map((_, idx) => `Test ${testResults.length - latestTestResults.length + idx + 1}`),
                    `Test Progress of ${selectedStudent.name}`
                  )}
                  <View style={styles.commentBox}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Test Details:</Text>
                    {latestTestResults.length === 0 ? (
                      <Text>No test progress available.</Text>
                    ) : (
                      latestTestResults.map((r, idx) => (
                        <Text key={r.result_id}>
                          Test {testResults.length - latestTestResults.length + idx + 1}: {r.total_questions > 0 ? `${r.raw_score}/${r.total_questions}` : '0/0'} ({r.percentage}%)
                          — {r.comment}
                        </Text>
                      ))
                    )}
                  </View>
                </>
              )}

              {/* HOMEWORK */}
              {selectedProgressType === 'homework' && (
                <>
                  {renderBarChart(
                    latestHomeworkResults.map(r => r.percentage),
                    latestHomeworkResults.map((_, idx) => `HW ${homeworkResults.length - latestHomeworkResults.length + idx + 1}`),
                    `Homework Progress of ${selectedStudent.name}`
                  )}
                  <View style={styles.commentBox}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Homework Details:</Text>
                    {latestHomeworkResults.length === 0 ? (
                      <Text>No homework progress available.</Text>
                    ) : (
                      latestHomeworkResults.map((r, idx) => (
                        <Text key={r.submission_id}>
                          HW {homeworkResults.length - latestHomeworkResults.length + idx + 1}: {r.homework_subject} — {r.grade} ({r.percentage}%) — {r.comment}
                        </Text>
                      ))
                    )}
                  </View>
                </>
              )}

              {/* ATTENDANCE */}
              {selectedProgressType === 'attendance' && (
                <>
                  {renderBarChart(
                    attendanceData,
                    attendanceLabels,
                    `Attendance of ${selectedStudent.name}`
                  )}
                  <View style={styles.commentBox}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Attendance Records:</Text>
                    {attendanceDetails.length === 0 ? (
                      <Text>No attendance records available.</Text>
                    ) : (
                      attendanceDetails.map((a: AttendanceRecord, idx: number) => {
                        const attended = a.attended ?? 0;
                        const total = a.total_classes ?? 0;
                        const percent = total > 0 ? Math.round((attended / total) * 100) : 0;

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() =>
                              Alert.alert(
                                `Session ${idx + 1} Details`,
                                `Total classes attended: ${attended}/${total}\nAttendance percentage: ${percent}%`
                              )
                            }
                          >
                            <Text>
                              Session {idx + 1}: {attended}/{total} Present — {percent}%
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  commentBox: {
    backgroundColor: '#e0f0ff',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 5
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleText: { color: '#333', fontWeight: 'bold' },
  toggleTextActive: { color: '#fff', fontWeight: 'bold' },
});
