import {ActivityType, BaseGuildVoiceChannel, Client, IntentsBitField} from 'discord.js';
import config from './config.js';

import {
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';

import * as dotenv from 'dotenv';
import * as colorette from 'colorette';

dotenv.config();

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates],
});

client.once('ready', () => {
  console.log(colorette.green(`Logged in as ${client.user.tag}!`));
  init();

  setInterval(() => {
    init();
    client.user.setActivity(`🎵 24/7 Radio`, {type: ActivityType.Listening});
  }, 30_000);

  setInterval(() => {
    init(true);
  }, 3_600_000); // Restart every hour
});

async function init(pause = false) {
  const existingConnection = getVoiceConnection(config.serverId);
  if (existingConnection) {
    if (pause) {
      existingConnection.destroy(true);
    } else {
      return;
    }
  }

  const guild = client.guilds.cache.get(config.serverId);
  if (!guild) {
    console.error(colorette.red('Guild not found.'));
    return;
  }

  const channel = guild.channels.cache.get(config.channelId);
  if (!(channel instanceof BaseGuildVoiceChannel)) {
    console.error(colorette.red('Channel not found or not a voice channel.'));
    return;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
        maxMissedFrames: Math.round(5000 / 20),
      },
    });

    player.on('error', error => {
      console.error(colorette.red('An error occurred: ' + error.message));
      init(true);
    });

    player.on('stateChange', (oldState, newState) => {
      if (newState.status === 'idle') {
        init(true);
      }
    });

    const resource = createAudioResource(config.url, {
      inlineVolume: true,
    });

    resource.volume.setVolume(config.volume / 100);
    player.play(resource);

    connection.subscribe(player);
    connection.setSpeaking(true);
  } catch (error) {
    console.error(colorette.red('An error occurred: ' + error.message));
    init(true);
  }
}

client.login(process.env.TOKEN);
