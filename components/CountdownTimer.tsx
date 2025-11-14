import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  endDate: string; // ISO date string
  onExpire?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endDate, onExpire }) => {
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
      <View style={styles.container}>
        <Text style={styles.expiredText}>انتهى العرض</Text>
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
});

export default CountdownTimer;

