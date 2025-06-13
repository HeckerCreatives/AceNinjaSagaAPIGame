const Users = require("../models/Users")

const fs = require('fs');
const path = require("path");
const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
const jsonwebtokenPromisified = require('jsonwebtoken-promisified');
const Version = require("../models/Version");

const verifyJWT = async (token) => {
    try {
        const decoded = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
        return decoded;
    } catch (error) {
        console.error('Invalid token:', error.message);
        throw new Error('Invalid token');
    }
};

exports.protectplayer = async (req, res, next) => {
    const token = req.headers.authorization
    const { appversion } = req.query;
    
    if (!appversion){
        return res.status(400).json({ message: 'Bad Request', data: "App version is required." });
    }
    const gameversion = await Version.findOne({ isActive: true })
    if (!gameversion) {
        return res.status(500).json({ message: 'Internal Server Error', data: "There's a problem with the server. Please try again later." });
    }

    if (appversion != gameversion.version){
        return res.status(300).json({ message: 'Outdated Version', data: `Your game version is outdated. Please update to the latest version ${gameversion.version} to continue.` });
    }
    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }

    const maintenance = await checkmaintenance("fullgame")
    
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The Battlepass is currently under maintenance. Please try again later."
        });
    }   

    try{


        if (!token.startsWith("Bearer")){
            return res.status(300).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }


        
        const headerpart = token.split(' ')[1]

        const decodedToken = await verifyJWT(headerpart);


        if (decodedToken.auth != "player"){
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        const user = await Users.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        if (user.status != "active"){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'failed', data: `Your account had been ${user.status}! Please contact support for more details.` });
        }

        // if (decodedToken.token != user.gametoken){
        //     res.clearCookie('sessionToken', { path: '/' })
        //     return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        // }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }
}

exports.protectsuperadmin = async (req, res, next) => {
    const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1]

    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }

    try{
        const decodedToken = await verifyJWT(token);

        if (decodedToken.auth != "superadmin"){
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        const user = await Users.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        if (user.status != "active"){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'failed', data: `Your account had been ${user.status}! Please contact support for more details.` });
        }

        if (decodedToken.token != user.gametoken){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }
}