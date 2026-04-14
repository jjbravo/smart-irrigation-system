import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SystemData = {
    rtc: string;
    r1: number;
    r2: number;
    sched: {
        r1: { on: string; off: string };
        r2: { on: string; off: string };
    };
};

export default function App() {
    const [data, setData] = useState<SystemData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setError(null);
            const response = await fetch('http://192.168.4.1/status');
            if (!response.ok) throw new Error('Network response was not ok');
            const json = await response.json();
            setData(json);
        } catch (err) {
            setError('Error de conexión o no conectado al NodeMCU. Mostrando datos de simulación.');
            // Mock data for display purposes
            setData({
                rtc: new Date().toLocaleTimeString('en-US', { hour12: false }),
                r1: 1,
                r2: 0,
                sched: {
                    r1: { on: "21:25", off: "21:26" },
                    r2: { on: "21:26", off: "21:27" }
                }
            });
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleToggle = async (id: 'r1' | 'r2', currentState: number) => {
        const newVal = currentState === 1 ? 0 : 1;
        
        // Optimistic UI update
        if (data) {
            const newData = { ...data, [id]: newVal };
            setData(newData);
        }

        try {
            const response = await fetch('http://192.168.4.1/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, val: newVal })
            });

            if (!response.ok) throw new Error('Error al enviar comando');
        } catch(err) {
            console.log('Error toggling manual state', err);
            // Revert state on failure
            if (data) {
                const revertData = { ...data, [id]: currentState };
                setData(revertData);
            }
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const RelayCard = ({ id, title, state, schedOn, schedOff }: { id: 'r1' | 'r2', title: string, state: number, schedOn: string, schedOff: string }) => {
        const isOn = state === 1;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <View style={[styles.statusBadge, isOn ? styles.statusOn : styles.statusOff, { marginTop: 8, alignSelf: 'flex-start' }]}>
                            <Ionicons name={isOn ? "power" : "power-outline"} size={12} color="#FFF" />
                            <Text style={styles.statusText}>{isOn ? "ENCENDIDO" : "APAGADO"}</Text>
                        </View>
                    </View>
                    <Switch
                        value={isOn}
                        onValueChange={() => handleToggle(id, state)}
                        trackColor={{ false: '#334155', true: '#059669' }}
                        thumbColor={'#F8FAFC'}
                    />
                </View>
                <View style={styles.scheduleContainer}>
                    <View style={styles.scheduleItem}>
                        <Ionicons name="time-outline" size={18} color="#94A3B8" />
                        <View style={styles.scheduleTexts}>
                            <Text style={styles.scheduleLabel}>Próximo Inicio</Text>
                            <Text style={styles.scheduleValue}>{schedOn}</Text>
                        </View>
                    </View>
                    <View style={styles.scheduleItem}>
                        <Ionicons name="timer-outline" size={18} color="#94A3B8" />
                        <View style={styles.scheduleTexts}>
                            <Text style={styles.scheduleLabel}>Próximo Apagado</Text>
                            <Text style={styles.scheduleValue}>{schedOff}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
        >
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Ionicons name="water-outline" size={40} color="#38BDF8" />
                    <View style={styles.rtcContainer}>
                        <Text style={styles.rtcLabel}>HORA LOCAL</Text>
                        <Text style={styles.rtcValue}>{data?.rtc || '--:--:--'}</Text>
                    </View>
                </View>
                <Text style={styles.title}>Control de Riego</Text>
                <Text style={styles.subtitle}>Supervisa y administra los horarios de tu sistema de riego automático.</Text>
            </View>

            {error && (
               <View style={styles.errorBox}>
                   <Ionicons name="warning" size={20} color="#F87171" />
                   <Text style={styles.errorText}>{error}</Text>
               </View> 
            )}

            <View style={styles.content}>
                {data ? (
                    <>
                        <RelayCard 
                            id="r1"
                            title="Circuito 1 (R1)" 
                            state={data.r1} 
                            schedOn={data.sched.r1.on} 
                            schedOff={data.sched.r1.off} 
                        />
                        <RelayCard 
                            id="r2"
                            title="Circuito 2 (R2)" 
                            state={data.r2} 
                            schedOn={data.sched.r2.on} 
                            schedOff={data.sched.r2.off} 
                        />
                    </>
                ) : (
                    <Text style={styles.loadingText}>Cargando estado...</Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617', // very dark slate
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 32,
        backgroundColor: '#0F172A',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    rtcContainer: {
        alignItems: 'flex-end',
    },
    rtcLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    rtcValue: {
        color: '#F8FAFC',
        fontSize: 20,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#94A3B8',
        lineHeight: 22,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#450a0a',
        padding: 16,
        margin: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#7f1d1d',
    },
    errorText: {
        color: '#FCA5A5',
        marginLeft: 12,
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    content: {
        padding: 24,
    },
    loadingText: {
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 40,
    },
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusOn: {
        backgroundColor: '#059669', // Emerald 600
    },
    statusOff: {
        backgroundColor: '#475569', // Slate 600
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    scheduleContainer: {
        backgroundColor: '#020617',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scheduleTexts: {
        marginLeft: 12,
    },
    scheduleLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2,
    },
    scheduleValue: {
        fontSize: 16,
        color: '#E2E8F0',
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
});
