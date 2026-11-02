import { Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { C, F } from "./theme";
import { Button } from "./ui-kit";

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.overlay} onPress={onCancel}>
        <Pressable style={s.card} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.buttons}>
            <Button label="Stay" kind="outline" height={48} fontSize={15} onPress={onCancel} style={{ flex: 1 }} />
            <Button label={confirmLabel} kind="light" height={48} fontSize={15} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },
  title: { fontFamily: F.displayHeavy, fontSize: 24, color: C.cream },
  message: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.body },
  buttons: { flexDirection: "row", gap: 10, marginTop: 10 },
});