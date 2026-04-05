import jwt from 'jsonwebtoken';


const verifySession = async(req, res, next)=>{
    try{
        if(process.env.NODE_ENV==='test'){
            return (req, res, next)=>next();
        }
        console.log("From verify session");
        const token = req.cookies?.accessToken 
                    || req.headers.authorization?.split(' ')[1];
        console.log("Value of token from verifySession:", token);
        if(!token) return res.status(401).json({message:'Token missing'});
        const decoded = jwt.verify(token, process.env.SECRET,{
            algorithms:['HS256'],
            clockTolerance:5,
        });
    
        // use for strict systems only
        // const cachedToken = await redisGet(`session:${decoded.id}`);
        // if(cachedToken!== token){
        //     return res.status(401).json({message:'Invalid or expired token'})
        // }
        req.user={id:decoded.id, ...decoded};

        console.log("Value of req.user:\n", req.user);
        // console.log("Value of req.user from verifySession of user-service:\n",req.user);
        return next();
    }catch(err){
        console.error('verfiySession error:', {
            name:err.name,
            message:err.message,
            tokenSnippet:(req.headers.authorization || "").slice(0,30)+'...'
        });
        return res.status(401).json({success:false, message:'Unauthorized!'});
    }
};

export {verifySession};