const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(process.env.PORT || 3000);

const TOKEN = process.env.BOT_TOKEN;         
const CLIENT_ID = '1564919997732495398'; 
const DELAY_BETWEEN_DMS = 2000;              

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('dmping')
        .setDescription('Broadcast an embedded announcement message to all server members via DM.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The main heading of your announcement')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The body text of the announcement')
                .setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`🚀 Bot logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('🔄 Registering global slash commands with Discord...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Successfully registered slash commands!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'dmping') {
        await interaction.deferReply();
        const embedTitle = interaction.options.getString('title');
        const embedDescription = interaction.options.getString('message');

        try {
            await interaction.guild.members.fetch();
        } catch (error) {
            return interaction.editReply('❌ Failed to pull server members.');
        }

        const humanMembers = interaction.guild.members.cache.filter(member => !member.user.bot);
        const totalTargets = humanMembers.size;

        await interaction.editReply(`📡 Found ${totalTargets} members. Starting DM broadcast...`);

        const announcementEmbed = new EmbedBuilder()
            .setColor('#FF0000') 
            .setTitle(embedTitle.toUpperCase())
            .setDescription(`**${embedDescription}**`)
            .setFooter({ text: `Broadcasted via ${interaction.guild.name}` })
            .setTimestamp();

        let successCount = 0;
        let failCount = 0;
        let currentCount = 0;

        for (const [memberId, member] of humanMembers) {
            currentCount++;
            try {
                await member.send({ embeds: [announcementEmbed] });
                successCount++;
            } catch (err) {
                failCount++;
            }

            if (currentCount % 5 === 0 || currentCount === totalTargets) {
                await interaction.editReply(`🔄 Progress: ${currentCount}/${totalTargets}\n✅ Sent: ${successCount} | ❌ Failed: ${failCount}`).catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DMS));
        }
        await interaction.followUp(`📢 **DM Broadcast Complete!**\n📬 Reached: **${successCount}** users.\n🔒 Blocked: **${failCount}** users.`);
    }
});

client.login(TOKEN);
