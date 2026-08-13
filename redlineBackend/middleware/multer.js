import multer from 'multer';

const storage = multer.diskStorage({
    filename: function(req,file,callback){
        callback(null,file.originalname);
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

export default upload;