import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, KeyboardAvoidingView, LayoutAnimation, Linking, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScheduleEntry = {
    id: string;
    on: string;
    off: string;
    days: number[]; // 1=Lunes, 7=Domingo
};

type SystemData = {
    hora: string;
    manual: boolean;
    prog: ScheduleEntry[];
    [key: string]: any;
};

type RelayCardProps = {
    id: string;
    title: string;
    state: number;
    schedules: ScheduleEntry[];
    onToggle: (id: string, currentState: number) => Promise<void>;
    onSaveAllSchedules: (id: string, updatedSchedules: ScheduleEntry[]) => Promise<boolean>;
    onRemove: (id: string) => void;
};

const RelayCard = ({ id, title, state, schedules, onToggle, onSaveAllSchedules, onRemove }: RelayCardProps) => {
    const isOn = state === 1;
    const [isAdding, setIsAdding] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [onH, setOnH] = useState('06');
    const [onM, setOnM] = useState('00');
    const [offH, setOffH] = useState('06');
    const [offM, setOffM] = useState('10');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const fullOn = `${onH.padStart(2, '0')}:${onM.padStart(2, '0')}`;
        const fullOff = `${offH.padStart(2, '0')}:${offM.padStart(2, '0')}`;

        if (fullOn >= fullOff) {
            alert("La hora de apagado debe ser mayor a la de inicio");
            return;
        }
        setSaving(true);
        let newList;
        if (editingIdx !== null) {
            newList = [...schedules];
            newList[editingIdx] = { id, on: fullOn, off: fullOff, days: selectedDays };
        } else {
            newList = [...schedules, { id, on: fullOn, off: fullOff, days: selectedDays }];
        }

        const success = await onSaveAllSchedules(id, newList);
        setSaving(false);
        if (success) {
            setIsAdding(false);
            setEditingIdx(null);
            setOnH('06'); setOnM('00');
            setOffH('06'); setOffM('10');
            setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
        }
    };

    const startEdit = (index: number) => {
        const item = schedules[index];
        const [oh, om] = item.on.split(':');
        const [fh, fm] = item.off.split(':');
        setOnH(oh); setOnM(om);
        setOffH(fh); setOffM(fm);
        setSelectedDays(item.days || [1, 2, 3, 4, 5, 6, 7]);
        setEditingIdx(index);
        setIsAdding(true);
    };

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day].sort());
        }
    };

    const startAdd = () => {
        setOnH('06'); setOnM('00');
        setOffH('06'); setOffM('10');
        setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
        setEditingIdx(null);
        setIsAdding(!isAdding);
    };

    const handleDelete = async (index: number) => {
        const newList = schedules.filter((_, i) => i !== index);
        await onSaveAllSchedules(id, newList);
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Switch
                        value={isOn}
                        onValueChange={() => onToggle(id, state)}
                        trackColor={{ false: '#334155', true: '#059669' }}
                        thumbColor={'#F8FAFC'}
                    />
                    <TouchableOpacity onPress={() => onRemove(id)} style={{ marginLeft: 16 }}>
                        <Ionicons name="trash" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>
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
                                <Text style={styles.scheduleLabel}>Inicio (H:M)</Text>
                                <View style={styles.timeInputPair}>
                                    <TextInput style={styles.miniTimeInput} value={onH} onChangeText={setOnH} maxLength={2} keyboardType="numeric" placeholder="00" placeholderTextColor="#475569" />
                                    <Text style={styles.timeSeparator}>:</Text>
                                    <TextInput style={styles.miniTimeInput} value={onM} onChangeText={setOnM} maxLength={2} keyboardType="numeric" placeholder="00" placeholderTextColor="#475569" />
                                </View>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.scheduleLabel}>Fin (H:M)</Text>
                                <View style={styles.timeInputPair}>
                                    <TextInput style={styles.miniTimeInput} value={offH} onChangeText={setOffH} maxLength={2} keyboardType="numeric" placeholder="00" placeholderTextColor="#475569" />
                                    <Text style={styles.timeSeparator}>:</Text>
                                    <TextInput style={styles.miniTimeInput} value={offM} onChangeText={setOffM} maxLength={2} keyboardType="numeric" placeholder="00" placeholderTextColor="#475569" />
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleSave} style={styles.miniSaveBtn} disabled={saving}>
                                <Ionicons name={saving ? "sync-outline" : "checkmark"} size={20} color="#0b122b" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.daySelectionRow}>
                            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((label, i) => {
                                const dayNum = i + 1;
                                const isSel = selectedDays.includes(dayNum);
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => toggleDay(dayNum)}
                                        style={[styles.dayCircle, isSel && styles.dayCircleActive]}
                                    >
                                        <Text style={[styles.dayCircleText, isSel && styles.dayCircleTextActive]}>{label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
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
                                    <View>
                                        <Text style={styles.scheduleTimeText}>{item.on} - {item.off}</Text>
                                        <Text style={styles.scheduleDaysText}>
                                            {(item.days || []).map(d => ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'][d - 1]).join(' ● ')}
                                        </Text>
                                    </View>
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

const SettingsModal = ({ isVisible, onClose, onSave }: { isVisible: boolean, onClose: () => void, onSave: (h: number, m: number, s: number, d: number) => Promise<boolean> }) => {
    const date = new Date();
    // JS days: 0=Dom, 1=Lun... -> 1=Lun, 7=Dom
    const getWd = (d: number) => d === 0 ? 7 : d;

    const [h, setH] = useState(date.getHours().toString().padStart(2, '0'));
    const [m, setM] = useState(date.getMinutes().toString().padStart(2, '0'));
    const [s, setS] = useState(date.getSeconds().toString().padStart(2, '0'));
    const [wd, setWd] = useState(getWd(date.getDay()).toString());
    const [saving, setSaving] = useState(false);

    const handleSyncPhone = () => {
        const now = new Date();
        setH(now.getHours().toString().padStart(2, '0'));
        setM(now.getMinutes().toString().padStart(2, '0'));
        setS(now.getSeconds().toString().padStart(2, '0'));
        setWd(getWd(now.getDay()).toString());
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(parseInt(h) || 0, parseInt(m) || 0, parseInt(s) || 0, parseInt(wd) || 1);
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
                        <View style={styles.inputGroup}>
                            <Text style={styles.scheduleLabel}>Dia (1-7)</Text>
                            <TextInput style={styles.timeInput} value={wd} onChangeText={setWd} keyboardType="numeric" maxLength={1} />
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
    const [activeCircuits, setActiveCircuits] = useState<string[]>(['r1', 'r2']);

    const handleAddCircuit = () => {
        if (activeCircuits.length < 4) {
            const nextId = `r${activeCircuits.length + 1}`;
            setActiveCircuits(prev => [...prev, nextId]);
            triggerSuccessToast(`Circuito ${activeCircuits.length + 1} listo`);
        }
    };

    const handleRemoveCircuit = async (id: string) => {
        // 1. Apagar físicamente
        await handleToggle(id, 0);
        // 2. Limpiar horarios en el NodeMCU para este ID
        await handleSaveAllSchedules(id, []);
        // 3. Remover del estado local
        setActiveCircuits(prev => prev.filter(cid => cid !== id));
        triggerSuccessToast(`Circuito ${id.toUpperCase()} eliminado`);
    };

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
            // Only update data with a fallback if we don't have any existing state to prevent visual resets
            if (!data) {
                setData({
                    hora: '14:00:00',
                    manual: false,
                    prog: [
                        { id: 'r1', on: '06:00', off: '06:10', days: [1, 2, 3, 4, 5, 6, 7] },
                        { id: 'r2', on: '18:00', off: '18:10', days: [1, 2, 3, 4, 5, 6, 7] },
                        { id: 'r3', on: '12:00', off: '12:10', days: [] },
                        { id: 'r4', on: '20:00', off: '20:10', days: [] }
                    ],
                    v1: 0, v2: 0, v3: 0, v4: 0
                });
            }
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleToggle = async (id: string, currentState: number) => {
        const newVal = currentState === 1 ? 0 : 1;
        const vKey = id.startsWith('r') ? `v${id.charAt(1)}` : id;
        if (data) setData({ ...data, [vKey]: newVal });
        try {
            await fetchWithTimeout('http://192.168.4.1/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, val: newVal })
            });
            await fetchData();
        } catch (err) {
            if (data) setData({ ...data, [vKey]: currentState });
        }
    };

    const handleSaveAllSchedules = async (id: string, updatedSchedules: ScheduleEntry[]) => {
        try {
            setError(null);
            const otherRelaySchedules = (data?.prog || []).filter(s => s.id !== id);
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

    const handleSetRtc = async (h: number, m: number, s: number, d: number) => {
        try {
            await fetchWithTimeout('http://192.168.4.1/setrtc', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ h, m, s, d })
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
        const interval = setInterval(fetchData, 5000);
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
                                {activeCircuits.map((cid) => {
                                    const vNum = cid.charAt(1);
                                    const vKey = `v${vNum}`;
                                    return (
                                        <RelayCard
                                            key={cid}
                                            id={cid}
                                            title={`Circuito ${vNum} (${cid.toUpperCase()})`}
                                            state={data[vKey] || 0}
                                            schedules={(data.prog || []).filter(s => s.id === cid)}
                                            onToggle={handleToggle}
                                            onSaveAllSchedules={handleSaveAllSchedules}
                                            onRemove={handleRemoveCircuit}
                                        />
                                    );
                                })}
                                {activeCircuits.length < 4 && (
                                    <TouchableOpacity onPress={handleAddCircuit} style={styles.addCircuitBtn}>
                                        <Ionicons name="add-circle-outline" size={24} color="#38BDF8" />
                                        <Text style={styles.addCircuitBtnText}>Añadir nuevo circuito</Text>
                                    </TouchableOpacity>
                                )}
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
    timeInputPair: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#17213b', borderRadius: 8, borderWidth: 1, borderColor: '#27344f', marginTop: 4, paddingHorizontal: 4 },
    miniTimeInput: { flex: 1, color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', paddingVertical: 10, textAlign: 'center' },
    timeSeparator: { color: '#475569', fontWeight: 'bold' },
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
    daySelectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 },
    dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#17213b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27344f' },
    dayCircleActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
    dayCircleText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    dayCircleTextActive: { color: '#0b122b' },
    scheduleDaysText: { color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 2 },
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
    addCircuitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#17213b',
        padding: 20,
        borderRadius: 24,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#27344f',
        marginBottom: 20,
    },
    addCircuitBtnText: {
        color: '#38BDF8',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});
