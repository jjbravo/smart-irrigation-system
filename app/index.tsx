import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, KeyboardAvoidingView, LayoutAnimation, Linking, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScheduleEntry = {
    id: 'r1' | 'r2';
    on: string;
    off: string;
};

type SystemData = {
    hora: string;
    v1: number;
    v2: number;
    manual: boolean;
    prog: ScheduleEntry[];
};

type RelayCardProps = {
    id: 'r1' | 'r2';
    title: string;
    state: number;
    schedules: ScheduleEntry[];
    onToggle: (id: 'r1' | 'r2', currentState: number) => Promise<void>;
    onSaveAllSchedules: (updatedSchedules: ScheduleEntry[]) => Promise<boolean>;
};

const RelayCard = ({ id, title, state, schedules, onToggle, onSaveAllSchedules }: RelayCardProps) => {
    const isOn = state === 1;
    const [isAdding, setIsAdding] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [onTime, setOnTime] = useState('06:00');
    const [offTime, setOffTime] = useState('06:10');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (onTime >= offTime) {
            alert("La hora de apagado debe ser mayor a la de inicio");
            return;
        }
        setSaving(true);
        let newList;
        if (editingIdx !== null) {
            newList = [...schedules];
            newList[editingIdx] = { id, on: onTime, off: offTime };
        } else {
            newList = [...schedules, { id, on: onTime, off: offTime }];
        }

        const success = await onSaveAllSchedules(newList);
        setSaving(false);
        if (success) {
            setIsAdding(false);
            setEditingIdx(null);
            setOnTime('06:00');
            setOffTime('06:10');
        }
    };

    const startEdit = (index: number) => {
        const item = schedules[index];
        setOnTime(item.on);
        setOffTime(item.off);
        setEditingIdx(index);
        setIsAdding(true);
    };

    const startAdd = () => {
        setOnTime('06:00');
        setOffTime('06:10');
        setEditingIdx(null);
        setIsAdding(!isAdding);
    };

    const handleDelete = async (index: number) => {
        const newList = schedules.filter((_, i) => i !== index);
        await onSaveAllSchedules(newList);
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

            <View style={styles.scheduleSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Eventos Programados</Text>
                    <TouchableOpacity onPress={startAdd} style={styles.addIconBtn}>
                        <Ionicons name={isAdding && editingIdx === null ? "close-circle" : "add-circle"} size={28} color={isAdding && editingIdx === null ? "#F87171" : "#38BDF8"} />
                    </TouchableOpacity>
                </View>

                {isAdding && (
                    <View style={styles.addForm}>
                        <Text style={[styles.scheduleLabel, { marginBottom: 8, color: '#38BDF8' }]}>
                            {editingIdx !== null ? 'Editando Evento' : 'Nuevo Evento'}
                        </Text>
                        <View style={styles.editRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.scheduleLabel}>On</Text>
                                <TextInput style={styles.timeInput} value={onTime} onChangeText={setOnTime} maxLength={5} placeholder="06:00" placeholderTextColor="#475569" />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.scheduleLabel}>Off</Text>
                                <TextInput style={styles.timeInput} value={offTime} onChangeText={setOffTime} maxLength={5} placeholder="06:10" placeholderTextColor="#475569" />
                            </View>
                            <TouchableOpacity onPress={handleSave} style={styles.miniSaveBtn} disabled={saving}>
                                <Ionicons name={saving ? "sync-outline" : "checkmark"} size={20} color="#0b122b" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={styles.scheduleList}>
                    {schedules.length === 0 ? (
                        <Text style={styles.noSchedulesText}>No hay horarios configurados</Text>
                    ) : (
                        schedules.map((item, idx) => (
                            <View key={idx} style={[styles.scheduleListItem, editingIdx === idx && { borderColor: '#38BDF8', borderWidth: 1 }]}>
                                <View style={styles.scheduleRowInfo}>
                                    <Ionicons name="time-outline" size={16} color="#38BDF8" />
                                    <Text style={styles.scheduleTimeText}>{item.on} - {item.off}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity onPress={() => startEdit(idx)} style={styles.deleteBtn}>
                                        <Ionicons name="pencil" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(idx)} style={styles.deleteBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#F87171" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </View>
    );
}

const SettingsModal = ({ isVisible, onClose, onSave }: { isVisible: boolean, onClose: () => void, onSave: (h: number, m: number, s: number) => Promise<boolean> }) => {
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
        <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Configuración</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>Sincronizar reloj interno</Text>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 24 }}>
                        <TouchableOpacity onPress={handleSyncPhone} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Hora Actual</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                            <Text style={styles.saveBtnText}>{saving ? 'Enviando...' : 'Ajustar'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ borderTopWidth: 1, borderTopColor: '#27344f', paddingTop: 20 }}>
                        <Text style={styles.modalSubtitle}>Configurar Wifi</Text>
                        <TouchableOpacity
                            onPress={() => Linking.sendIntent('android.settings.WIFI_SETTINGS')}
                            style={[styles.wifiShortcutBtn]}
                        >
                            <Ionicons name="wifi" size={20} color="#38BDF8" style={{ marginRight: 12 }} />
                            <Text style={styles.wifiShortcutText}>Abrir Ajustes de Wi-Fi</Text>
                            <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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

    const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    const fetchData = async () => {
        try {
            const response = await fetchWithTimeout('http://192.168.4.1/status');
            if (!response.ok) throw new Error('Network response was not ok');
            const json = await response.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err?.name === 'AbortError' ? 'Timeout en conexión.' : 'Error de red.');
            setData({
                hora: '14:00:00',
                v1: 0,
                v2: 0,
                manual: false,
                prog: [
                    { id: 'r1', on: '06:00', off: '06:10' },
                    { id: 'r2', on: '18:00', off: '18:10' }
                ]
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
        const dataKey = id === 'r1' ? 'v1' : 'v2';
        if (data) setData({ ...data, [dataKey]: newVal });
        try {
            await fetchWithTimeout('http://192.168.4.1/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, val: newVal })
            });
        } catch (err) {
            if (data) setData({ ...data, [dataKey]: currentState });
        }
    };

    const handleSaveAllSchedules = async (id: 'r1' | 'r2', updatedSchedules: ScheduleEntry[]) => {
        try {
            setError(null);
            const otherRelayID = id === 'r1' ? 'r2' : 'r1';
            const otherRelaySchedules = (data?.prog || []).filter(s => s.id === otherRelayID);
            const fullList = [...otherRelaySchedules, ...updatedSchedules];

            const response = await fetchWithTimeout('http://192.168.4.1/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prog: fullList })
            });

            if (!response.ok) throw new Error('Error al guardar horarios');
            triggerSuccessToast("Horarios actualizados");
            await fetchData();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const handleSetRtc = async (h: number, m: number, s: number) => {
        try {
            await fetchWithTimeout('http://192.168.4.1/setrtc', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ h, m, s })
            });
            triggerSuccessToast('Reloj sincronizado');
            await fetchData();
            setShowRtcConfig(false);
            return true;
        } catch (err: any) {
            setError('Error RTC');
            return false;
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#17213b', overflow: 'hidden' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
                    keyboardShouldPersistTaps="handled"
                >
                    <ImageBackground
                        source={require('../assets/pbg.png')}
                        style={styles.header}
                        resizeMode="cover"
                        imageStyle={{ opacity: 0.25 }}
                    >
                        <View style={styles.headerTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.logoBadge}>
                                    <Ionicons name="leaf" size={24} color="#34D399" />
                                </View>
                                <TouchableOpacity onPress={toggleRtcConfig} style={{ marginLeft: 8, padding: 8, backgroundColor: '#27344f', borderRadius: 12 }}>
                                    <Ionicons name={showRtcConfig ? "close" : "settings"} size={24} color={showRtcConfig ? "#F87171" : "#94A3B8"} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.rtcContainer}>
                                <Text style={styles.rtcLabel}>HORA LOCAL</Text>
                                <Text style={styles.rtcValue}>{data?.hora || '--:--:--'}</Text>
                                {data?.manual && <Text style={styles.activeLabel}>SISTEMA ACTIVO</Text>}
                            </View>
                        </View>
                        <Text style={styles.title}>Control de Riego</Text>
                        <Text style={styles.subtitle}>Supervisa y gestiona múltiples eventos de riego dinámicos.</Text>
                    </ImageBackground>



                    <View style={styles.content}>
                        <SettingsModal
                            isVisible={showRtcConfig}
                            onClose={() => setShowRtcConfig(false)}
                            onSave={handleSetRtc}
                        />
                        {data ? (
                            <>
                                <RelayCard
                                    id="r1" title="Circuito 1 (R1)"
                                    state={data.v1}
                                    schedules={(data.prog || []).filter(s => s.id === 'r1')}
                                    onToggle={handleToggle}
                                    onSaveAllSchedules={(updated) => handleSaveAllSchedules('r1', updated)}
                                />
                                <RelayCard
                                    id="r2" title="Circuito 2 (R2)"
                                    state={data.v2}
                                    schedules={(data.prog || []).filter(s => s.id === 'r2')}
                                    onToggle={handleToggle}
                                    onSaveAllSchedules={(updated) => handleSaveAllSchedules('r2', updated)}
                                />
                            </>
                        ) : (
                            <Text style={styles.loadingText}>Cargando estado...</Text>
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.versionText}>Smart Irrigation System</Text>
                            <Text style={styles.versionNumber}>Versión 2.5.0 • 2026</Text>
                        </View>
                    </View>
                </ScrollView>

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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b122b' },
    header: {
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 32,
        backgroundColor: '#17213b',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    rtcContainer: { alignItems: 'flex-end' },
    rtcLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    rtcValue: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
    activeLabel: { color: '#34D399', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
    title: { fontSize: 32, fontWeight: '800', color: '#F8FAFC', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#94A3B8', lineHeight: 22 },
    errorBox: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5c1414',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#7f1d1d',
        zIndex: 5000,
        elevation: 10,
    },
    errorText: { color: '#FCA5A5', marginLeft: 12, flex: 1, fontSize: 13 },
    successBox: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#063e32',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#064e3b',
        zIndex: 5000,
        elevation: 10,
    },
    successText: { color: '#6EE7B7', marginLeft: 12, flex: 1, fontSize: 13 },
    content: { padding: 24 },
    loadingText: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
    card: { backgroundColor: '#17213b', borderRadius: 24, padding: 24, marginBottom: 20, elevation: 10, borderWidth: 1, borderColor: '#27344f' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusOn: { backgroundColor: '#059669' },
    statusOff: { backgroundColor: '#475569' },
    statusText: { color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 6 },
    scheduleSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#27344f', paddingTop: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    addIconBtn: { padding: 4 },
    addForm: { backgroundColor: '#0b122b', borderRadius: 12, padding: 12, marginBottom: 12 },
    scheduleList: { gap: 10 },
    scheduleListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27344f', padding: 12, borderRadius: 12 },
    scheduleRowInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scheduleTimeText: { color: '#F1F5F9', fontWeight: 'bold', fontSize: 14 },
    deleteBtn: { padding: 4 },
    noSchedulesText: { color: '#475569', fontSize: 13, textAlign: 'center', fontStyle: 'italic', marginVertical: 10 },
    editRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    inputGroup: { flex: 1, marginRight: 8 },
    scheduleLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    timeInput: { backgroundColor: '#17213b', color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#27344f', textAlign: 'center', marginTop: 4 },
    miniSaveBtn: { backgroundColor: '#38BDF8', padding: 10, borderRadius: 8, marginLeft: 4, height: 42, justifyContent: 'center' },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    cancelBtnText: { color: '#94A3B8', fontWeight: '600' },
    saveBtn: { backgroundColor: '#38BDF8', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
    saveBtnText: { color: '#0b122b', fontWeight: 'bold' },
    logoBadge: {
        width: 48,
        height: 48,
        backgroundColor: '#064e3b',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#059669',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        opacity: 0.5,
    },
    versionText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    versionNumber: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(11, 18, 43, 0.85)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#17213b',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27344f',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8FAFC',
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#38BDF8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    wifiShortcutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27344f',
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    wifiShortcutText: {
        color: '#F1F5F9',
        fontSize: 15,
        fontWeight: '600',
    },
});
