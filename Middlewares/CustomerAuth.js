const jwt = require("jsonwebtoken");

const CustomerToken = (req, res, next) => {
    try {
        let token = req?.headers?.authorization?.split(" ")[1];
        const data = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(data)
        if (data && data.role == "customer") {
            const cutomerid = {
                _id: data._id
            }
            req["customer"] = cutomerid
            console.log(req.customer)
            next();
        } else {
            return res.json({ error: true, message: "Unauthorized access" });
        }

    } catch (err) {
        return res.json({ error: true, message: err.message })
    }

}
module.exports = { CustomerToken };