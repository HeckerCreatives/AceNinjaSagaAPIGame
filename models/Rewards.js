const { default: mongoose } = require("mongoose");


const CharacterMonthlyLoginSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Characterdata",
        required: true,
    },
    days: [
        {
            day: { type: Number, required: true }, // 1-28
            loggedIn: { type: Boolean, default: false },
            missed: { type: Boolean, default: false },
            claimed: { type: Boolean, default: false } // if reward was claimed (for reward days)
        }
    ],
    currentDay: {
        type: Number,
        default: 1 // Start from day 1
    },
    totalLoggedIn: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date
    }
}, { timestamps: true });

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
            default: Date.now,
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