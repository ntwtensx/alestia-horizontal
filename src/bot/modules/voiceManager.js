const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

// กำหนดพิกัด FFmpeg อัตโนมัติเพื่อให้รันบน Koyeb ได้ทันที
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');

const theme = require('../../config/theme');
const memory = require('../../utils/sharedMemory');

const TARGET_GUILD_ID = theme.discordConfig?.guildId || '995335198470328371';
const CAFE_CHANNEL_ID = theme.discordConfig?.cafeVoiceChannelId || '995629374722297946';

let isReconnecting = false;

// สร้างเครื่องเล่นเสียงส่วนกลางและเก็บไว้ใน sharedMemory
if (!memory.cafeAudioPlayer) {
  memory.cafeAudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  memory.cafeAudioPlayer.on('error', (err) => {
    console.warn('⚠️ [Audio Player Error]:', err.message);
  });
}

async function connectToCafeVoice(client, forceRejoin = false) {
  if (!client || !client.isReady()) return null;
  if (isReconnecting && !forceRejoin) return null;

  try {
    isReconnecting = true;
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

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    connection.subscribe(memory.cafeAudioPlayer);

    // ดักจับกรณีสัญญาณหลุดหรือถูกตัดการเชื่อมต่อ ให้กระโดดกลับเข้าห้องใหม่ทันที
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 3000),
          entersState(connection, VoiceConnectionStatus.Connecting, 3000)
        ]);
      } catch (e) {
        console.log('🔄 [Voice Manager] บอทหลุดจากห้องเสียง กำลังกลับเข้าห้องคาเฟ่อัตโนมัติ...');
        setTimeout(() => {
          connectToCafeVoice(client, true).catch(() => null);
        }, 1500);
      }
    });

    console.log(`🎧 [Voice Manager] อเลสเทียเข้าประจำการที่ห้องเสียง "${channel.name}" เรียบร้อย!`);
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

function playWelcomeSound() {
  try {
    const soundPath = path.join(__dirname, '../../assets/sounds/welcome.mp3');
    if (!fs.existsSync(soundPath)) {
      console.warn('⚠️ [Voice Manager] ยังไม่พบไฟล์เสียง src/assets/sounds/welcome.mp3');
      return false;
    }

    const resource = createAudioResource(soundPath, { inlineVolume: true });
    if (resource.volume) {
      resource.volume.setVolume(1.0);
    }
    memory.cafeAudioPlayer.play(resource);
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