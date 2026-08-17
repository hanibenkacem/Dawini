const db = require ('../db/db')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')



exports.UserRegister =  async (req,res)=>{
    const user = req.body
    const hashedpassword =  await bcrypt.hash(user.mot_de_passe,10)
    const values = [
        user.nom,
        user.prenom,
        user.email,
        hashedpassword,
        user.role
    ]
    const sql = `INSERT INTO utilisateurs (nom,prenom,email,mot_de_passe,role) VALUES (?,?,?,?,?)`
    db.query(sql,values,(err,result)=>{
        if(err) {
            console.log(err)
            return res.status(500).json({message:"DATABASE ERROR WHEN CREATING THE USER"})
        }
         else{
        return res.status(201).json({message:"USER CREATED SUCSESSFULY"})
        }
    })
}





    exports.UserLogin = (req,res)=>{
        const user = req.body
        const values = [user.prenom,
            user.mot_de_passe
        ]
        const sql = `SELECT * FROM utilisateurs WHERE prenom = ? `
        db.query(sql,values, async (err,result)=>{
            if(err){
                return res.status(500).json({"MESSAGE":"ERROR WHEN GETTING THE USER NAME  "})
            }
            else if(result.length == 0 ){
                return res.status(400).json({message:"there is no user with this name !"})
            }
            else if(result.length >0){
                const utilisateur = result[0]
                const isMatch = await bcrypt.compare(user.mot_de_passe,utilisateur.mot_de_passe)
                if(isMatch){
                const token = jwt.sign(
                    {userId: utilisateur.id , role : utilisateur.role,prenom: utilisateur.prenom},
                'HANI',
                {expiresIn : '3h'}
                
            )
            console.log(token)
            res.json({message: "Login successful",
                token: token,
                role: utilisateur.role,
                id_medecin: utilisateur.id, // <--- Add this line
                prenom: utilisateur.prenom})
        }
        else{
            res.status(401).json({message:"invalid login informations"})
        }
                
            }
        })
    }