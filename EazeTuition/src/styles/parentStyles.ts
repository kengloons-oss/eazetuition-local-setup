// parent/styles/parentStyles.ts
import { StyleSheet } from "react-native";

export const parentSelectStyles = StyleSheet.create({
    label: {
        marginLeft: 16,
        marginBottom: 4,
        fontSize: 14,
        color: "#555",
        fontWeight: "500",
    },

    row: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },

    selector: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        elevation: 2,
        // width 可交给外面控制，有需要可以加上
    },

    selectorText: {
        fontSize: 15,
        color: "#333",
    },

    dashedDivider: {
        borderBottomColor: "#444",
        borderBottomWidth: 2.5,
        borderStyle: "dashed",
        marginVertical: 18,
        opacity: 0.80,
    },
});

export const parentDropdownStyles = StyleSheet.create({
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 48,
    elevation: 2,
  },

  placeholder: {
    fontSize: 15,
    color: "#888",
  },

  selectedText: {
    fontSize: 15,
    color: "#333",
  },

  icon: {
    width: 20,
    height: 20,
    tintColor: "#666",
  },

  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 4,
  },

  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  itemText: {
    fontSize: 15,
    color: "#333",
  },
});

export const parentDividerStyles = StyleSheet.create({
    dashedDivider: {
        borderBottomColor: "#444",
        borderBottomWidth: 2.5,
        borderStyle: "dashed",
        marginVertical: 18,
        opacity: 0.80,
    },
});

export const parentCheckboxStyles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0A84FF",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  tick: {
    width: 12,
    height: 12,
    backgroundColor: "#0A84FF",
    borderRadius: 3,
  },

  disabledBox: {
    borderColor: "#ccc",
    backgroundColor: "#eee",
  },

  selectedBox: {
    borderColor: "#0A84FF",
    backgroundColor: "#0A84FF30",
  },
});
