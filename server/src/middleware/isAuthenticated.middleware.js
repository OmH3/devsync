import { UnauthorizedException } from "../utils/app-error.js"
import UserModel from '../../models/User.model.js';

const isAuthenticated = (req, res, next)=>{
    if(!req.user || !req.user._id){
        throw new UnauthorizedException("Unauthorized. Please login");
    }
    next();
}

export const authenticateSocket = async (socket, next) => {
  try {
    // Get user from session (shared with Express)
    const userId = socket.request.session?.passport?.user;
    
    if (!userId) {
      return next(new Error('Authentication failed'));
    }

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userName = user.name;
    socket.currentWorkspace = user.currentWorkspace?.toString();

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

export default isAuthenticated;