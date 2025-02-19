
const { default: mongoose } = require("mongoose")
const Announcement = require("../models/Announcement")

exports.createannouncement = async (req, res) => {
   
    const { title, content} = req.body

    if(!title || !content){
        return res.status(400).json({ message: "failed", data: "Please input title and type."})
    }

    await Announcement.create({ title: title, content: content})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating announcement. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success"})

}

exports.getannouncement = async (req, res) => {

    const {page, limit} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    const announcementData = await Announcement.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching announcement data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalAnnouncements = await Announcement.countDocuments();

    const finalData = []


    announcementData.forEach(data => {
        const { id, title, content } = data
        const edittedcontent = []

        content.forEach(content => {
            edittedcontent.push({
                id: content._id,
                type: content.type,
                value: content.value
            })
        })
        finalData.push({
            id: id,
            title: title,
            content: edittedcontent,
        })
    });

    return res.status(200).json({ message: "success", data: finalData, totalPages: Math.ceil(totalAnnouncements / pageOptions.limit)})

}

exports.editannouncement = async (req, res) => {
    
    const {id, action, title, content} = req.body

    if(!id || !action){
        return res.status(400).json({ message: "failed", data: "Please input announcement id and action."})
    }

    if(!content){
        return res.status(400).json({ message: "failed", data: "Please input content fields."})
    }

    if(action === "add"){
        await Announcement.findByIdAndUpdate(
            id, 
            { 
                $set: { title: title},
                $push: { 
                content: { 
                    $each: Array.isArray(content) ? content: [content] 
                } 
            } 
        })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while editting announcement with the action ${action}. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })
    } else if(action === "edit"){
        const bulkOps = content.map((content) => ({
            updateOne: {
                filter: { _id: id, "content._id": content.id },
                update: {
                    $set: {
                        "content.$.type": content.type,
                        "content.$.value": content.value,
                    },
                },
            },
        }));

        if (title) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: { title } },
                },
            });
        }
         await Announcement.bulkWrite(bulkOps)
         .then(data => data)
         .catch(err => {
            console.log(`There's a problem encountered while editting announcement with the action ${action}. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
         })
    } else if(action === "force"){
        const newAnnouncementData = {
            id: id,
            title: title,
            content: content
        }
        await Announcement.findOneAndReplace({ _id: id}, newAnnouncementData)
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while editting announcement with the action ${action}. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })
    } else {
        return res.status(400).json({ message: "failed", data: "Action must be add/edit or delete."})
    }

    return res.status(200).json({ message: "success"})
}

exports.deleteannnouncement = async (req, res) => {
    const { id } = req.query

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input announcement id."})
    }

    await Announcement.findByIdAndDelete(new mongoose.Types.ObjectId(id))
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while deleting announcement. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}