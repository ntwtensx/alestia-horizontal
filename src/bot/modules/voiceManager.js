const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const sodium = require('libsodium-wrappers');

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  entersState
} = require('@discordjs/voice');

const theme = require('../../config/theme');
const memory = require('../../utils/sharedMemory');

const TARGET_GUILD_ID = theme.discordConfig?.guildId || '995335198470328371';
const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';

let isReconnecting = false;

function ensureAudioPlayer() {
  if (!memory.cafeAudioPlayer) {
    memory.cafeAudioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    memory.cafeAudioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log('🔊 [Voice Manager] กำลังเล่นเสียงต้อนรับ welcome.mp3...');
    });

    memory.cafeAudioPlayer.on('error', (err) => {
      console.error('❌ [Audio Player Error]:', err.message);
    });
  }
  return memory.cafeAudioPlayer;
}

async function connectToCafeVoice(client, forceRejoin = false) {
  if (!client || !client.isReady()) return null;
  if (isReconnecting && !forceRejoin) return null;

  try {
    isReconnecting = true;
    await sodium.ready;

    const guild = client.guilds.cache.get(TARGET_GUILD_ID) || client.guilds.cache.first();
    if (!guild) return null;

    let channel = guild.channels.cache.get(CAFE_CHANNEL_ID);
    if (!channel) {
      channel = await guild.channels.fetch(CAFE_CHANNEL_ID).catch(() => null);
    }
    if (!channel || !channel.isVoiceBased()) {
      console.warn(`⚠️ [Voice Manager] ไม่พบห้องเสียงคาเฟ่ ID: ${CAFE_CHANNEL_ID}`);
      return null;
    }

    const player = ensureAudioPlayer();

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    connection.subscribe(player);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15000);
      console.log(`🎧 [Voice Manager] อเลสเทียเชื่อมต่อเสียงที่ห้อง "${channel.name}" พร้อมพูดต้อนรับแล้ว!`);
    } catch (readyErr) {
      console.warn('⚠️ [Voice Manager] รอสัญญาณเสียง Ready เกินเวลา กำลังลองเชื่อมต่อซ้ำ...');
    }

    connection.removeAllListeners(VoiceConnectionStatus.Disconnected);
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 4000),
          entersState(connection, VoiceConnectionStatus.Connecting, 4000)
        ]);
      } catch (e) {
        console.log('🔄 [Voice Manager] บอทหลุดจากห้องเสียง กำลังกลับเข้าห้องคาเฟ่อัตโนมัติ...');
        setTimeout(() => {
          connectToCafeVoice(client, true).catch(() => null);
        }, 1500);
      }
    });

    return connection;
  } catch (err) {
    console.error('❌ [Voice Manager Error]:', err.message);
    return null;
  } finally {
    setTimeout(() => {
      isReconnecting = false;
    }, 1200);
  }
}

async function playWelcomeSound(client) {
  try {
    await sodium.ready;

    const soundPath = path.join(__dirname, '../../assets/sounds/welcome.mp3');
    if (!fs.existsSync(soundPath)) {
      console.error(`❌ [Voice Manager] ไม่พบไฟล์เสียงที่: ${soundPath}`);
      return false;
    }

    const guild = client?.guilds?.cache?.get(TARGET_GUILD_ID) || client?.guilds?.cache?.first();
    let connection = guild ? getVoiceConnection(guild.id) : null;

    if (!connection || connection.state.status !== VoiceConnectionStatus.Ready) {
      if (client) {
        connection = await connectToCafeVoice(client, true);
      }
    }

    const player = ensureAudioPlayer();
    if (connection) {
      connection.subscribe(player);
    }

    const resource = createAudioResource(fs.createReadStream(soundPath), {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
    }

    player.play(resource);
    return true;
  } catch (err) {
    console.error('❌ [Play Welcome Sound Error]:', err.message);
    return false;
  }
}

module.exports = {
  connectToCafeVoice,
  playWelcomeSound
};