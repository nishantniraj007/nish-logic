import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import io, { Socket } from 'socket.io-client';

export default function WalkieTalkie() {
    const [serverUrl, setServerUrl] = useState('https://your-zrok-url.zrok.io');
    const [connected, setConnected] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const connectToServer = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        try {
            const newSocket = io(serverUrl);

            newSocket.on('connect', () => {
                setConnected(true);
                console.log('Connected to server');
            });

            newSocket.on('disconnect', () => {
                setConnected(false);
                console.log('Disconnected from server');
            });

            newSocket.on('audio', async (base64Audio: string) => {
                try {
                    const uri = FileSystem.documentDirectory + 'received_audio.m4a';
                    await FileSystem.writeAsStringAsync(uri, base64Audio, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    const { sound } = await Audio.Sound.createAsync({ uri });
                    await sound.playAsync();
                } catch (error) {
                    console.error('Error playing audio:', error);
                }
            });

            socketRef.current = newSocket;
        } catch (e) {
            Alert.alert("Connection Error", "Invalid URL or connection failed");
        }
    };

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                const response = await requestPermission();
                if (response.status !== 'granted') return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.LOW_QUALITY
            );
            setRecording(recording);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        setRecording(undefined);
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri && socketRef.current && connected) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            socketRef.current.emit('audio', { buffer: base64, room: 'default' });
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Walkie Talkie</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="Server URL (e.g. https://...)"
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.connectButton} onPress={connectToServer}>
                    <Text style={styles.buttonText}>{connected ? 'Reconnect' : 'Connect'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: connected ? 'green' : 'red' }]}>
                    {connected ? 'connected' : 'disconnected'}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.pttButton, recording ? styles.pttActive : styles.pttInactive]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={!connected}
            >
                <Text style={styles.pttText}>
                    {recording ? 'Transmitting...' : 'Press to Talk'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 30,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        width: '100%',
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    connectButton: {
        backgroundColor: '#4682b4',
        padding: 10,
        borderRadius: 5,
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    statusContainer: {
        marginBottom: 50,
    },
    statusText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    pttButton: {
        width: 250,
        height: 250,
        borderRadius: 125,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    pttInactive: {
        backgroundColor: '#555',
    },
    pttActive: {
        backgroundColor: '#d00',
        borderWidth: 5,
        borderColor: '#f55',
    },
    pttText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
});
