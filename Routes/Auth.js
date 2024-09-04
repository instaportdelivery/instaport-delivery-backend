const express = require("express")
const router = express.Router()
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const { CustomerToken } = require("../Middlewares/CustomerAuth");
const { RiderToken } = require("../Middlewares/RiderAuth");

router.post("/create-order/upi", CustomerToken, async (req, res) => {

	const transaction_id = uuidv4();
	const jwt_payload = {
		"mercid": "UATINSPTV2",
		// "mercid": "INSTAPRTV2",
		"orderid": transaction_id,
		"amount": Math.round(req.body.amount),
		"order_date": "2023-07-30T20:25:00+05:30",
		"currency": "356",
		"additional_info": {
			"additional_info1": `${req.customer._id}`,
		},
		"ru": "http://localhost:1000/authtest",
		"itemcode": "DIRECT",
		"device": {
			"init_channel": "internet",
			"ip": "192.168.0.104",
			"user_agent": req.body.user_agent,
			"accept_header": "text/html",
			"fingerprintid": "61b12c18b5d0cf901be34a23ca64bb19",
			"browser_tz": "-330",
			"browser_color_depth": "32",
			"browser_java_enabled": "false",
			"browser_screen_height": "601",
			"browser_screen_width": "657",
			"browser_language": "en-US",
			"browser_javascript_enabled": "true"
		}
	}
	const secretKey = '31MhbX6UsCr7io5GJltm7kXsbbnxs7KO';




	const header = {
		"alg": "HS256",
		"typ": "JWT",
		"clientid": "uatinsptv2"
		// "clientid": "instaprtv2"
	};

	const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_');
	const encodedPayload = btoa(JSON.stringify(jwt_payload)).replace(/\+/g, '-').replace(/\//g, '_');

	const signingString = `${encodedHeader}.${encodedPayload}`;

	const signature = CryptoJS.HmacSHA256(signingString, secretKey).toString(CryptoJS.enc.Base64);
	const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace("=", "");

	const jws = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

	const headers = {
		"Content-Type": "application/jose",
		"bd-timestamp": Date.now(),
		"bd-traceid": transaction_id,
		"Accept": "application/jose"
	}
	var requestOptions = {
		method: 'POST',
		headers: headers,
		body: jws,
	};

	// fetch("https://uat1.billdesk.com/u2/payments/ve1_2/orders/create", requestOptions)
	fetch("https://api.billdesk.com/payments/ve1_2/orders/create", requestOptions)
		.then(response => response.text())
		.then(async (result) => {
			const data = await jwt.verify(result, secretKey)
			const transaction_payload = {
				"mercid": "UATINSPTV2",
				// "mercid": "INSTAPRTV2",
				"orderid": transaction_id,
			}
			const encodedPayloadTransaction = btoa(JSON.stringify(transaction_payload)).replace(/\+/g, '-').replace(/\//g, '_');
			const signingString = `${encodedHeader}.${encodedPayloadTransaction}`;
			const signature = CryptoJS.HmacSHA256(signingString, secretKey).toString(CryptoJS.enc.Base64);
			const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace("=", "");
			const jws = `${encodedHeader}.${encodedPayloadTransaction}.${encodedSignature}`;
			fetch("https://uat1.billdesk.com/u2/payments/ve1_2/transactions/get", {
				method: 'POST',
				headers: {
					"Content-Type": "application/jose",
					"bd-timestamp": Date.now(),
					"bd-traceid": transaction_id + transaction_id,
					"Accept": "application/jose",
					"Authorization": data?.links[1].headers.authorization,
					'bdOrderId': transaction_id
				},
				body: jws,
			})
				.then(response => response.text())
				.then((transaction_response) => {
					res.json({
						bdorderid: data.bdorderid,
						orderid: data.orderid,
						authorization: data?.links[1].headers.authorization,
						amount: data.amount,
						extra: transaction_response
					})
				})

			// res.json({
			// 	bdorderid: data.bdorderid,
			// 	orderid: data.orderid,
			// 	authorization: data?.links[1].headers.authorization,
			// 	amount: data.amount
			// })
		})
		.catch(error => console.log('error', error));

})

function formatDateToCustomISO(currentDate) {
	let year = currentDate.getFullYear();
	let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so add 1
	let day = String(currentDate.getDate()).padStart(2, '0');
	let hours = String(currentDate.getHours()).padStart(2, '0');
	let minutes = String(currentDate.getMinutes()).padStart(2, '0');
	let seconds = String(currentDate.getSeconds()).padStart(2, '0');

	// Get the timezone offset in hours and minutes
	let timezoneOffset = currentDate.getTimezoneOffset();
	let offsetHours = Math.abs(Math.floor(timezoneOffset / 60));
	let offsetMinutes = Math.abs(timezoneOffset % 60);
	let offsetSign = timezoneOffset < 0 ? '+' : '-';

	// Construct the desired string format
	let formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
	return formattedDate
}

//test
router.post("/topup-wallet", CustomerToken, async (req, res) => {
	const date = new Date();
	const customFormattedDate = formatDateToCustomISO(date);
	console.log("CUSTOM DATE", customFormattedDate);
	const transaction_id = uuidv4();
	console.log(req.body.ip, "ip")
	const jwt_payload = {
		// "mercid": "UATINSPTV2",
		"mercid": "INSTAPRTV2",
		// "mercid": "INSTAPRIDR",
		"orderid": transaction_id,
		"amount": `${req.body.amount}.00`,
		"order_date": customFormattedDate,
		"currency": "356",
		"additional_info": {
			"additional_info1": `${req.customer._id}`,
		},
		// "ru": "http://localhost:1000/customer-transactions/wallet-topup",
		"ru": "http://13.202.178.247:1000/customer-transactions/wallet-topup",
		"itemcode": "DIRECT",
		"device": {
			"init_channel": "internet",
			"ip": req.body.ip,
			"user_agent": req.body.user_agent,
			"accept_header": "text/html",
			// "fingerprintid": "61b12c18b5d0cf901be34a23ca64bb19",
			"browser_tz": "-330",
			"browser_color_depth": "32",
			"browser_java_enabled": "false",
			"browser_screen_height": "601",
			"browser_screen_width": "657",
			"browser_language": "en-US",
			"browser_javascript_enabled": "true"
		}
	}
	const secretKey = 'F1kyMNGYF1BHl4L8AZtHRaadCoZrQJqy';
	// const secretKey = '6QyIqweGQBJH6t1pfBVnSE8ItaWskzk5';

	const header = {
		"alg": "HS256",
		"typ": "JWT",
		// "clientid": "uatinsptv2"
		"clientid": "instaprtv2"
	};

	const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_');
	const encodedPayload = btoa(JSON.stringify(jwt_payload)).replace(/\+/g, '-').replace(/\//g, '_');

	const signingString = `${encodedHeader}.${encodedPayload}`;

	const signature = CryptoJS.HmacSHA256(signingString, secretKey).toString(CryptoJS.enc.Base64);
	const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace("=", "");

	const jws = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

	console.log(jws)

	const headers = {
		"Content-Type": "application/jose",
		"bd-timestamp": Date.now(),
		"bd-traceid": transaction_id,
		"Accept": "application/jose"
	}
	const requestOptions = {
		method: 'POST',
		headers: headers,
		body: jws,
	};

	console.log(headers, requestOptions)

	// fetch("https://uat1.billdesk.com/u2/payments/ve1_2/orders/create", requestOptions)
	fetch("https://api.billdesk.com/payments/ve1_2/orders/create", requestOptions)
		.then(response => response.text())
		.then(async (result) => {
			console.log(result, secretKey)
			const data = await jwt.verify(result, secretKey)
			console.log("after order create", data)
			console.log("after order create test", {
				bdorderid: data.bdorderid,
				orderid: data.orderid,
				authorization: data?.links[1].headers.authorization,
				amount: data.amount,
				extra: data
			})
			res.json({
				bdorderid: data.bdorderid,
				orderid: data.orderid,
				authorization: data?.links[1].headers.authorization,
				amount: data.amount,
				extra: data
			})
		})
		.catch(error => console.log('error', error));
})

router.post("/payment-order", CustomerToken, async (req, res) => {
	const transaction_id = uuidv4();
	let currentDate = new Date();

	// Get the individual components of the date
	let year = currentDate.getFullYear();
	let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so add 1
	let day = String(currentDate.getDate()).padStart(2, '0');
	let hours = String(currentDate.getHours()).padStart(2, '0');
	let minutes = String(currentDate.getMinutes()).padStart(2, '0');
	let seconds = String(currentDate.getSeconds()).padStart(2, '0');

	// Get the timezone offset in hours and minutes
	let timezoneOffset = currentDate.getTimezoneOffset();
	let offsetHours = Math.abs(Math.floor(timezoneOffset / 60));
	let offsetMinutes = Math.abs(timezoneOffset % 60);
	let offsetSign = timezoneOffset < 0 ? '+' : '-';

	// Construct the desired string format
	let formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

	const jwt_payload = {
		// "mercid": "UATINSPTV2",
		"mercid": "INSTAPRTV2",
		"orderid": transaction_id,
		"amount": req.body.amount,
		"order_date": formattedDate,
		"currency": "356",
		"additional_info": {
			"additional_info1": `${req.customer._id}`,
		},
		// "ru": `http://localhost:1000/customer-transactions/app-create-payment/${req.body.order}`,
		"ru": `http://13.202.178.247:1000/customer-transactions/app-create-payment/${req.body.order}`,
		"itemcode": "DIRECT",
		"device": {
			"init_channel": "internet",
			"ip": "192.168.0.104",
			"user_agent": req.body.user_agent,
			"accept_header": "text/html",
			"fingerprintid": "61b12c18b5d0cf901be34a23ca64bb19",
			"browser_tz": "-330",
			"browser_color_depth": "32",
			"browser_java_enabled": "false",
			"browser_screen_height": "601",
			"browser_screen_width": "657",
			"browser_language": "en-US",
			"browser_javascript_enabled": "true"
		}
	}
	const secretKey = 'F1kyMNGYF1BH14L8AZtHRaadCoZrQJqy';

	const header = {
		"alg": "HS256",
		"typ": "JWT",
		// "clientid": "uatinsptv2"
		"clientid": "instaprtv2"
	};

	const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_');
	const encodedPayload = btoa(JSON.stringify(jwt_payload)).replace(/\+/g, '-').replace(/\//g, '_');

	const signingString = `${encodedHeader}.${encodedPayload}`;

	const signature = CryptoJS.HmacSHA256(signingString, secretKey).toString(CryptoJS.enc.Base64);
	const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace("=", "");

	const jws = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

	const headers = {
		"Content-Type": "application/jose",
		"bd-timestamp": Date.now(),
		"bd-traceid": transaction_id,
		"Accept": "application/jose"
	}
	var requestOptions = {
		method: 'POST',
		headers: headers,
		body: jws,
	};

	// fetch("https://uat1.billdesk.com/u2/payments/ve1_2/orders/create", requestOptions)
	fetch("https://api.billdesk.com/payments/ve1_2/orders/create", requestOptions)
		.then(response => response.text())
		.then(async (result) => {
			const data = await jwt.verify(result, secretKey)
			res.json({
				bdorderid: data.bdorderid,
				orderid: data.orderid,
				authorization: data?.links[1].headers.authorization,
				amount: data.amount,
				extra: data
			})
		})
		.catch(error => console.log('error', error));

})

router.post("/payment-dues-rider", RiderToken, async (req, res) => {
	const transaction_id = uuidv4();
	let currentDate = new Date();

	// Get the individual components of the date
	let year = currentDate.getFullYear();
	let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so add 1
	let day = String(currentDate.getDate()).padStart(2, '0');
	let hours = String(currentDate.getHours()).padStart(2, '0');
	let minutes = String(currentDate.getMinutes()).padStart(2, '0');
	let seconds = String(currentDate.getSeconds()).padStart(2, '0');

	// Get the timezone offset in hours and minutes
	let timezoneOffset = currentDate.getTimezoneOffset();
	let offsetHours = Math.abs(Math.floor(timezoneOffset / 60));
	let offsetMinutes = Math.abs(timezoneOffset % 60);
	let offsetSign = timezoneOffset < 0 ? '+' : '-';

	// Construct the desired string format
	let formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

	const jwt_payload = {
		// "mercid": "UATINSPTV2",
		"mercid": "INSTAPRTV2",
		"orderid": transaction_id,
		"amount": Math.abs(Number(req.body.amount)),
		"order_date": formattedDate,
		"currency": "356",
		"additional_info": {
			"additional_info1": `${req.rider._id}`,
		},
		// "ru": `http://localhost:1000/rider/app-payment`,
		"ru": `http://13.202.178.247:1000/rider/app-payment`,
		"itemcode": "DIRECT",
		"device": {
			"init_channel": "internet",
			"ip": "192.168.0.104",
			"user_agent": req.body.user_agent,
			"accept_header": "text/html",
			"fingerprintid": "61b12c18b5d0cf901be34a23ca64bb19",
			"browser_tz": "-330",
			"browser_color_depth": "32",
			"browser_java_enabled": "false",
			"browser_screen_height": "601",
			"browser_screen_width": "657",
			"browser_language": "en-US",
			"browser_javascript_enabled": "true"
		}
	}
	const secretKey = 'F1kyMNGYF1BH14L8AZtHRaadCoZrQJqy';

	const header = {
		"alg": "HS256",
		"typ": "JWT",
		// "clientid": "uatinsptv2"
		"clientid": "instaprtv2"
	};

	const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_');
	const encodedPayload = btoa(JSON.stringify(jwt_payload)).replace(/\+/g, '-').replace(/\//g, '_');

	const signingString = `${encodedHeader}.${encodedPayload}`;

	const signature = CryptoJS.HmacSHA256(signingString, secretKey).toString(CryptoJS.enc.Base64);
	const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace("=", "");

	const jws = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

	const headers = {
		"Content-Type": "application/jose",
		"bd-timestamp": Date.now(),
		"bd-traceid": transaction_id,
		"Accept": "application/jose"
	}
	var requestOptions = {
		method: 'POST',
		headers: headers,
		body: jws,
	};

	// fetch("https://uat1.billdesk.com/u2/payments/ve1_2/orders/create", requestOptions)
	fetch("https://api.billdesk.com/payments/ve1_2/orders/create", requestOptions)
		.then(response => response.text())
		.then(async (result) => {
			const data = await jwt.verify(result, secretKey)
			res.json({
				bdorderid: data.bdorderid,
				orderid: data.orderid,
				authorization: data?.links[1].headers.authorization,
				amount: data.amount,
				extra: data
			})
		})
		.catch(error => console.log('error', error));

})

module.exports = router