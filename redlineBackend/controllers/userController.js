import userModel from "../models/userModel.js";
import validator from "validator";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}
//route for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success:false, message: "User doesn't exists"})
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success:false, message: "Invalid password" });
        }
        else{
            //token generate
            const token = createToken(user._id);
            res.json({ success: true, token: token });
        }  
    }
    catch (err) {
        console.error(err);
        res.json({ success: false, message: err.message });
    }
}

//route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await userModel.findOne({email});
        if (exists) {
            return res.json({ success:false, message: "User already exists" });
        }
        if(!validator.isEmail(email)){
            return res.json({ success:false, message: "Please enter a valid email" });
        }
        if(password.length < 8){
            return res.json({ success:false, message: "Please enter a strong password"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });
        const user = await newUser.save();
        const token = createToken(user._id)
        res.json({ success: true, token });
    }
    catch (error){
        console.log(error);
        res.json({success: false, message: error.message})
    }
}

//route for admin login
const adminLogin=async (req,res)=>{
    try{
        const {email,password}=req.body;
        if(email==process.env.ADMIN_EMAIL && password==process.env.ADMIN_PASSWORD){
            const token=jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        }else{
            res.json({success:false,message:"Invalid credentials"})
        }
    }
    catch(error){
        console.log(error)
        res.json({success: false, message: error.message})
    }

}

//route for getting user profile
const getUserProfile = async (req, res) => {
    try {
        // Get from either req object or req.body (for compatibility with GET and POST)
        const userId = req.userId || req.body.userId;
        const userEmail = req.userEmail || req.body.userEmail;
        
        
        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID not found" });
        }

        // Extract name from email if not available
        const nameFromEmail = userEmail ? userEmail.split('@')[0] : 'User';

        // First, try to find by userId
        let user = await userModel.findById(userId);
        
        if (user) {
            // User exists with this ID, update if needed
            if (user.email !== userEmail) {
                user = await userModel.findByIdAndUpdate(
                    userId,
                    { email: userEmail },
                    { new: true }
                );
            }
        } else {
            // User doesn't exist with this ID, check if email exists with different ID
            const existingUser = await userModel.findOne({ email: userEmail });
            
            if (existingUser) {
                // Email exists with different UID, update it to use new UID
                // Delete old record and create new one with new UID
                await userModel.deleteOne({ email: userEmail });
            }
            
            // Create new user with this UID
            user = await userModel.create({
                _id: userId,
                email: userEmail || 'no-email@example.com',
                name: nameFromEmail,
                cartData: {}
            });
        }
        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name || 'User',
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Reverse geocoding endpoint - get pincode from coordinates
const reverseGeocodeLocation = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ 
                success: false, 
                message: "Latitude and longitude are required" 
            });
        }
        
        // Validate coordinates
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid coordinates" 
            });
        }
        
        // Call Nominatim API from backend (no CORS issues)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'GreenValleyNaturals/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Nominatim API failed');
        }
        
        const data = await response.json();
        
        // Extract pincode from various possible field names
        let pincode = data.address?.postcode || 
                     data.address?.postal_code ||
                     data.address?.pincode ||
                     '';
        
        // Fallback: try to extract from display_name
        if (!pincode && data.display_name) {
            const pincodeMatch = data.display_name.match(/\b\d{6}\b/);
            if (pincodeMatch) {
                pincode = pincodeMatch[0];
            }
        }
        
        return res.json({
            success: true,
            pincode: pincode,
            city: data.address?.city || data.address?.town || '',
            state: data.address?.state || '',
            country: data.address?.country || '',
            data: data // Include full response for debugging
        });
        
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to determine location',
            error: error.message 
        });
    }
}

const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, email } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID not found" });
        }

        // Validate inputs
        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" });
        }

        // Check if new email already exists (for a different user)
        const existingUser = await userModel.findOne({ email: email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already in use" });
        }

        // Update user profile
        const user = await userModel.findByIdAndUpdate(
            userId,
            { name, email },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export {loginUser, registerUser, adminLogin, getUserProfile, updateProfile, reverseGeocodeLocation}