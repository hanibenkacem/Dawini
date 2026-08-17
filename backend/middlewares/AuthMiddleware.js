const jwt = require('jsonwebtoken')
const verifytoken = (req,res,next)=>{
    const token = req.headers['authorization']?.split(' ')[1];
    if(!token) return res.status(403).json({message:"NO TOKEN PROVIDED"})
        jwt.verify(token,'HANI',(err,decoded)=>{
    if(err) return res.status(401).json({message:"Unauthirazed/INVALID TOKEN"})
        req.user = decoded
        next();
        })
}

module.exports = verifytoken