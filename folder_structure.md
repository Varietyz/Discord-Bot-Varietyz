```
├─ 📄 .env
├─ 📄 .eslintignore
├─ 📜 .eslintrc.js
├─ 📂 .vscode
│   ├─ 🔧 launch.json
│   ├─ 📂 scripts
│   │   └─ 📜 replaceEphemeral.js
│   ├─ 🔧 settings.json
│   └─ 📄 Varietyz Bot.code-workspace
├─ 📝 CODE_OF_CONDUCT.md
├─ 📝 CONTRIBUTING.md
├─ 📂 Folder Builder
│   └─ 🐍 build_folders.py
├─ 📄 folder_structure.txt
├─ 📂 Generic Resource Distribution
│   ├─ 🖼️ step_10_lg.png
│   ├─ 🖼️ step_11_lg.png
│   ├─ 🖼️ step_12_lg.png
│   ├─ 🖼️ Step_3_lg.png
│   ├─ 🖼️ step_4_lg.png
│   ├─ 🖼️ step_5_lg.png
│   ├─ 🖼️ step_6_lg.png
│   ├─ 🖼️ step_7_lg.png
│   ├─ 🖼️ step_8_lg.png
│   └─ 🖼️ step_9_lg.png
├─ 🔧 jsdoc.json
├─ 📘 JSDOC_README.md
├─ ⚖️ LICENSE
├─ 🔧 package.json
├─ 📂 PSD
│   ├─ 📄 BingoCard.psd
│   ├─ 📄 botw_banner.psd
│   ├─ 📄 Discord Server Banner.psd
│   ├─ 📄 SOTW_BOTW_GIF.psd
│   └─ 📄 validated_cross.psd
├─ 📘 README.md
├─ 📂 readme_collection
│   ├─ 📝 bingo-event.md
│   ├─ 📘 BINGO_README.MD
│   ├─ 📝 Clan_Social_Research.md
│   ├─ 📘 readme.md
│   └─ 📝 Varietyz_Social_Report.md
├─ 📂 src
│   ├─ 📂 api
│   │   ├─ 📂 G_drive
│   │   │   ├─ 🔧 client_secret_645212768818-tq28bhet0e6celo50fnils1dn0335qqs.apps.googleusercontent.com.json
│   │   │   └─ 🔧 roseyrs-7c850a3d95e0.json
│   │   └─ 📂 wise_old_man
│   │       └─ 📜 apiClient.js
│   ├─ 📂 assets
│   │   └─ 📄 runescape_bold.ttf
│   ├─ 📂 config
│   │   ├─ 📜 constants.js
│   │   ├─ 📜 customModalIds.js
│   │   ├─ 📜 easterEggs.js
│   │   └─ 📜 globalState.js
│   ├─ 📂 data
│   │   ├─ 📜 cache.js
│   │   ├─ 📄 database.sqlite
│   │   ├─ 📄 guild.db
│   │   ├─ 📄 image_cache.db
│   │   ├─ 📄 messages.db
│   │   └─ 📂 tools
│   │       └─ 📜 sortDatabase.js
│   ├─ 📜 main.js
│   ├─ 📂 migrations
│   │   ├─ 📜 initializeBingoTables.js
│   │   ├─ 📜 initializeGuildTables.js
│   │   ├─ 📜 initializeMainTables.js
│   │   ├─ 📜 migrateEndedCompetitions.js
│   │   ├─ 📜 migrateRsn.js
│   │   ├─ 📜 populateHiscoreActivities.js
│   │   ├─ 📜 populateImageCache.js
│   │   └─ 📜 populateSkillsBosses.js
│   ├─ 📂 modules
│   │   ├─ 📂 collection
│   │   │   ├─ 📜 msgDatabase.js
│   │   │   ├─ 📜 msgDbConstants.js
│   │   │   ├─ 📜 msgDbSave.js
│   │   │   ├─ 📜 msgDbUtils.js
│   │   │   ├─ 📜 msgFetcher.js
│   │   │   └─ 📜 msgReorder.js
│   │   ├─ 📂 commands
│   │   │   ├─ 📂 admin
│   │   │   │   ├─ 📂 competitions
│   │   │   │   │   ├─ 📜 queueCompetition.js
│   │   │   │   │   ├─ 📜 setRotationPeriod.js
│   │   │   │   │   └─ 📜 updateTop10Channel.js
│   │   │   │   ├─ 📂 database
│   │   │   │   │   ├─ 📜 ccKeys.js
│   │   │   │   │   ├─ 📜 databaseViewer.js
│   │   │   │   │   ├─ 📜 editDatabase.js
│   │   │   │   │   ├─ 📜 registerSecretKeyCC.js
│   │   │   │   │   └─ 📜 removeSecretKeyCC.js
│   │   │   │   ├─ 📂 guild
│   │   │   │   │   ├─ 📜 guildChannelsSetup.js
│   │   │   │   │   ├─ 📜 setupBasicChannels.js
│   │   │   │   │   ├─ 📜 setupBingoChannels.js
│   │   │   │   │   ├─ 📜 setupClanChat.js
│   │   │   │   │   ├─ 📜 setupCompetitions.js
│   │   │   │   │   ├─ 📜 setupLiveGains.js
│   │   │   │   │   ├─ 📜 setupLogging.js
│   │   │   │   │   ├─ 📜 syncAll.js
│   │   │   │   │   ├─ 📜 syncCache.js
│   │   │   │   │   ├─ 📜 syncEmojis.js
│   │   │   │   │   ├─ 📜 syncMembers.js
│   │   │   │   │   ├─ 📜 syncRoles.js
│   │   │   │   │   ├─ 📜 syncServer.js
│   │   │   │   │   └─ 📜 updateClannieChannel.js
│   │   │   │   └─ 📂 user
│   │   │   │       ├─ 📜 assignRsn.js
│   │   │   │       ├─ 📜 checkActivity.js
│   │   │   │       ├─ 📜 removeRsn.js
│   │   │   │       ├─ 📜 renameRsn.js
│   │   │   │       └─ 📜 rsnList.js
│   │   │   ├─ 📂 bingo
│   │   │   │   ├─ 📂 admin
│   │   │   │   │   ├─ 📜 bingoEvent.js
│   │   │   │   │   ├─ 📜 bingoManagement.js
│   │   │   │   │   └─ 📜 bingoRandomProgress.js
│   │   │   │   ├─ 📜 sharePoints.js
│   │   │   │   ├─ 📂 teams
│   │   │   │   │   └─ 📜 teamManagement.js
│   │   │   │   └─ 📜 viewCards.js
│   │   │   └─ 📂 user
│   │   │       ├─ 📜 analytics.js
│   │   │       ├─ 📜 help.js
│   │   │       ├─ 📜 listCompetitions.js
│   │   │       ├─ 📜 profile.js
│   │   │       ├─ 📜 removeRsn.js
│   │   │       ├─ 📜 rsn.js
│   │   │       ├─ 📂 tutorials
│   │   │       │   ├─ 📜 clanchatTutorial.js
│   │   │       │   ├─ 📜 fightCavesTutorial.js
│   │   │       │   └─ 📜 liveGainsTutorial.js
│   │   │       └─ 📜 wallet.js
│   │   ├─ 📂 events
│   │   │   ├─ 📂 boosts
│   │   │   │   ├─ 📜 memberBoost.js
│   │   │   │   └─ 📜 memberUnboost.js
│   │   │   ├─ 📂 bot
│   │   │   │   ├─ 📜 debug.js
│   │   │   │   ├─ 📜 error.js
│   │   │   │   ├─ 📜 rateLimit.js
│   │   │   │   ├─ 📂 shards
│   │   │   │   │   ├─ 📜 shardDisconnect.js
│   │   │   │   │   ├─ 📜 shardError.js
│   │   │   │   │   ├─ 📜 shardReady.js
│   │   │   │   │   ├─ 📜 shardReconnecting.js
│   │   │   │   │   └─ 📜 shardResume.js
│   │   │   │   └─ 📜 warn.js
│   │   │   ├─ 📂 channels
│   │   │   │   ├─ 📜 channelCreate.js
│   │   │   │   ├─ 📜 channelDelete.js
│   │   │   │   ├─ 📜 channelPinsUpdate.js
│   │   │   │   ├─ 📜 channelUpdate.js
│   │   │   │   └─ 📂 threads
│   │   │   │       ├─ 📜 threadCreate.js
│   │   │   │       ├─ 📜 threadDelete.js
│   │   │   │       ├─ 📘 threadMemberUpdate.js
│   │   │   │       ├─ 📜 threadStateUpdate.js
│   │   │   │       └─ 📜 threadUpdate.js
│   │   │   ├─ 📂 client
│   │   │   │   ├─ 📜 interactionCreate.js
│   │   │   │   ├─ 📜 raw.js
│   │   │   │   ├─ 📜 ready.js
│   │   │   │   └─ 📜 webhooksUpdate.js
│   │   │   ├─ 📂 emojis
│   │   │   │   ├─ 📜 emojiCreate.js
│   │   │   │   ├─ 📜 emojiDelete.js
│   │   │   │   └─ 📜 emojiUpdate.js
│   │   │   ├─ 📂 guild
│   │   │   │   ├─ 📜 guildBanAdd.js
│   │   │   │   ├─ 📜 guildBanRemove.js
│   │   │   │   ├─ 📜 guildIntegrationsUpdate.js
│   │   │   │   ├─ 📜 guildUpdate.js
│   │   │   │   └─ 📂 invites
│   │   │   │       ├─ 📜 inviteCreate.js
│   │   │   │       └─ 📜 inviteDelete.js
│   │   │   ├─ 📂 messages
│   │   │   │   ├─ 📜 messageCreate.js
│   │   │   │   ├─ 📜 messageDelete.js
│   │   │   │   ├─ 📜 messageDeleteBulk.js
│   │   │   │   ├─ 📜 messageReactionAdd.js
│   │   │   │   ├─ 📜 messageReactionRemoveEmoji.js
│   │   │   │   └─ 📜 messageUpdate.js
│   │   │   ├─ 📂 roles
│   │   │   │   ├─ 📜 roleCreate.js
│   │   │   │   ├─ 📜 roleDelete.js
│   │   │   │   └─ 📜 roleUpdate.js
│   │   │   ├─ 📂 scheduled
│   │   │   │   ├─ 📜 scheduledEventCreate.js
│   │   │   │   ├─ 📜 scheduledEventDelete.js
│   │   │   │   ├─ 📜 scheduledEventUpdate.js
│   │   │   │   ├─ 📜 scheduledEventUserAdd.js
│   │   │   │   └─ 📜 scheduledEventUserRemove.js
│   │   │   ├─ 📂 stages
│   │   │   │   ├─ 📜 stageInstanceCreate.js
│   │   │   │   ├─ 📜 stageInstanceDelete.js
│   │   │   │   └─ 📜 stageInstanceUpdate.js
│   │   │   └─ 📂 user
│   │   │       ├─ 📜 guildMemberAdd.js
│   │   │       ├─ 📜 guildMemberRemove.js
│   │   │       ├─ 📜 guildMemberUpdate.js
│   │   │       ├─ 📜 presenceUpdate.js
│   │   │       └─ 📜 voiceStateUpdate.js
│   │   ├─ 📂 modals
│   │   │   └─ 📜 registerCCWebhookModal.js
│   │   ├─ 📂 services
│   │   │   ├─ 📜 activeMembers.js
│   │   │   ├─ 📜 autoRoles.js
│   │   │   ├─ 📂 bingo
│   │   │   │   ├─ 📜 autoTransitionEvents.js
│   │   │   │   ├─ 📜 bingoCalculations.js
│   │   │   │   ├─ 📜 bingoImageGenerator.js
│   │   │   │   ├─ 📜 bingoLeaderboard.js
│   │   │   │   ├─ 📜 bingoPatternRecognition.js
│   │   │   │   ├─ 📜 bingoPatterns.js
│   │   │   │   ├─ 📜 bingoService.js
│   │   │   │   ├─ 📜 bingoStateManager.js
│   │   │   │   ├─ 📜 bingoTaskManager.js
│   │   │   │   ├─ 📜 bingoUtils.js
│   │   │   │   ├─ 📜 dynamicTaskGenerator.js
│   │   │   │   └─ 📂 embeds
│   │   │   │       ├─ 📜 bingoEmbedData.js
│   │   │   │       ├─ 📜 bingoEmbeds.js
│   │   │   │       ├─ 📜 bingoInfoData.js
│   │   │   │       ├─ 📜 bingoPatternNotifications.js
│   │   │   │       ├─ 📘 bingoReadme.js
│   │   │   │       └─ 📂 handling
│   │   │   │           ├─ 📜 bingoEmbedHelper.js
│   │   │   │           └─ 📜 bingoEmbedManager.js
│   │   │   ├─ 📂 competitionServices
│   │   │   │   ├─ 📜 alltimeCompetitionWinners.js
│   │   │   │   ├─ 📜 competitionCreator.js
│   │   │   │   ├─ 📜 competitionService.js
│   │   │   │   ├─ 📜 competitionValidator.js
│   │   │   │   ├─ 📜 competitionWinners.js
│   │   │   │   ├─ 📜 embedHandler.js
│   │   │   │   ├─ 📜 helpers.js
│   │   │   │   ├─ 📜 leaderboardUpdater.js
│   │   │   │   └─ 📜 scheduler.js
│   │   │   ├─ 📜 memberChannel.js
│   │   │   ├─ 📜 nameChanges.js
│   │   │   └─ 📜 playerDataExtractor.js
│   │   └─ 📂 utils
│   │       ├─ 📂 essentials
│   │       │   ├─ 📜 dbUtils.js
│   │       │   ├─ 📜 ensureBasicChannels.js
│   │       │   ├─ 📜 ensureBingoCategory.js
│   │       │   ├─ 📜 ensureChannels.js
│   │       │   ├─ 📜 ensureChannelsConfig.js
│   │       │   ├─ 📜 ensureCompetitionCategory.js
│   │       │   ├─ 📜 ensureLiveGainsCategory.js
│   │       │   ├─ 📜 ensureLoggingCategory.js
│   │       │   ├─ 📜 forceDbNameChange.js
│   │       │   ├─ 📜 logger.js
│   │       │   ├─ 📜 modalHandler.js
│   │       │   ├─ 📜 orphanCleaner.js
│   │       │   ├─ 📜 sanitizer.js
│   │       │   ├─ 📜 slashCommandHandler.js
│   │       │   ├─ 📜 syncClanRanks.js
│   │       │   ├─ 📜 syncTeamData.js
│   │       │   ├─ 📜 updatePlayerData.js
│   │       │   └─ 📜 updatePlayerPoints.js
│   │       ├─ 📂 fetchers
│   │       │   ├─ 📜 fetchPlayerData.js
│   │       │   ├─ 📜 fetchRankEmojis.js
│   │       │   ├─ 📜 getChannel.js
│   │       │   ├─ 📜 getCompMetricEmoji.js
│   │       │   ├─ 📜 getEmoji.js
│   │       │   ├─ 📜 getEmojiWithFallback.js
│   │       │   ├─ 📜 getPlayerLink.js
│   │       │   ├─ 📜 getPlayerPoints.js
│   │       │   ├─ 📜 getPlayerRank.js
│   │       │   ├─ 📜 getPlayerRsn.js
│   │       │   ├─ 📜 getTeamName.js
│   │       │   └─ 📜 lastFetchedTime.js
│   │       ├─ 📂 helpers
│   │       │   ├─ 📜 calculateActivity.js
│   │       │   ├─ 📜 capitalizeName.js
│   │       │   ├─ 📜 cleanupInactiveUsers.js
│   │       │   ├─ 📂 commands
│   │       │   │   └─ 📂 bingo
│   │       │   │       └─ 📂 teams
│   │       │   │           ├─ 📜 handleCreate.js
│   │       │   │           ├─ 📜 handleJoin.js
│   │       │   │           ├─ 📜 handleLeave.js
│   │       │   │           ├─ 📜 handleList.js
│   │       │   │           └─ 📜 teamCommandHelpers.js
│   │       │   ├─ 📜 dateUtils.js
│   │       │   ├─ 📜 embedUtils.js
│   │       │   ├─ 📜 formatCustomEmoji.js
│   │       │   ├─ 📜 purgeChannel.js
│   │       │   ├─ 📜 rankUtils.js
│   │       │   ├─ 📜 sleepUtil.js
│   │       │   ├─ 📜 tallyVotes.js
│   │       │   └─ 📜 validateRsn.js
│   │       └─ 📂 normalizing
│   │           ├─ 📜 normalizeKey.js
│   │           ├─ 📜 normalizeRsn.js
│   │           ├─ 📜 normalizeStr.js
│   │           └─ 📜 normalizeUpper.js
│   ├─ 📂 scripts
│   │   ├─ 📜 createGuildDb.js
│   │   ├─ 📜 createImgDb.js
│   │   ├─ 📜 createMainDb.js
│   │   ├─ 📜 dropBingoDb.js
│   │   ├─ 📜 dropCompDb.js
│   │   ├─ 📜 dropGuildDb.js
│   │   ├─ 📜 dropImgDb.js
│   │   ├─ 📜 dropMainDb.js
│   │   └─ 📜 dropMsgDb.js
│   └─ 📜 tasks.js
├─ 📄 src.zip
├─ 📄 template.hbs
└─ 📝 TODO.md
```