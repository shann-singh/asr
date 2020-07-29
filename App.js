import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Button,
  Platform,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import TcpSocket from 'react-native-tcp-socket';
import RNFetchBlob from 'rn-fetch-blob';
import AudioRecord from 'react-native-audio-record';

const App = () => {
  const [speech, setSpeech] = useState(false);
  const [text, setText] = useState('');
  const client = useRef('');
  const prevTextRef = useRef();
  const textRef = useRef('');

  const options = {
    sampleRate: 8000, // default 44100
    channels: 1, // 1 or 2, default 1
    bitsPerSample: 16, // 8 or 16, default 16
    audioSource: 6, // android only (see below)
    wavFile: 'test.wav', // default 'audio.wav'
  };

  AudioRecord.init(options);

  useEffect(() => {
    if (client.current !== '' && speech === false) {
      client.current.on('data', async (data) => {
        let d = await data.toString('utf8');
        console.log(d);
        if (prevTextRef.current !== d && d !== ' ') {
          textRef.current = textRef.current + d;
          prevTextRef.current = d;
          setText(text + ' ' + d);
          if (d.search('stop') !== -1) {
            textRef.current = textRef.current + 'STOP';
            stopRecord();
          }
        }
      });
    }
  }, [speech, text]);

  const recordAudio = () => {
    setSpeech(true);
    AudioRecord.start();

    setTimeout(async () => {
      AudioRecord.stop();
      setTimeout(() => {
        stopAudioRecord();
      }, 2000);
    }, 5000);
  };

  const stopAudioRecord = async () => {
    if (client.current) {
      await RNFetchBlob.fs
        .exists(RNFetchBlob.fs.dirs.DocumentDir + '/test.wav')
        .then(async (exist) => {
          console.log(`file ${exist ? '' : 'not'} exists`);
          // new Player('test.wav').play();
          await RNFetchBlob.fs
            .readStream(
              RNFetchBlob.fs.dirs.DocumentDir + '/test.wav',
              'base64',
              1440,
              10,
            )
            .then((stream) => {
              stream.open();
              stream.onData(async (chunk) => {
                console.log(chunk);
                await client.current.write(chunk, 'base64', () => {});
              });
              stream.onEnd(async () => {
                if (client.current) {
                  // recordAudio();
                }
              });
            })
            .catch((error) => {
              console.log(error);
            });
        })
        .catch((error) => {
          console.log(error);
        });
      setSpeech(false);
    }
  };

  const startRecord = async () => {
    if (client.current === '') {
      client.current = TcpSocket.createConnection({
        port: 7080,
        host: 'dev.kwantics.ai',
      });
      await client.current.on('connect', () => {
        console.log('connected tcp');
      });
      await client.current.on('error', (error) => {
        console.log(error);
      });
    }
    setSpeech(true);
    recordAudio();
  };

  const stopRecord = () => {
    if (client.current !== '') {
      setSpeech(false);
      console.log('stoping');
      AudioRecord.stop();
      client.current.on('close', () => {
        console.log('Connection closed!');
      });
      client.current.destroy();
      client.current = '';
    }
  };

  const requestRecord = () => {
    if (Platform.OS === 'android') {
      request(PERMISSIONS.ANDROID.RECORD_AUDIO)
        .then((result) => {
          switch (result) {
            case RESULTS.UNAVAILABLE:
              console.log(
                'This feature is not available (on this device / in this context)',
              );
              break;
            case RESULTS.DENIED:
              console.log(
                'The permission has not been requested / is denied but requestable',
              );
              break;
            case RESULTS.GRANTED:
              startRecord();
              break;
            case RESULTS.BLOCKED:
              console.log(
                'The permission is denied and not requestable anymore',
              );
              break;
          }
        })
        .catch((error) => {
          // …
        });
    }
  };

  return (
    <View>
      <View style={styles.textView}>
        <Text>{textRef.current}</Text>
      </View>
      <View style={styles.buttonView}>
        <TouchableOpacity
          style={styles.FacebookStyle}
          activeOpacity={0.5}
          onPress={requestRecord}>
          <Image source={require('./mic.png')} style={styles.ImageIconStyle} />
          <Text style={styles.TextStyle}>
            {speech ? 'Recording' : 'Record'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonView}>
        <Button
          onPress={stopRecord}
          title="Stop Recording"
          color="#841584"
          accessibilityLabel="Learn more about this purple button"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonView: {
    alignItems: 'center',
    marginVertical: 30,
  },
  button: {
    marginBottom: 20,
  },
  textView: {
    margin: 20,
    padding: 10,
    borderWidth: 2,
    height: 250,
  },
  ImageIconStyle: {
    height: 50,
    width: 50,
  },
});

export default App;
