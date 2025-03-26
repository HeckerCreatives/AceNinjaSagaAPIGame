const { default: mongoose } = require("mongoose")
const Downloadlinks = require("../models/Downloadlinks")


exports.editdownloadlink = async (req, res) => {
    const { id, title, link, type } = req.body
    if(!title || !link || !id){
        return res.status(400).json({ message: "failed", data: "Please input title, link and social link to edit."})
    }
    await Downloadlinks.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(id)
        },
        {
        title,
        link, 
        type
        }
    )
    .then(data => {
        if(!data){
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        }
        return res.status(200).json({ message: "success" })
    })
    .catch(err => {
        console.log(`There's a problem encountered while creating social link. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
}


exports.getdownloadlinks = async (req, res) => {

    await Downloadlinks.find({})
    .then(data => {
        if(!data){
            return res.status(400).json({ message: "failed", data: "No social links data found."})
        }
        return res.status(200).json({ message: "success", data: data })
    })
    .catch(err => {
        console.log(`There's a problem encountered while fetching social link. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
}

exports.getdownloadlinkslandingpage = async (req, res) => {

    await Downloadlinks.find({})
    .then(data => {
        if(!data){
            return res.status(400).json({ message: "failed", data: "No social links data found."})
        }
        return res.status(200).json({ message: "success", data: data })
    })
    .catch(err => {
        console.log(`There's a problem encountered while fetching social link. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
}
