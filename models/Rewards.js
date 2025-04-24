const { default: mongoose } = require("mongoose");


const CharacterMonthlyLoginSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        daily: {
            day1: {
                type: Boolean,
                default: false,
            },
            day2: {
                type: Boolean,
                default: false,
            },
            day3: {
                type: Boolean,
                default: false,
            },
            day4: {
                type: Boolean,
                default: false,
            },
            day5: {
                type: Boolean,
                default: false,
            },
            day6: {
                type: Boolean,
                default: false,
            },
            day7: {
                type: Boolean,
                default: false,
            },
            day8: {
                type: Boolean,
                default: false,
            },
            day9: {
                type: Boolean,
                default: false,
            },
            day10: {
                type: Boolean,
                default: false,
            },
            day11: {
                type: Boolean,
                default: false,
            },
            day12: {
                type: Boolean,
                default: false,
            },
            day13: {
                type: Boolean,
                default: false,
            },
            day14: {
                type: Boolean,
                default: false,
            },
            day15: {
                type: Boolean,
                default: false,
            },
            day16: {
                type: Boolean,
                default: false,
            },
            day17: {
                type: Boolean,
                default: false,
            },
            day18: {
                type: Boolean,
                default: false,
            },
            day19: {
                type: Boolean,
                default: false,
            },
            day20: {
                type: Boolean,
                default: false,
            },
            day21: {
                type: Boolean,
                default: false,
            },
            day22: {
                type: Boolean,
                default: false,
            },
            day23: {
                type: Boolean,
                default: false,
            },
            day24: {
                type: Boolean,
                default: false,
            },
            day25: {
                type: Boolean,
                default: false,
            },
            day26: {
                type: Boolean,
                default: false,
            },
            day27: {
                type: Boolean,
                default: false,
            },
            day28: {
                type: Boolean,
                default: false,
            },

        },
        currentDay: {
            type: String,
            default: "day1"
        },
        lastClaimed: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
)

const CharacterWeeklyLoginSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        daily: {
            day1: {
                type: Boolean,
                default: false,
            },
            day2: {
                type: Boolean,
                default: false,
            },
            day3: {
                type: Boolean,
                default: false,
            },
            day4: {
                type: Boolean,
                default: false,
            },
            day5: {
                type: Boolean,
                default: false,
            },
            day6: {
                type: Boolean,
                default: false,
            },
            day7: {
                type: Boolean,
                default: false,
            },
        },
        currentDay: {
            type: String,
            default: "day1"
        },
        lastClaimed: {
            type: Date,
        },
    },
    {
        timestamps: true,

    }
)

const CharacterDailySpinSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        spin: {
            type: Boolean,
            default: false,
        },
        expspin: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

const MonthlyLoginSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["exp", "coins", "crystal"],
        },
        amount: {
            type: Number,
            required: true,
        }
    },
    {
        timestamps: true,
    }
)

const WeeklyLoginSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["exp", "coins", "crystal"],
        },
        amount: {
            type: Number,
            required: true,
        }
    },
    {
        timestamps: true,
    }
)

const dailySpinSchema = new mongoose.Schema(
    {
        slot: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },
        type: {
            type: String,
            enum: ["coins", "crystal"],
        },
        amount: {
            type: Number,
            required: true,
        },
        chance: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            validate: {
                validator: async function() {
                    const total = await this.constructor.aggregate([
                        { $group: { _id: null, total: { $sum: "$chance" } } }
                    ]);
                    return !total.length || total[0].total <= 100;
                },
                message: 'Total chances across all slots must not exceed 100'
            }
        },
    },
    {
        timestamps: true,
    }
)

const dailyExpSpinSchema = new mongoose.Schema(
    {
        slot: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },
        type: {
            type: String,
            enum: ["exp"],
        },
        amount: {
            type: Number,
            required: true,
        },
        chance: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            validate: {
                validator: async function() {
                    const total = await this.constructor.aggregate([
                        { $group: { _id: null, total: { $sum: "$chance" } } }
                    ]);
                    return !total.length || total[0].total <= 100;
                },
                message: 'Total chances across all slots must not exceed 100'
            }
        },
    },
    {
        timestamps: true,
    }
)

const CharacterMonthlyLogin = mongoose.model("CharacterMonthlyLogin", CharacterMonthlyLoginSchema);
const CharacterWeeklyLogin = mongoose.model("CharacterWeeklyLogin", CharacterWeeklyLoginSchema);
const CharacterDailySpin = mongoose.model("CharacterDailySpin", CharacterDailySpinSchema);
const MonthlyLogin = mongoose.model("MonthlyLogin", MonthlyLoginSchema);
const WeeklyLogin = mongoose.model("WeeklyLogin", WeeklyLoginSchema);
const DailySpin = mongoose.model("DailySpin", dailySpinSchema);
const DailyExpSpin = mongoose.model("DailyExpSpin", dailyExpSpinSchema);

module.exports = {
    CharacterMonthlyLogin,
    CharacterWeeklyLogin,
    CharacterDailySpin,
    MonthlyLogin,
    WeeklyLogin,
    DailySpin,
    DailyExpSpin
};