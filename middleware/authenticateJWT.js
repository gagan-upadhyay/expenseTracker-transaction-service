import jwt from 'jsonwebtoken';


export function authenticateJWT(req, res, next){
    if(!req.cookies){
        return res.status(404).json({message:'expired or invalid token'});
    }

    try{
        const decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET);
        req.user=decoded;
        next();
    }catch(err){
        console.error('JWT verification failed:', err);
        return res.status(403).json({error:'Invalid or expired token'});
    }
}