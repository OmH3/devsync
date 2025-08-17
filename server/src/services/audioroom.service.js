import jwt from 'jsonwebtoken';

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

export const generateStreamToken = async (userId, userInfo) => {
  try {
    // ✅ FIX: Use current timestamp with buffer for clock sync issues
    const now = Math.floor(Date.now() / 1000);
    const iat = now - 60; // Issue token 60 seconds in the past to handle clock drift
    const exp = now + (24 * 60 * 60); // Expire in 24 hours

    console.log('🔑 Token timing info:', {
      server_time: new Date().toISOString(),
      iat_timestamp: iat,
      iat_readable: new Date(iat * 1000).toISOString(),
      exp_timestamp: exp,
      exp_readable: new Date(exp * 1000).toISOString(),
      time_diff_seconds: now - iat
    });

    // ✅ FIX: Updated token payload with proper structure for Stream Video
    const tokenPayload = {
      iss: 'stream-video-js', // Required issuer for Stream Video
      sub: `user/${userId}`,   // Required subject
      user_id: userId.toString(),
      iat: iat,                // Issue time (in the past)
      exp: exp                 // Expiration time
    };

    // ✅ Generate JWT token with proper headers
    const token = jwt.sign(
      tokenPayload,
      STREAM_API_SECRET,
      { 
        algorithm: 'HS256',
        header: {
          typ: 'JWT',
          alg: 'HS256'
        }
      }
    );

    // ✅ Return user info for Stream with proper format
    const user = {
      id: userId.toString(),
      name: userInfo?.name || `User ${userId}`,
      image: userInfo?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo?.name || userId)}&background=random&color=fff`
    };

    console.log('✅ Stream token generated successfully for user:', {
      userId: user.id,
      userName: user.name,
      tokenLength: token.length,
      hasApiKey: !!STREAM_API_KEY,
      hasSecret: !!STREAM_API_SECRET
    });

    return { 
      token, 
      user,
      apiKey: STREAM_API_KEY // Include API key for frontend
    };

  } catch (error) {
    console.error('❌ Failed to generate Stream token:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      hasApiKey: !!STREAM_API_KEY,
      hasSecret: !!STREAM_API_SECRET
    });
    throw new Error(`Failed to generate Stream token: ${error.message}`);
  }
};