import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import moment from "moment";

interface WeekRowProps {
    weekDays: moment.Moment[];
    selectedDate: moment.Moment;
    onSelectDay: (day: moment.Moment) => void;
    classDays: string[]; // ⬅ 新增：有课的日期列表 (YYYY-MM-DD)
}

export default function WeekSelector({ weekDays, selectedDate, onSelectDay, classDays }: WeekRowProps) {
    return (
        <View style={styles.weekRow}>
            {weekDays.map((day, index) => {
                const isSelected =
                    day.format("YYYY-MM-DD") === selectedDate.format("YYYY-MM-DD");

                const dateStr = day.format("YYYY-MM-DD");
                const isClassDay = classDays.includes(dateStr);

                const isFuture = day.isAfter(moment(), "day");
                const isPast = day.isBefore(moment(), "day");

                let borderStyle = {};

                if (isClassDay && !isSelected) {
                    borderStyle = {
                        borderWidth: 2,
                        borderColor: isFuture ? "#FFD700" : "#20C997", // Yellow or teal
                    };
                }

                return (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.dayBox,
                            isSelected && styles.dayBoxSelected,
                            borderStyle,
                        ]}
                        onPress={() => onSelectDay(day)}
                    >
                        <Text
                            style={[
                                styles.dayLabel,
                                isSelected && styles.dayLabelSelected,
                            ]}
                        >
                            {day.format("ddd")}
                        </Text>
                        <Text
                            style={[
                                styles.dateLabel,
                                isSelected && styles.dateLabelSelected,
                            ]}
                        >
                            {day.format("DD")}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    weekRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        marginBottom: 8,
    },

    dayBox: {
        width: 55,
        height: 60,
        backgroundColor: "#fff",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        paddingVertical: 4,
    },

    dayBoxSelected: {
        backgroundColor: "#0078D4",
    },

    dayLabel: {
        fontSize: 13,
        color: "#444",
        marginBottom: 2,
    },

    dayLabelSelected: {
        color: "#fff",
    },

    dateLabel: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },

    dateLabelSelected: {
        color: "#fff",
    },
});
