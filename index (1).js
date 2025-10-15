const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const economy = new Map();
const giveaways = new Map();

const commands = [
  new SlashCommandBuilder().setName('invite').setDescription('Get the bot invite link'),
  new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Show user information').addUserOption(option => option.setName('user').setDescription('The user to get info about')),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('mute').setDescription('Timeout a member').addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('clear').setDescription('Delete messages').addIntegerOption(option => option.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('poll').setDescription('Create a poll').addStringOption(option => option.setName('question').setDescription('Poll question').setRequired(true)),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8ball').addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
  new SlashCommandBuilder().setName('dice').setDescription('Roll a dice'),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
  new SlashCommandBuilder().setName('balance').setDescription('Check your balance').addUserOption(option => option.setName('user').setDescription('User to check balance')),
  new SlashCommandBuilder().setName('work').setDescription('Work to earn coins'),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  new SlashCommandBuilder().setName('pay').setDescription('Pay someone').addUserOption(option => option.setName('user').setDescription('User to pay').setRequired(true)).addIntegerOption(option => option.setName('amount').setDescription('Amount to pay').setRequired(true)),
  new SlashCommandBuilder().setName('gstart').setDescription('Start a giveaway').addStringOption(option => option.setName('prize').setDescription('Giveaway prize').setRequired(true)).addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true)).addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true)),
  new SlashCommandBuilder().setName('gend').setDescription('End a giveaway').addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)),
  new SlashCommandBuilder().setName('greroll').setDescription('Reroll a giveaway').addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  client.user.setActivity('/help for commands', { type: ActivityType.Playing });
  
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('guildMemberAdd', (member) => {
  const channel = member.guild.systemChannel;
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('👋 Welcome!')
      .setDescription(`Welcome to the server, ${member}! We're glad to have you here.`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    channel.send({ embeds: [embed] });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'invite') {
    const invite = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🔗 Invite Me!')
      .setDescription(`[Click here to invite me to your server!](${invite})`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Bot Commands')
      .setDescription('Here are all available slash commands:')
      .addFields(
        { name: '**Moderation**', value: '`/kick` - Kick a user\n`/ban` - Ban a user\n`/mute` - Timeout a user\n`/clear` - Delete messages' },
        { name: '**Utility**', value: '`/serverinfo` - Server info\n`/userinfo` - User info\n`/ping` - Bot latency\n`/poll` - Create poll\n`/invite` - Bot invite link' },
        { name: '**Fun**', value: '`/8ball` - Magic 8ball\n`/dice` - Roll dice\n`/coinflip` - Flip coin' },
        { name: '**Economy**', value: '`/balance` - Check balance\n`/work` - Earn coins\n`/daily` - Daily reward\n`/pay` - Pay someone' },
        { name: '**Giveaway**', value: '`/gstart` - Start giveaway\n`/gend` - End giveaway\n`/greroll` - Reroll winner' }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'kick') {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick();
    await interaction.reply(`✅ ${user.tag} has been kicked!`);
  }

  if (commandName === 'ban') {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    await member.ban();
    await interaction.reply(`✅ ${user.tag} has been banned!`);
  }

  if (commandName === 'mute') {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(60000 * 10, 'Muted by moderator');
    await interaction.reply(`✅ ${user.tag} has been muted for 10 minutes!`);
  }

  if (commandName === 'clear') {
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: '❌ Please provide a number between 1 and 100!', ephemeral: true });
    }
    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `✅ Deleted ${amount} messages!`, ephemeral: true });
  }

  if (commandName === 'serverinfo') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Server Information')
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: 'Server Name', value: interaction.guild.name, inline: true },
        { name: 'Members', value: `${interaction.guild.memberCount}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'userinfo') {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('👤 User Information')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Username', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ping') {
    await interaction.reply(`🏓 Pong! API Latency: ${Math.round(client.ws.ping)}ms`);
  }

  if (commandName === 'poll') {
    const question = interaction.options.getString('question');
    const embed = new EmbedBuilder()
      .setColor('#ffa500')
      .setTitle('📊 Poll')
      .setDescription(question)
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react('👍');
    await msg.react('👎');
  }

  if (commandName === '8ball') {
    const question = interaction.options.getString('question');
    const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not', 'Ask again later', 'I don\'t think so', 'Without a doubt', 'Very doubtful', 'It is certain', 'Cannot predict now'];
    const response = responses[Math.floor(Math.random() * responses.length)];
    await interaction.reply(`🎱 ${response}`);
  }

  if (commandName === 'dice') {
    const roll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply(`🎲 You rolled a ${roll}!`);
  }

  if (commandName === 'coinflip') {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await interaction.reply(`🪙 ${result}!`);
  }

  if (commandName === 'balance') {
    const user = interaction.options.getUser('user') || interaction.user;
    const bal = economy.get(user.id) || { coins: 0, lastDaily: null, lastWork: null };
    await interaction.reply(`💰 ${user.tag} has **${bal.coins}** coins!`);
  }

  if (commandName === 'work') {
    const userId = interaction.user.id;
    const userData = economy.get(userId) || { coins: 0, lastDaily: null, lastWork: null };
    
    const now = Date.now();
    if (userData.lastWork && now - userData.lastWork < 60000) {
      return interaction.reply({ content: '❌ You can work again in 1 minute!', ephemeral: true });
    }
    
    const earned = Math.floor(Math.random() * 100) + 50;
    userData.coins += earned;
    userData.lastWork = now;
    economy.set(userId, userData);
    await interaction.reply(`💼 You worked and earned **${earned}** coins!`);
  }

  if (commandName === 'daily') {
    const userId = interaction.user.id;
    const userData = economy.get(userId) || { coins: 0, lastDaily: null, lastWork: null };
    
    const now = Date.now();
    if (userData.lastDaily && now - userData.lastDaily < 86400000) {
      return interaction.reply({ content: '❌ You already claimed your daily reward! Try again tomorrow.', ephemeral: true });
    }
    
    userData.coins += 500;
    userData.lastDaily = now;
    economy.set(userId, userData);
    await interaction.reply(`🎁 You claimed your daily reward of **500** coins!`);
  }

  if (commandName === 'pay') {
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    if (amount <= 0) {
      return interaction.reply({ content: '❌ Amount must be greater than 0!', ephemeral: true });
    }
    
    if (recipient.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot pay yourself!', ephemeral: true });
    }
    
    const userData = economy.get(interaction.user.id) || { coins: 0, lastDaily: null, lastWork: null };
    
    if (userData.coins < amount) {
      return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }
    
    const recipientData = economy.get(recipient.id) || { coins: 0, lastDaily: null, lastWork: null };
    userData.coins -= amount;
    recipientData.coins += amount;
    economy.set(interaction.user.id, userData);
    economy.set(recipient.id, recipientData);
    
    await interaction.reply(`💸 You paid **${amount}** coins to ${recipient.tag}!`);
  }

  if (commandName === 'gstart') {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const winners = interaction.options.getInteger('winners');
    
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>\n\nReact with 🎉 to enter!`)
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp();
    
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react('🎉');
    
    giveaways.set(msg.id, {
      prize,
      winners,
      endTime: Date.now() + duration * 60000,
      hostId: interaction.user.id,
      channelId: interaction.channel.id
    });
    
    setTimeout(async () => {
      const message = await interaction.channel.messages.fetch(msg.id);
      const reaction = message.reactions.cache.get('🎉');
      
      if (!reaction || reaction.users.cache.size === 0) {
        return interaction.channel.send('❌ Not enough participants!');
      }
      
      const users = (await reaction.users.fetch()).filter(u => !u.bot);
      
      if (users.size < winners) {
        return interaction.channel.send('❌ Not enough participants!');
      }
      
      const winnersList = users.random(winners);
      const winnerMentions = winnersList.map(u => `<@${u.id}>`).join(', ');
      
      const winEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Giveaway Ended!')
        .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnerMentions}`)
        .setTimestamp();
      
      await message.edit({ embeds: [winEmbed] });
      await interaction.channel.send(`🎊 Congratulations ${winnerMentions}! You won **${prize}**!`);
      giveaways.delete(msg.id);
    }, duration * 60000);
  }

  if (commandName === 'gend') {
    const messageId = interaction.options.getString('message_id');
    const giveaway = giveaways.get(messageId);
    
    if (!giveaway) {
      return interaction.reply({ content: '❌ Giveaway not found!', ephemeral: true });
    }
    
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(messageId);
    const reaction = message.reactions.cache.get('🎉');
    
    if (!reaction || reaction.users.cache.size === 0) {
      return interaction.reply({ content: '❌ Not enough participants!', ephemeral: true });
    }
    
    const users = (await reaction.users.fetch()).filter(u => !u.bot);
    
    if (users.size < giveaway.winners) {
      return interaction.reply({ content: '❌ Not enough participants!', ephemeral: true });
    }
    
    const winnersList = users.random(giveaway.winners);
    const winnerMentions = winnersList.map(u => `<@${u.id}>`).join(', ');
    
    const winEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🎉 Giveaway Ended!')
      .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winnerMentions}`)
      .setTimestamp();
    
    await message.edit({ embeds: [winEmbed] });
    await interaction.reply(`🎊 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
    giveaways.delete(messageId);
  }

  if (commandName === 'greroll') {
    const messageId = interaction.options.getString('message_id');
    
    try {
      const message = await interaction.channel.messages.fetch(messageId);
      const reaction = message.reactions.cache.get('🎉');
      
      if (!reaction) {
        return interaction.reply({ content: '❌ No giveaway found!', ephemeral: true });
      }
      
      const users = (await reaction.users.fetch()).filter(u => !u.bot);
      
      if (users.size === 0) {
        return interaction.reply({ content: '❌ No participants to reroll!', ephemeral: true });
      }
      
      const winner = users.random();
      await interaction.reply(`🎊 New winner: <@${winner.id}>!`);
    } catch (error) {
      return interaction.reply({ content: '❌ Message not found in this channel!', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
