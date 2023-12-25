import {BaseGuildVoiceChannel, Client, IntentsBitField} from 'discord.js';
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
import ytdl from 'ytdl-core';

dotenv.config();

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates],
});

function init() {
  const existingConnection = getVoiceConnection(config.serverId);

  if (existingConnection) {
    return;
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
    console.error(colorette.red(error));
  });

  const resource = createAudioResource(
    ytdl(config.youtubeURL, {
      highWaterMark: 1 << 15, // 32 KiB
      liveBuffer: 15_000, // 15 seconds
    }),
    {
      inlineVolume: true,
    }
  );

  resource.volume.setVolume(config.volume / 100);

  player.play(resource);

  connection.subscribe(player);
}

client.on('ready', () => {
  console.log(colorette.green(`Logged in as ${client.user.tag}!`));

  init();

  setInterval(() => {
    init();
  }, 10_000);
});

client.login(process.env.TOKEN);
