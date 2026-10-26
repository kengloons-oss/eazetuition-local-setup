# ============================================================
# schedule_package_ai.py — AI 2.0 Hybrid-Plus
# ============================================================

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from utils.choose_best_class import choose_best_class_for_subject


# ------------------------------------------------------------
# MODEL A: LifestyleModel 2.0 (RandomForest, continuous output)
# ------------------------------------------------------------

class LifestyleModel:
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.scaler = MinMaxScaler()
        self.encoder = LabelEncoder()
        self.model = None
        self.X_cols = None

    def train(self):
        df = pd.read_csv(self.csv_path)

        X = df[[
            "Study_Hours_Per_Day",
            "Extracurricular_Hours_Per_Day",
            "Sleep_Hours_Per_Day",
            "Social_Hours_Per_Day",
            "Physical_Activity_Hours_Per_Day"
        ]]

        # Encode Stress_Level → 0/1/2
        y_raw = df["Stress_Level"].astype(str)
        y = self.encoder.fit_transform(y_raw)

        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        self.X_cols = list(X.columns)

        # Train strong RF
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            random_state=42
        )
        self.model.fit(X_scaled, y)

        print("🌱 LifestyleModel 2.1 trained ✔")
        return self

    def predict_score(self, stress_level, daily_study, sleep_time):
        # Convert estimated stress into encoded form (Low/Moderate/High)
        stress_sim = "Moderate"
        if stress_level <= 2.0:
            stress_sim = "Low"
        elif stress_level >= 4.0:
            stress_sim = "High"

        stress_encoded = self.encoder.transform([stress_sim])[0]

        X_input = pd.DataFrame([{
            "Study_Hours_Per_Day": daily_study,
            "Extracurricular_Hours_Per_Day": 1,
            "Sleep_Hours_Per_Day": sleep_time,
            "Social_Hours_Per_Day": 1,
            "Physical_Activity_Hours_Per_Day": 1
        }])

        X_scaled = self.scaler.transform(X_input[self.X_cols])

        pred = self.model.predict(X_scaled)[0]   # 0~2

        wellness = 1 - (pred / (len(self.encoder.classes_) - 1))
        return float(np.clip(wellness, 0, 1))


# ------------------------------------------------------------
# MODEL B: PerformanceModel 2.0 (RandomForest)
# ------------------------------------------------------------
class PerformanceModel:
    def __init__(self, csv_path, ml_weight=0.7):
        self.csv_path = csv_path
        self.scaler = MinMaxScaler()
        self.model = None
        self.exam_min = 0
        self.exam_max = 100
        self.X_cols = None
        self.ml_weight = ml_weight

    def train(self):
        df = pd.read_csv(self.csv_path)

        FEATURES = [
            "Hours_Studied", "Attendance", "Parental_Involvement",
            "Access_to_Resources", "Extracurricular_Activities",
            "Sleep_Hours", "Previous_Scores", "Motivation_Level",
            "Internet_Access", "Tutoring_Sessions",
            "Family_Income", "Teacher_Quality", "School_Type",
            "Peer_Influence", "Physical_Activity",
            "Learning_Disabilities", "Parental_Education_Level",
            "Distance_from_Home", "Gender"
        ]

        target = "Exam_Score"

        # Auto-convert categorical to numeric using pandas
        df_encoded = pd.get_dummies(df[FEATURES], drop_first=True)

        X = df_encoded
        y = df[target]

        self.exam_min = y.min()
        self.exam_max = y.max()
        self.X_cols = list(X.columns)

        X_scaled = self.scaler.fit_transform(X)

        self.model = RandomForestRegressor(
            n_estimators=300,
            max_depth=14,
            random_state=42
        )
        self.model.fit(X_scaled, y)

        print("📘 PerformanceModel 2.2 trained ✔")
        return self

    def predict_exam_score(self, study_hours, rest_hours):
        total = max(study_hours + rest_hours, 1)
        study_ratio = study_hours / total

        df_input = pd.DataFrame([{
            "Hours_Studied": study_hours,
            "Attendance": study_ratio * 100,
            "Parental_Involvement": "High",
            "Access_to_Resources": "High",
            "Extracurricular_Activities": "Yes",
            "Sleep_Hours": rest_hours,
            "Previous_Scores": 75,
            "Motivation_Level": "High",
            "Internet_Access": "Yes",
            "Tutoring_Sessions": study_hours / 2,
            "Family_Income": "Medium",
            "Teacher_Quality": "High",
            "School_Type": "Public",
            "Peer_Influence": "Positive",
            "Physical_Activity": rest_hours / 3,
            "Learning_Disabilities": "No",
            "Parental_Education_Level": "High School",
            "Distance_from_Home": "Near",
            "Gender": "Male"
        }])

        # One-hot encode to match trained columns
        df_input = pd.get_dummies(df_input)
        for col in self.X_cols:
            if col not in df_input:
                df_input[col] = 0
        df_input = df_input[self.X_cols]

        X_scaled = self.scaler.transform(df_input)

        pred_exam = self.model.predict(X_scaled)[0]

        norm = (pred_exam - self.exam_min) / (self.exam_max - self.exam_min)
        return float(np.clip(norm, 0, 1))

    def estimate_performance(self, study_hours, rest_hours):
        ml_score = self.predict_exam_score(study_hours, rest_hours)

        ratio = study_hours / max(study_hours + rest_hours, 1)
        ideal = 0.28
        rule = np.exp(-((ratio - ideal) ** 2) / 0.002)

        return float(np.clip(
            ml_score * self.ml_weight + rule * (1 - self.ml_weight),
            0, 1
        ))


# ------------------------------------------------------------
# MODEL C: Timetable AI (based on extracted timetable features)
# ------------------------------------------------------------
class TimetableFeatureExtractor:
    def extract(self, pkg):
        """
        Convert raw timetable → structural features.
        """

        sessions = []
        for sid, class_list in pkg["subjects"].items():
            best_c = choose_best_class_for_subject(class_list)
            sessions.append(best_c)


        if not sessions:
            return {
                "session_count": 0, "subject_count": 0,
                "avg_gap": 0, "max_gap": 0, "density": 0,
                "tutor_switches": 0, "room_switches": 0
            }

        # Prepare sorted sessions
        s2 = sorted(sessions, key=lambda x: (int(x["day_of_week"]), x["start_time"]))

        # Derived features
        subject_count = len([1 for s in pkg["subjects"] if len(pkg["subjects"][s]) > 0])
        session_count = len(s2)

        # Gaps
        gaps = []
        last = None
        tutor_switch = 0
        room_switch = 0

        for s in s2:
            if last:
                if last["day_of_week"] == s["day_of_week"]:
                    gaps.append(time_to_minutes(s["start_time"]) - time_to_minutes(last["end_time"]))

                if last["tutor_id"] != s["tutor_id"]:
                    tutor_switch += 1

                if last["room_id"] != s["room_id"]:
                    room_switch += 1

            last = s

        avg_gap = np.mean(gaps) if gaps else 0
        max_gap = max(gaps) if gaps else 0

        # density = hours packed tightly / total hours used
        daily_hours = []
        for d in range(1, 8):
            day_sessions = [s for s in s2 if int(s["day_of_week"]) == d]
            if not day_sessions:
                continue
            first = min(time_to_minutes(s["start_time"]) for s in day_sessions)
            last = max(time_to_minutes(s["end_time"]) for s in day_sessions)
            total_span = (last - first) / 60
            study_sum = sum((time_to_minutes(s["end_time"]) - time_to_minutes(s["start_time"])) for s in day_sessions) / 60
            if total_span > 0:
                daily_hours.append(study_sum / total_span)

        density = np.mean(daily_hours) if daily_hours else 0

        return {
            "session_count": session_count,
            "subject_count": subject_count,
            "avg_gap": float(avg_gap),
            "max_gap": float(max_gap),
            "density": float(density),
            "tutor_switches": tutor_switch,
            "room_switches": room_switch
        }

    def extract_from_sessions(self, sessions):
            if not sessions:
                return {
                    "session_count": 0, "subject_count": 0,
                    "avg_gap": 0, "max_gap": 0, "density": 0,
                    "tutor_switches": 0, "room_switches": 0
                }

            s2 = sorted(
                sessions,
                key=lambda x: (int(x["day_of_week"]), x["start_time"])
            )

            subject_count = len(sessions)
            session_count = len(s2)

            gaps = []
            last = None
            tutor_switch = 0
            room_switch = 0

            for s in s2:
                if last:
                    if last["day_of_week"] == s["day_of_week"]:
                        gaps.append(time_to_minutes(s["start_time"]) - time_to_minutes(last["end_time"]))

                    if last["tutor_id"] != s["tutor_id"]:
                        tutor_switch += 1

                    if last["room_id"] != s["room_id"]:
                        room_switch += 1

                last = s

            avg_gap = np.mean(gaps) if gaps else 0
            max_gap = max(gaps) if gaps else 0

            daily_hours = []
            for d in range(1, 8):
                day_sessions = [s for s in s2 if int(s["day_of_week"]) == d]
                if not day_sessions:
                    continue

                first = min(time_to_minutes(s["start_time"]) for s in day_sessions)
                last = max(time_to_minutes(s["end_time"]) for s in day_sessions)
                total_span = (last - first) / 60
                study_sum = sum(
                    (time_to_minutes(s["end_time"]) - time_to_minutes(s["start_time"]))
                    for s in day_sessions
                ) / 60

                if total_span > 0:
                    daily_hours.append(study_sum / total_span)

            density = np.mean(daily_hours) if daily_hours else 0

            return {
                "session_count": session_count,
                "subject_count": subject_count,
                "avg_gap": float(avg_gap),
                "max_gap": float(max_gap),
                "density": float(density),
                "tutor_switches": tutor_switch,
                "room_switches": room_switch
            }

# ------------------------------------------------------------
# Timetable AI model (RandomForest)
# ------------------------------------------------------------
class TimetableAIModel:
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=80,
            max_depth=8,
            random_state=42
        )
        self.fitted = False

    def train(self):
        self.fitted = True
        print("📊 Timetable AI model ready (heuristic mode).")

    def predict(self, features):
        score = 1.0

        # too many sessions → chaos
        if features["session_count"] > 8:
            score -= 0.2

        # REMOVE tutor switching penalty
        # score -= min(features["tutor_switches"] * 0.03, 0.3)

        # too dense → tiring
        score -= min(features["room_switches"] * 0.015, 0.1)

        return float(np.clip(score, 0, 1))

# ------------------------------------------------------------
# Final Synergy calculation
# ------------------------------------------------------------
def calculate_synergy(lifestyle, performance, timetable, workload):
    return float(np.clip(
        0.45 * performance +
        0.25 * lifestyle +
        0.20 * timetable +
        0.10 * workload,
        0, 1
    ))


# Helper for time parsing
def time_to_minutes(t):
    h, m = map(int, t.split(":"))
    return h * 60 + m
