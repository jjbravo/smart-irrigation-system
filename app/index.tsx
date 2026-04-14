import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useRef } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SystemData = {
    rtc: string;
    r1: number;
    r2: number;
    sched: {
        r1: { on: string; off: string };
        r2: { on: string; off: string };
    };
};

type RelayCardProps = {
    id: 'r1' | 'r2';
    title: string;
    state: number;
    schedOn: string;
    schedOff: string;
    onToggle: (id: 'r1' | 'r2', currentState: number) => Promise<void>;
    onSaveSchedule: (id: 'r1' | 'r2', onTime: string, offTime: string) => Promise<boolean>;
};

const RelayCard = ({ id, title, state, schedOn, schedOff, onToggle, onSaveSchedule }: RelayCardProps) => {
    const isOn = state === 1;
    const [isEditing, setIsEditing] = useState(false);
    const [onTime, setOnTime] = useState(schedOn);
    const [offTime, setOffTime] = useState(schedOff);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setOnTime(schedOn);
            setOffTime(schedOff);
        }
    }, [schedOn, schedOff, isEditing]);

    const saveSchedule = async () => {
        setSaving(true);
        const success = await onSaveSchedule(id, onTime, offTime);
        setSaving(false);
        if (success) setIsEditing(false);
    };

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
                    onValueChange={() => onToggle(id, state)}
                    trackColor={{ false: '#334155', true: '#059669' }}
                    thumbColor={'#F8FAFC'}
                />
            </View>
            <View style={styles.scheduleContainer}>
                {isEditing ? (
                    <View style={styles.editModeContainer}>
                        <View style={styles.editRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.scheduleLabel}>Inicio (HH:MM)</Text>
                                <TextInput
                                    style={styles.timeInput}
                                    value={onTime}
                                    onChangeText={setOnTime}
                                    maxLength={5}
                                    placeholder="21:00"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.scheduleLabel}>Apagado (HH:MM)</Text>
                                <TextInput
                                    style={styles.timeInput}
                                    value={offTime}
                                    onChangeText={setOffTime}
                                    maxLength={5}
                                    placeholder="21:15"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveSchedule} style={styles.saveBtn} disabled={saving}>
                                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.scheduleDisplay}>
                        <View style={styles.scheduleItemsWrap}>
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
                        <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                            <Ionicons name="pencil" size={20} color="#38BDF8" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const RTCConfig = ({ onSave }: { onSave: (h: number, m: number, s: number) => Promise<boolean> }) => {
    const d = new Date();
    const [h, setH] = useState(d.getHours().toString().padStart(2, '0'));
    const [m, setM] = useState(d.getMinutes().toString().padStart(2, '0'));
    const [s, setS] = useState(d.getSeconds().toString().padStart(2, '0'));
    const [saving, setSaving] = useState(false);

    const handleSyncPhone = () => {
        const now = new Date();
        setH(now.getHours().toString().padStart(2, '0'));
        setM(now.getMinutes().toString().padStart(2, '0'));
        setS(now.getSeconds().toString().padStart(2, '0'));
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(parseInt(h) || 0, parseInt(m) || 0, parseInt(s) || 0);
        setSaving(false);
    };

    return (
        <View style={[styles.card, { borderColor: '#38BDF8', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="time" size={20} color="#38BDF8" />
                <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Sincronizar Reloj Interno</Text>
            </View>
            <View style={styles.editRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.scheduleLabel}>Hora</Text>
                    <TextInput style={styles.timeInput} value={h} onChangeText={setH} keyboardType="numeric" maxLength={2} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.scheduleLabel}>Min</Text>
                    <TextInput style={styles.timeInput} value={m} onChangeText={setM} keyboardType="numeric" maxLength={2} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.scheduleLabel}>Seg</Text>
                    <TextInput style={styles.timeInput} value={s} onChangeText={setS} keyboardType="numeric" maxLength={2} />
                </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <TouchableOpacity onPress={handleSyncPhone} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Hora Actual</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                    <Text style={styles.saveBtnText}>{saving ? 'Enviando...' : 'Ajustar'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function App() {
    const [data, setData] = useState<SystemData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [refreshing, setRefreshing] = useState(false);
    const [showRtcConfig, setShowRtcConfig] = useState(false);

    const toggleRtcConfig = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowRtcConfig(prev => !prev);
    };

    const triggerSuccessToast = (msg: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSuccessMsg(msg);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSuccessMsg(null);
                });
            }, 4500);
        });
    };

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
        } catch (err) {
            console.log('Error toggling manual state', err);
            // Revert state on failure
            if (data) {
                const revertData = { ...data, [id]: currentState };
                setData(revertData);
            }
        }
    };

    const handleSchedule = async (id: 'r1' | 'r2', onTime: string, offTime: string) => {
        try {
            setError(null);
            if (onTime >= offTime) {
                throw new Error('La hora de apagado debe ser mayor a la hora de encendido');
            }

            const response = await fetch('http://192.168.4.1/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, on: onTime, off: offTime })
            });

            if (!response.ok) {
                const resData = await response.json().catch(() => null);
                if (resData && resData.statusCode === 1002) {
                    throw new Error(resData.message);
                }
                throw new Error('Error al programar horario');
            }

            await fetchData();
            return true;
        } catch (err: any) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setError(err.message || 'Error desconocido');
            return false;
        }
    };

    const handleSetRtc = async (h: number, m: number, s: number) => {
        try {
            if (error) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setError(null);
            }
            setSuccessMsg(null);
            const response = await fetch('http://192.168.4.1/setrtc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ h, m, s })
            });

            if (!response.ok) throw new Error('Error al ajustar el reloj del sistema');

            const resData = await response.json().catch(() => null);
            if (resData && resData.status === 'success') {
                triggerSuccessToast(`Reloj sincronizado exitosamente a las ${resData.time}`);
            } else {
                triggerSuccessToast('Reloj sincronizado exitosamente.');
            }

            await fetchData();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowRtcConfig(false);
            return true;
        } catch (err: any) {
            setError(err.message || 'Error desconocido enviando RTC');
            return false;
        }
    };

    useEffect(() => {
        fetchData();
    }, []);



    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
        >
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="water-outline" size={40} color="#38BDF8" />
                        <TouchableOpacity onPress={handleRefresh} style={{ marginLeft: 16, padding: 8, backgroundColor: '#1E293B', borderRadius: 12 }}>
                            <Ionicons name="refresh" size={24} color="#38BDF8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleRtcConfig} style={{ marginLeft: 8, padding: 8, backgroundColor: '#1E293B', borderRadius: 12 }}>
                            <Ionicons name={showRtcConfig ? "close" : "settings"} size={24} color={showRtcConfig ? "#F87171" : "#94A3B8"} />
                        </TouchableOpacity>
                    </View>
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

            {successMsg && (
                <Animated.View style={[styles.successBox, { opacity: fadeAnim }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#34D399" />
                    <Text style={styles.successText}>{successMsg}</Text>
                </Animated.View>
            )}

            <View style={styles.content}>
                {showRtcConfig && (
                    <RTCConfig onSave={handleSetRtc} />
                )}

                {data ? (
                    <>
                        <RelayCard
                            id="r1"
                            title="Circuito 1 (R1)"
                            state={data.r1}
                            schedOn={data.sched.r1.on}
                            schedOff={data.sched.r1.off}
                            onToggle={handleToggle}
                            onSaveSchedule={handleSchedule}
                        />
                        <RelayCard
                            id="r2"
                            title="Circuito 2 (R2)"
                            state={data.r2}
                            schedOn={data.sched.r2.on}
                            schedOff={data.sched.r2.off}
                            onToggle={handleToggle}
                            onSaveSchedule={handleSchedule}
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
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#022c22',
        padding: 16,
        marginHorizontal: 24,
        marginTop: 15,
        marginBottom: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#064e3b',
    },
    successText: {
        color: '#6EE7B7',
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
    },
    scheduleDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scheduleItemsWrap: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: 16,
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
    editBtn: {
        padding: 8,
        backgroundColor: '#0F172A',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    editModeContainer: {
        width: '100%',
    },
    editRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
        marginRight: 8,
    },
    timeInput: {
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: 'bold',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E293B',
        textAlign: 'center',
        marginTop: 6,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginRight: 8,
    },
    cancelBtnText: {
        color: '#94A3B8',
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: '#38BDF8',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    saveBtnText: {
        color: '#020617',
        fontWeight: 'bold',
    },
});
