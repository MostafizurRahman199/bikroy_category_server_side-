const token = require("crypto").randomBytes(64).toString('hex');
console.log(token);


// Store ID: baris6795d9cf67b3a
// Store Password (API/Secret Key): baris6795d9cf67b3a@ssl


// Merchant Panel URL: https://sandbox.sslcommerz.com/manage/ (Credential as you inputted in the time of registration)


 
// Store name: testbarismnxi
// Registered URL: www.barisalcafe.com
// Session API to generate transaction: https://sandbox.sslcommerz.com/gwprocess/v3/api.php
// Validation API: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?wsdl
// Validation API (Web Service) name: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php
 
// You may check our plugins available for multiple carts and libraries: https://github.com/sslcommerz



// step -1 : payment initiate
// step
// have to make post request to this url
// https://sandbox.sslcommerz.com/gwprocess/v4/api.php


// step -2 : payment validation