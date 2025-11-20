import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  endDate: string; // ISO date string
  onExpire?: () => void;
  compact?: boolean; // Compact mode for product cards
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endDate, onExpire, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate, onExpire]);

  if (timeLeft.expired) {
    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={compact ? styles.compactExpiredText : styles.expiredText}>انتهى العرض</Text>
      </View>
    );
  }

  if (compact) {
    // Compact version for product cards - more integrated design
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactTimerContainer}>
          {timeLeft.days > 0 && (
            <>
              <View style={styles.compactTimeBox}>
                <Text style={styles.compactTimeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
                <Text style={styles.compactTimeLabel}>يوم</Text>
              </View>
              <Text style={styles.compactSeparator}>:</Text>
            </>
          )}
          <View style={styles.compactTimeBox}>
            <Text style={styles.compactTimeValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
            <Text style={styles.compactTimeLabel}>س</Text>
          </View>
          <Text style={styles.compactSeparator}>:</Text>
          <View style={styles.compactTimeBox}>
            <Text style={styles.compactTimeValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
            <Text style={styles.compactTimeLabel}>د</Text>
          </View>
          <Text style={styles.compactSeparator}>:</Text>
          <View style={styles.compactTimeBox}>
            <Text style={styles.compactTimeValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
            <Text style={styles.compactTimeLabel}>ث</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ينتهي العرض خلال:</Text>
      <View style={styles.timerContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>يوم</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBox}>
          <Text style={styles.timeValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>ساعة</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBox}>
          <Text style={styles.timeValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>دقيقة</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBox}>
          <Text style={styles.timeValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>ثانية</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginHorizontal: 4,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  separator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginHorizontal: 4,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  // Compact styles for product cards - integrated with card design
  compactContainer: {
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  compactTimerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  compactTimeBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactTimeValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
    lineHeight: 16,
  },
  compactTimeLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 10,
  },
  compactSeparator: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
    marginHorizontal: 2,
  },
  compactExpiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default CountdownTimer;

