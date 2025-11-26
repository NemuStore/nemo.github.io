import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface DateTimePickerButtonProps {
  value: string; // Format: YYYY-MM-DD or empty string
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function DateTimePickerButton({
  value,
  onValueChange,
  placeholder = 'اختر التاريخ',
  label,
}: DateTimePickerButtonProps) {
  const { colors } = useDarkMode();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );
  const [webDateValue, setWebDateValue] = useState(value || '');
  const webInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
      setWebDateValue(value);
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDate(date);
      onValueChange(formattedDate);
    }
  };

  const handleOpenPicker = () => {
    setShowPicker(true);
    if (Platform.OS === 'web') {
      setWebDateValue(value || '');
    }
  };

  const handleWebInputFocus = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Create a hidden native date input and trigger it
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'date';
      hiddenInput.value = webDateValue || '';
      hiddenInput.min = formatDate(new Date());
      hiddenInput.style.position = 'absolute';
      hiddenInput.style.opacity = '0';
      hiddenInput.style.pointerEvents = 'none';
      hiddenInput.onchange = (e: any) => {
        if (e.target.value) {
          setWebDateValue(e.target.value);
          onValueChange(e.target.value);
        }
        document.body.removeChild(hiddenInput);
      };
      document.body.appendChild(hiddenInput);
      hiddenInput.showPicker?.();
      // Fallback: click the input
      setTimeout(() => {
        hiddenInput.click();
      }, 100);
    }
  };

  const handleClear = () => {
    onValueChange('');
    setSelectedDate(new Date());
    setWebDateValue('');
  };

  const handleWebDateChange = (text: string) => {
    setWebDateValue(text);
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(text)) {
      onValueChange(text);
    }
  };

  const handleWebDateConfirm = () => {
    if (webDateValue) {
      onValueChange(webDateValue);
    }
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={handleOpenPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.text} />
        <Text style={[styles.buttonText, { color: value ? colors.text : colors.placeholder }]}>
          {value ? formatDateDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {showPicker ? (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View 
              style={[styles.modalContent, { backgroundColor: colors.background }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>اختر التاريخ</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'web' ? (
                <View style={styles.webDateInputContainer}>
                  <TextInput
                    ref={webInputRef}
                    style={[
                      styles.webDateInput,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                      },
                    ]}
                    value={webDateValue}
                    onChangeText={handleWebDateChange}
                    onFocus={handleWebInputFocus}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.helpText, { color: colors.placeholder }]}>
                    أدخل التاريخ بصيغة: YYYY-MM-DD
                  </Text>
                </View>
              ) : (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  locale="ar"
                />
              )}
              {Platform.OS === 'web' ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleWebDateConfirm}
                  >
                    <Text style={styles.modalButtonText}>تأكيد</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const formattedDate = formatDate(selectedDate);
                      onValueChange(formattedDate);
                      setShowPicker(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>تأكيد</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  buttonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webDateInputContainer: {
    width: '100%',
    marginVertical: 10,
  },
  webDateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    minHeight: 50,
  },
  helpText: {
    fontSize: 12,
    marginTop: 5,
    opacity: 0.7,
    textAlign: 'center',
  },
});
