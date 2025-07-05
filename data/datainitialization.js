const { default: mongoose } = require("mongoose")


            const seasonData = [
                {
                    title: "Season 1",
                    duration: 90, // 90 days
                    isActive: "active",
                    startedAt: new Date()
                },
                {
                    title: "Season 2",
                    duration: 90,
                    isActive: "upcoming",
                    startedAt: new Date(new Date().setMonth(new Date().getMonth() + 3)) // Starts in 3 months
                }
            ]
exports.seasonData = seasonData;
// #endregion
// #region CHAPTERS


const chapterlistdata = [
                    {
                        
                        name: "chapter1challenge1",
                        completed: false,
                        chapter: 101
                    },
                    {
                        
                        name: "chapter1challenge2",
                        completed: false,
                        chapter: 102
                    },
                    {
                        
                        name: "chapter1challenge3",
                        completed: false,
                        chapter: 103
                    },
                    {
                        
                        name: "chapter2challenge1",
                        completed: false,
                        chapter: 201
                    },
                    {
                        
                        name: "chapter2challenge2",
                        completed: false,
                        chapter: 202
                    },
                    {
                        
                        name: "chapter2challenge3",
                        completed: false,
                        chapter: 203
                    },
                    {
                        
                        name: "chapter3challenge1",
                        completed: false,
                        chapter: 301
                    },
                    {
                        
                        name: "chapter3challenge2",
                        completed: false,
                        chapter: 302
                    },
                    {
                        
                        name: "chapter3challenge3",
                        completed: false,
                        chapter: 303
                    },
                    {
                        
                        name: "chapter4challenge1",
                        completed: false,
                        chapter: 401
                    },
                    {
                        
                        name: "chapter4challenge2",
                        completed: false,
                        chapter: 402
                    },
                    {
                        
                        name: "chapter4challenge3",
                        completed: false,
                        chapter: 403
                    },
                    {
                        
                        name: "chapter5challenge1",
                        completed: false,
                        chapter: 501
                    },
                    {
                        
                        name: "chapter5challenge2",
                        completed: false,
                        chapter: 502
                    },
                    {
                        
                        name: "chapter5challenge3",
                        completed: false,
                        chapter: 503
                    },
                    {
                        
                        name: "chapter6challenge1",
                        completed: false,
                        chapter: 601
                    },
                    {
                        
                        name: "chapter6challenge2",
                        completed: false,
                        chapter: 602
                    },
                    {
                        
                        name: "chapter6challenge3",
                        completed: false,
                        chapter: 603
                    },
                    {
                        
                        name: "chapter7challenge1",
                        completed: false,
                        chapter: 701
                    },
                    {
                        
                        name: "chapter7challenge2",
                        completed: false,
                        chapter: 702
                    },
                    {
                        
                        name: "chapter7challenge3",
                        completed: false,
                        chapter: 703
                    },
                    {
                        
                        name: "chapter8challenge1",
                        completed: false,
                        chapter: 801
                    },
                    {
                        
                        name: "chapter8challenge2",
                        completed: false,
                        chapter: 802
                    },
                    {
                        
                        name: "chapter8challenge3",
                        completed: false,
                        chapter: 803
                    },
                    {
                        
                        name: "chapter9challenge1",
                        completed: false,
                        chapter: 901
                    },
                    {
                        
                        name: "chapter9challenge2",
                        completed: false,
                        chapter: 902
                    },
                    {
                        
                        name: "chapter9challenge3",
                        completed: false,
                        chapter: 903
                    },
                    {
                        
                        name: "chapter10challenge1",
                        completed: false,
                        chapter: 1001
                    },
                    {
                        
                        name: "chapter10challenge2",
                        completed: false,
                        chapter: 1002
                    },
                    {
                        
                        name: "chapter10challenge3",
                        completed: false,
                        chapter: 1003
                    },
                    {
                        
                        name: "chapter11challenge1",
                        completed: false,
                        chapter: 1101
                    },
                    {
                        
                        name: "chapter11challenge2",
                        completed: false,
                        chapter: 1102
                    },
                    {
                        
                        name: "chapter11challenge3",
                        completed: false,
                        chapter: 1103
                    },
                    {
                        
                        name: "chapter12challenge1",
                        completed: false,
                        chapter: 1201
                    },
                    {
                        
                        name: "chapter12challenge2",
                        completed: false,
                        chapter: 1202
                    },
                    {
                        
                        name: "chapter12challenge3",
                        completed: false,
                        chapter: 1203
                    },
                    {
                        
                        name: "chapter13challenge1",
                        completed: false,
                        chapter: 1301
                    },
                    {
                        
                        name: "chapter13challenge2",
                        completed: false,
                        chapter: 1302
                    },
                    {
                        
                        name: "chapter13challenge3",
                        completed: false,
                        chapter: 1303
                    },
                    {
                        
                        name: "chapter14challenge1",
                        completed: false,
                        chapter: 1401
                    },
                    {
                        
                        name: "chapter14challenge2",
                        completed: false,
                        chapter: 1402
                    },
                    {
                        
                        name: "chapter14challenge3",
                        completed: false,
                        chapter: 1403
                    },
                    {
                        
                        name: "chapter15challenge1",
                        completed: false,
                        chapter: 1501
                    },
                    {
                        
                        name: "chapter15challenge2",
                        completed: false,
                        chapter: 1502
                    },
                    {
                        
                        name: "chapter15challenge3",
                        completed: false,
                        chapter: 1503
                    },
                    {
                        
                        name: "chapter16challenge1",
                        completed: false,
                        chapter: 1601
                    },
                    {
                        
                        name: "chapter16challenge2",
                        completed: false,
                        chapter: 1602
                    },
                    {
                        
                        name: "chapter16challenge3",
                        completed: false,
                        chapter: 1603
                    },
                ]
exports.chapterlistdata = chapterlistdata;

// #endregion
// #region QUESTMISSIONS
const questmissionsdata = [
                        {
                        missionName: "Participate in PvP",
                        description: "Join a PvP match.",
                        xpReward: 100,
                        requirements: { pvpparticipated: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Participate in Raid",
                        description: "Join a raid battle.",
                        xpReward: 100,
                        requirements: { raidparticipated: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Daily Spin",
                        description: "Use the daily spin.",
                        xpReward: 100,
                        requirements: { dailyspin: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Daily Login",
                        description: "Claim your daily login reward.",
                        xpReward: 100,
                        requirements: { dailyloginclaimed: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Story Challenge",
                        description: "Complete a story chapter challenge.",
                        xpReward: 100,
                        requirements: { storychapters: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Defeat Enemies",
                        description: "Defeat enemies in any mode.",
                        xpReward: 100,
                        requirements: { enemiesdefeated: 15 },
                        daily: true,
                    },
                    {
                        missionName: "Deal Damage",
                        description: "Deal damage in battles.",
                        xpReward: 100,
                        requirements: { totaldamage: 15000 },
                        daily: true,
                    },
                    {
                        missionName: "Make Friends",
                        description: "Add a new friend.",
                        xpReward: 100,
                        requirements: { friendsadded: 1 },
                        daily: true,
                    },
                    {
                        missionName: "Self Healing",
                        description: "Heal yourself in battle.",
                        xpReward: 100,
                        requirements: { selfheal: 3000 },
                        daily: true,
                    },
                    {
                        missionName: "Win PvP Matches",
                        description: "Win matches in PvP mode.",
                        xpReward: 100,
                        requirements: { pvpwins: 5 },
                        daily: true,
                    },
]

exports.questmissionsdata = questmissionsdata;

// #endregion
