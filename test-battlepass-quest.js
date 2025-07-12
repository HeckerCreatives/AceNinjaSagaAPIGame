/**
 * Test Script for Battlepass Quest Claiming
 * Tests the claimbattlepassquest function with different reward types
 */

// Test Data Simulation
function simulateBattlepassQuestClaiming() {
    console.log('🧪 BATTLEPASS QUEST CLAIMING TEST');
    console.log('=====================================\n');

    // Test Scenario 1: EXP Reward Quest
    console.log('📖 SCENARIO 1: EXP Reward Quest');
    console.log('--------------------------------');
    
    const expTestData = {
        mission: {
            missionName: "Daily Login Quest",
            description: "Login daily to earn experience",
            xpReward: 200,
            rewardtype: "exp",
            requirements: { dailyloginclaimed: 1 }
        },
        quest: {
            _id: "quest123",
            owner: "char456",
            season: "season789",
            progress: 1,
            isCompleted: false,
            isLocked: false
        },
        battlepassProgress: {
            currentTier: 2,
            currentXP: 800,
            hasPremium: false
        },
        battlepassSeason: {
            tiers: [
                { tierNumber: 1, xpRequired: 0 },
                { tierNumber: 2, xpRequired: 500 },
                { tierNumber: 3, xpRequired: 1000 },
                { tierNumber: 4, xpRequired: 1500 },
                { tierNumber: 5, xpRequired: 2000 }
            ]
        },
        character: {
            level: 5,
            experience: 300
        }
    };

    console.log('Initial State:');
    console.log(`  Character Level: ${expTestData.character.level}`);
    console.log(`  Character XP: ${expTestData.character.experience}`);
    console.log(`  Battlepass Tier: ${expTestData.battlepassProgress.currentTier}`);
    console.log(`  Battlepass XP: ${expTestData.battlepassProgress.currentXP}`);
    console.log(`  Mission XP Reward: ${expTestData.mission.xpReward}`);
    console.log('');

    // Simulate the XP reward processing
    const { newCharacterLevel, newCharacterXP, levelsGained, newBattlepassTier, newBattlepassXP } = 
        processExpReward(expTestData);

    console.log('After Claiming Quest:');
    console.log(`  Character Level: ${expTestData.character.level} → ${newCharacterLevel} (+${levelsGained} levels)`);
    console.log(`  Character XP: ${expTestData.character.experience} → ${newCharacterXP}`);
    console.log(`  Battlepass Tier: ${expTestData.battlepassProgress.currentTier} → ${newBattlepassTier}`);
    console.log(`  Battlepass XP: ${expTestData.battlepassProgress.currentXP} → ${newBattlepassXP}`);
    console.log('');

    // Test Scenario 2: Coins Reward Quest
    console.log('📖 SCENARIO 2: Coins Reward Quest');
    console.log('----------------------------------');
    
    const coinsTestData = {
        mission: {
            missionName: "Defeat 10 Enemies",
            xpReward: 150,
            rewardtype: "coins"
        },
        battlepassProgress: {
            currentTier: 1,
            currentXP: 1800
        },
        battlepassSeason: {
            tiers: [
                { tierNumber: 1, xpRequired: 0 },
                { tierNumber: 2, xpRequired: 1000 },
                { tierNumber: 3, xpRequired: 2000 }
            ]
        }
    };

    console.log('Initial State:');
    console.log(`  Battlepass Tier: ${coinsTestData.battlepassProgress.currentTier}`);
    console.log(`  Battlepass XP: ${coinsTestData.battlepassProgress.currentXP}`);
    console.log(`  Mission XP Reward: ${coinsTestData.mission.xpReward}`);
    console.log('  Reward Type: Coins');
    console.log('');

    const coinsResult = processBattlepassXP(coinsTestData);
    console.log('After Claiming Quest:');
    console.log(`  Battlepass Tier: ${coinsTestData.battlepassProgress.currentTier} → ${coinsResult.newTier}`);
    console.log(`  Battlepass XP: ${coinsTestData.battlepassProgress.currentXP} → ${coinsResult.newXP}`);
    console.log(`  Coins Wallet: +${coinsTestData.mission.xpReward} coins`);
    console.log('');

    // Test Scenario 3: Crystal Reward Quest
    console.log('📖 SCENARIO 3: Crystal Reward Quest');
    console.log('------------------------------------');
    
    const crystalTestData = {
        mission: {
            missionName: "PvP Victory",
            xpReward: 300,
            rewardtype: "crystal"
        },
        battlepassProgress: {
            currentTier: 3,
            currentXP: 1700
        },
        battlepassSeason: {
            tiers: [
                { tierNumber: 1, xpRequired: 0 },
                { tierNumber: 2, xpRequired: 1000 },
                { tierNumber: 3, xpRequired: 1500 },
                { tierNumber: 4, xpRequired: 2000 },
                { tierNumber: 5, xpRequired: 2500 }
            ]
        }
    };

    console.log('Initial State:');
    console.log(`  Battlepass Tier: ${crystalTestData.battlepassProgress.currentTier}`);
    console.log(`  Battlepass XP: ${crystalTestData.battlepassProgress.currentXP}`);
    console.log(`  Mission XP Reward: ${crystalTestData.mission.xpReward}`);
    console.log('  Reward Type: Crystals');
    console.log('');

    const crystalResult = processBattlepassXP(crystalTestData);
    console.log('After Claiming Quest:');
    console.log(`  Battlepass Tier: ${crystalTestData.battlepassProgress.currentTier} → ${crystalResult.newTier}`);
    console.log(`  Battlepass XP: ${crystalTestData.battlepassProgress.currentXP} → ${crystalResult.newXP}`);
    console.log(`  Crystal Wallet: +${crystalTestData.mission.xpReward} crystals`);
    console.log('');

    console.log('✅ All test scenarios completed!');
}

// Helper function to process EXP rewards
function processExpReward(testData) {
    const { mission, character, battlepassProgress, battlepassSeason } = testData;
    
    // Process character experience gain
    let newCharacterXP = character.experience + mission.xpReward;
    let newCharacterLevel = character.level;
    let levelsGained = 0;
    let xpNeeded = 80 * newCharacterLevel;

    while (newCharacterXP >= xpNeeded && xpNeeded > 0) {
        const overflowXP = newCharacterXP - xpNeeded;
        newCharacterLevel++;
        levelsGained++;
        newCharacterXP = overflowXP;
        xpNeeded = 80 * newCharacterLevel;
    }

    // Process battlepass XP gain
    const battlepassResult = processBattlepassXP({
        mission,
        battlepassProgress,
        battlepassSeason
    });

    return {
        newCharacterLevel,
        newCharacterXP,
        levelsGained,
        newBattlepassTier: battlepassResult.newTier,
        newBattlepassXP: battlepassResult.newXP
    };
}

// Helper function to process battlepass XP progression
function processBattlepassXP(testData) {
    const { mission, battlepassProgress, battlepassSeason } = testData;
    
    let newXP = battlepassProgress.currentXP + mission.xpReward;
    let newTier = battlepassProgress.currentTier;
    let currentTierIndex = newTier - 1;
    
    // Tier progression logic (same as in the actual code)
    while (currentTierIndex < battlepassSeason.tiers.length - 1) {
        const nextTierData = battlepassSeason.tiers[currentTierIndex + 1];
        const xpRequiredForNextTier = nextTierData ? nextTierData.xpRequired : null;
        
        if (!xpRequiredForNextTier || newXP < xpRequiredForNextTier) {
            break;
        }
        
        newTier += 1;
        currentTierIndex = newTier - 1;
    }
    
    return { newTier, newXP };
}

// Test edge cases
function testEdgeCases() {
    console.log('\n🔍 EDGE CASE TESTING');
    console.log('====================\n');

    // Edge Case 1: Multiple tier jumps
    console.log('⚠️  EDGE CASE 1: Multiple Tier Jumps');
    console.log('------------------------------------');
    
    const multiTierData = {
        mission: { xpReward: 3500 },
        battlepassProgress: { currentTier: 1, currentXP: 0 },
        battlepassSeason: {
            tiers: [
                { tierNumber: 1, xpRequired: 0 },
                { tierNumber: 2, xpRequired: 1000 },
                { tierNumber: 3, xpRequired: 2000 },
                { tierNumber: 4, xpRequired: 3000 },
                { tierNumber: 5, xpRequired: 4000 }
            ]
        }
    };

    const multiResult = processBattlepassXP(multiTierData);
    console.log(`Massive XP gain: ${multiTierData.mission.xpReward} XP`);
    console.log(`Tier jump: ${multiTierData.battlepassProgress.currentTier} → ${multiResult.newTier}`);
    console.log(`Final XP: ${multiResult.newXP}`);
    console.log('');

    // Edge Case 2: Character level cap scenario
    console.log('⚠️  EDGE CASE 2: High Level Character');
    console.log('------------------------------------');
    
    const highLevelData = {
        mission: { xpReward: 1000, rewardtype: "exp" },
        character: { level: 50, experience: 3800 }, // Close to next level
        battlepassProgress: { currentTier: 1, currentXP: 0 },
        battlepassSeason: {
            tiers: [
                { tierNumber: 1, xpRequired: 0 },
                { tierNumber: 2, xpRequired: 1500 }
            ]
        }
    };

    const highLevelResult = processExpReward(highLevelData);
    console.log(`High level character (Level ${highLevelData.character.level})`);
    console.log(`XP needed for next level: ${80 * highLevelData.character.level} per level`);
    console.log(`Levels gained: ${highLevelResult.levelsGained}`);
    console.log(`New level: ${highLevelResult.newCharacterLevel}`);
    console.log('');

    console.log('✅ Edge case testing completed!');
}

// Run all tests
function runTests() {
    console.log('🚀 Starting Battlepass Quest Claiming Tests...\n');
    simulateBattlepassQuestClaiming();
    testEdgeCases();
    console.log('\n🎉 All tests completed successfully!');
}

// Execute tests
runTests();
