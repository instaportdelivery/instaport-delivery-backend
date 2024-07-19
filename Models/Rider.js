const mongoose = require("mongoose");


const RIDER_SCEHMA = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    mobileno: {
        type: String,
        required: true,
        unique: true
    },
    wallet_amount: {
        type: Number,
        required: true,
        default: 0
    },
    approve: {
        type: Boolean,
        required: true,
        default: false
    },
    role: {
        type: String,
        default: "rider",
        required: true
    },
    token: {
        type: String
    },
    age: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        required: true,
        default: "available",
    },
    timestamp: {
        type: Number,
        default: Date.now()
    },
    image: {
        type: String,
        required: true,
        default: "https://instaportdelivery.com/assets/hero-img.png"
    },
    reference_contact_1: {
        type: Map,
    },
    reference_contact_2: {
        type: Map,
    },
    acc_holder: {
        type: String,
    },
    acc_no: {
        type: String,
    },
    acc_ifsc: {
        type: String,
    },
    vehicle: {
        type: String,
    },
    address: {
        type: String
    },
    aadhar_number: {
        type: String,
    },
    pan_number: {
        type: String
    },
    drivinglicense:{
        type: String
    },
    orders: {
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "ORDER"
    },
    requestedAmount: {
        type: Number,
        default: 0,
    },
    fcmtoken: {
        type: String,
        required: false
    },
    verified: {
        type: Boolean,
        default: false,
        required: true
    }
})

module.exports = mongoose.model("RIDER", RIDER_SCEHMA);