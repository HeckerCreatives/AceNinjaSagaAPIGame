const { default: mongoose } = require("mongoose")
const { News, ItemNews, NewsRead } = require("../models/News");
const Announcement = require("../models/Announcement")
const { checkcharacter } = require("../utils/character");


// exports.creatnews = async (req, res) => {
   
//     const { title, content} = req.body

//     if(!title || !content){
//         return res.status(400).json({ message: "failed", data: "Please input title and type."})
//     }

//     await News.create({ title: title, content: content})
//     .then(data => data)
//     .catch(err => {
//         console.log(`There's a problem encountered while creating News. Error: ${err}`)

//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
//     })

//     return res.status(200).json({ message: "success"})

// }

exports.createnews = async (req, res) => {
    const { title, content, contentType, url } = req.body;

    if (!title || !contentType) {
        return res.status(400).json({ message: "failed", data: "Please provide title and content type." });
    }

    let mediaUrl = "";

    if (contentType === "image") {
        if (!req.file) {
            return res.status(400).json({ message: "failed", data: "Please select an image first!" });
        }
        mediaUrl = req.file.path;
    } else if (contentType === "video") {
        if (!url) {
            return res.status(400).json({ message: "failed", data: "Please provide a video URL." });
        }
        mediaUrl = url;
    } else {
        return res.status(400).json({ message: "failed", data: "Invalid content type. Allowed: image, video." });
    }

    try {
        await News.create({ title, content, type: contentType, url: mediaUrl });
        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error creating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
};

exports.editnews = async (req, res) => {
    const { newsid, title, content, contentType, url } = req.body;

    if (!newsid) {
        return res.status(400).json({ message: "failed", data: "News ID is required." });
    }

    try {
        const existingNews = await News.findOne({ _id: newsid });
        if (!existingNews) {
            return res.status(404).json({ message: "failed", data: "News not found." });
        }

        let mediaUrl = existingNews.url; 
        if (contentType === "image") {
            if (req.file) {
                mediaUrl = req.file.path; 
            }
        } else if (contentType === "video") {
            if (url) {
                mediaUrl = url; 
            }
        } else if (contentType) {
            return res.status(400).json({ message: "failed", data: "Invalid content type. Allowed: image, video." });
        }

        await News.updateOne(
            { _id: newsid },
            {
                title: title || existingNews.title, 
                content: content || existingNews.content, 
                type: contentType || existingNews.type,
                url: mediaUrl
            }
        );

        return res.status(200).json({ message: "success" });
    } catch (err) {
        console.error(`Error updating news: ${err}`);
        return res.status(500).json({ message: "bad-request", data: "Server error. Please contact support." });
    }
}

exports.getnews = async (req, res) => {

    const {page, limit, type, gender, characterid} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    let query = {};
    if (type) {
        query.type = type;
    }

    const NewsData = await News.find(query)
    .sort({ createdAt: -1 })
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching News data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    // fetch if its read
    const readNews = await NewsRead.find({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching read news data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const totalNews = await News.countDocuments();
    // Find the latest ItemNews
    let ItemNewsData = await ItemNews.findOne()
    .sort({ createdAt: -1 })
    .populate('item', 'name gender')

    if (ItemNewsData && ItemNewsData.item && ItemNewsData.item.gender !== 'unisex') {
        // First get all ItemNews sorted by date
        let allItemNews = await ItemNews.find()
            .sort({ createdAt: -1 })
            .populate('item', 'name gender');

        // Find the first item that matches the gender criteria
        if (gender) {
            ItemNewsData = allItemNews.find(news => news.item && news.item.gender === gender);
        } else {
            ItemNewsData = allItemNews[0]; // Take the most recent if no gender specified
        }
    }

    let formattedResponse = {
        data: {}
    };

    const newsdata = {}

    let index = 0

    NewsData.forEach(temp => {
        const { _id, title, content, type, url, createdAt } = temp;
        const isRead = readNews.some(read => read.news && read.news.toString() === _id.toString());
        console.log(title)
        newsdata[index] = {
            id: _id,
            title,
            content,
            type,
            url,
            createdAt: createdAt,
            isRead: isRead
        };
        index++;
    })

    // First, shift all existing news items up by one index
    formattedResponse = {
        data: {
            news: newsdata,
            pagination: {
                total: totalNews,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil(totalNews / pageOptions.limit)
            }
        }
    }

    // Add ItemNews as the first item if it exists and type is not video
    if (ItemNewsData && type !== 'video') {
        const { _id, title, item, itemtype } = ItemNewsData;

        if (!gender){
            return res.status(400).json({ message: "failed", data: "Please input character gender."})
        }

        // Check if the item news is read
        const isItemNewsRead = readNews.some(read => read.itemNews && read.itemNews.toString() === _id.toString());

        // Create a separate itemnews object
        formattedResponse.data = {
            itemnews: {
                id: _id,
                title,
                item: item ? item._id : null,
                itemtype,
                itemname: item ? item.name : null,
                itemgender: item ? item.gender: null,
                isRead: isItemNewsRead
            },
            news: formattedResponse.data.news,
            pagination: formattedResponse.data.pagination
        };
    } else {
        // If no ItemNewsData or type is video, just return the news data
        formattedResponse.data = {
            itemnews: {},
            news: formattedResponse.data.news,
            pagination: formattedResponse.data.pagination
        };
    }
        
    return res.status(200).json({
        message: "success",
        data: formattedResponse.data,
        pagination: formattedResponse.pagination
    });

}

// exports.editnews = async (req, res) => {
    
//     const {id, action, title, content} = req.body

//     if(!id || !action){
//         return res.status(400).json({ message: "failed", data: "Please input News id and action."})
//     }

//     if(!content){
//         return res.status(400).json({ message: "failed", data: "Please input content fields."})
//     }

//     if(action === "add"){
//         await News.findByIdAndUpdate(
//             id, 
//             { 
//                 $set: { title: title},
//                 $push: { 
//                 content: { 
//                     $each: Array.isArray(content) ? content: [content] 
//                 } 
//             } 
//         })
//         .then(data => data)
//         .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//         })
//     } else if(action === "edit"){
//         const bulkOps = content.map((content) => ({
//             updateOne: {
//                 filter: { _id: id, "content._id": content.id },
//                 update: {
//                     $set: {
//                         "content.$.type": content.type,
//                         "content.$.value": content.value,
//                     },
//                 },
//             },
//         }));

//         if (title) {
//             bulkOps.push({
//                 updateOne: {
//                     filter: { _id: id },
//                     update: { $set: { title } },
//                 },
//             });
//         }
//          await News.bulkWrite(bulkOps)
//          .then(data => data)
//          .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)

//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//          })
//     } else if(action === "force"){
//         const newNewsData = {
//             id: id,
//             title: title,
//             content: content
//         }
//         await News.findOneAndReplace({ _id: id}, newNewsData)
//         .then(data => data)
//         .catch(err => {
//             console.log(`There's a problem encountered while editting News with the action ${action}. Error: ${err}`)
//             return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//         })
//     } else {
//         return res.status(400).json({ message: "failed", data: "Action must be add/edit or delete."})
//     }

//     return res.status(200).json({ message: "success"})
// }

exports.deletenews = async (req, res) => {
    const { id } = req.body

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

exports.readnews = async (req, res) => {
    const { id } = req.user;
    const { characterid, newsid, itemnewsid, announcementid } = req.body;

    if (!characterid) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the character id and news id."
        });
    }

    if ((!newsid || !mongoose.Types.ObjectId.isValid(newsid)) && 
        (!itemnewsid || !mongoose.Types.ObjectId.isValid(itemnewsid)) &&
        (!announcementid || !mongoose.Types.ObjectId.isValid(announcementid))) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the news id, item news id, or announcement id."
        });
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const updateData = {
        owner: characterid,
        news: newsid ? new mongoose.Types.ObjectId(newsid) : null,
        itemNews: itemnewsid ? new mongoose.Types.ObjectId(itemnewsid) : null,
        announcement: announcementid ? new mongoose.Types.ObjectId(announcementid) : null
    }

    if (newsid) {
        const news = await News.findById(new mongoose.Types.ObjectId(newsid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching news: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });
        
        if (!news) {
            return res.status(404).json({
                message: "failed",
                data: "News not found."
            });
        }
    } else if (itemnewsid) {
        const itemNews = await ItemNews.findById(new mongoose.Types.ObjectId(itemnewsid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching item news: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        if (!itemNews) {
            return res.status(404).json({
                message: "failed",
                data: "Item news not found."
            });
        }
    } else if (announcementid) {
        const announcement = await Announcement.findById(new mongoose.Types.ObjectId(announcementid))
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching announcement: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        if (!announcement) {
            return res.status(404).json({
                message: "failed", 
                data: "Announcement not found."
            });
        }
    } else {
        return res.status(400).json({
            message: "failed",
            data: "Please provide either news id, item news id, or announcement id."
        });
    }

    const newsRead = await NewsRead.findOneAndUpdate(
        updateData,
        { readAt: new Date() },
        { upsert: true, new: true }
    ).then(data => data)
      .catch(err => {
          console.error(`Error updating news read status: ${err}`);
          return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
      });

    if (!newsRead) {
        return res.status(400).json({
            message: "failed",
            data: "Failed to mark news as read."
        });
    }

    return res.status(200).json({
        message: "success",
    });
}