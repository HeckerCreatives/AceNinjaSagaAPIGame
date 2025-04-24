const { default: mongoose } = require("mongoose");


const CharacterChapterSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        chapter: {
            type: Number,
            required: true,
        }

    },
    {
        timestamps: true,
    }
)

const CharacterChapterHistorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        chapter:  {
            type: Number,
            required: true,
        },
        challenge: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }
)

const CharacterChapter = mongoose.model("CharacterChapter", CharacterChapterSchema);
const CharacterChapterHistory = mongoose.model("CharacterChapterHistory", CharacterChapterHistorySchema);

module.exports = { CharacterChapter, CharacterChapterHistory };