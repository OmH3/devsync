import { UnauthorizedException } from "../utils/app-error.js"

const isAuthenticated = (req, res, next)=>{
    if(!req.user || !req.user._id){
        throw new UnauthorizedException("Unauthorized. Please login");
    }
    next();
}

export default isAuthenticated;