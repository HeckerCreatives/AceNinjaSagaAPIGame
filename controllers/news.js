const { default: mongoose } = require("mongoose")
const News = require("../models/News")


exports.creatnews = async (req, res) => {
   
    const { title, content} = req.body

    if(!title || !content){
        return res.status(400).json({ message: "failed", data: "Please input title and type."})
    }

    await News.create({ title: title, content: content})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating News. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success"})

}

exports.getnews = async (req, res) => {

    const {page, limit} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    const NewsData = await News.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching News data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalNews = await News.countDocuments();

    const finalData = []


    NewsData.forEach(data => {
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

    return res.status(200).json({ message: "success", data: finalData, totalPages: Math.ceil(totalNews / pageOptions.limit)})

}

exports.editnews = async (req, res) => {
    
    const {id, action, title, content} = req.body

    if(!id || !action){
        return res.status(400).json({ message: "failed", data: "Please input News id and action."})
    }

    if(!content){
        return res.status(400).json({ message: "failed", data: "Please input content fields."})
    }

    if(action === "add"){
        await News.findByIdAndUpdate(
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
            console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

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
         await News.bulkWrite(bulkOps)
         .then(data => data)
         .catch(err => {
            console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
         })
    } else if(action === "force"){
        const newNewsData = {
            id: id,
            title: title,
            content: content
        }
        await News.findOneAndReplace({ _id: id}, newNewsData)
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })
    } else {
        return res.status(400).json({ message: "failed", data: "Action must be add/edit or delete."})
    }

    return res.status(200).json({ message: "success"})
}

exports.deletenews = async (req, res) => {
    const { id } = req.query

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input News id."})
    }

    await News.findByIdAndDelete(new mongoose.Types.ObjectId(id))
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while deleting News. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}