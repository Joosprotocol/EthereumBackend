const web3 = require('web3');
const express = require('express');
const Tx = require('ethereumjs-tx');
const bodyParser = require("body-parser");
const winston = require("winston");

const app = express();
const config = require('./config');

//Infura HttpProvider Endpoint
web3js = new web3(new web3.providers.HttpProvider("https://rinkeby.infura.io/v3/" + config.infura_key));

let my_address = config.my_address;
let private_key = Buffer.from(config.private_key, 'hex');

const STORAGE = config.storage;

REQUEST_TYPE_CALL = 'call';
REQUEST_TYPE_SEND = 'send';

const REQUEST_TYPE = [
    REQUEST_TYPE_CALL,
    REQUEST_TYPE_SEND
];

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({filename: 'combined.log'})
    ]
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.post('/', async (req, res) => {

    logger.log({input: req.body, time: Date()});

    let response;
    let output;
    try {
        checkBody(req.body);


        if (req.body.type === REQUEST_TYPE_CALL) {
            response = await callContract(req.body.contract_name, req.body.method, req.body.params);
        } else {
            response = await sendContract(req.body.contract_name, req.body.method, req.body.params);
        }

        output = {
            result: true,
            data: response
        };

        res.send(output);
        logger.log({output: output, time: Date()});
    } catch (err) {

        output = {
            result: false,
            error: {
                name: err.name,
                message: err.message
            },
        };

        res.send(output)
        logger.error({output: output, time: Date()});
    }


});

function UserException(message) {
    this.message = message;
    this.name = "UserException";
}

function checkBody(body) {
    if (body.contract_name === undefined || STORAGE[body.contract_name] === undefined) {
        throw new UserException("Missing or invalid parameter 'contract_name'.");
    }

    if (body.type === undefined || REQUEST_TYPE.indexOf(body.type) === -1) {
        throw  new UserException("Missing or invalid parameter 'type'. Available: call, send.");
    }

    if (body.method === undefined) {
        throw  new UserException("Missing or invalid parameter 'method'.");
    }

    if (body.params === undefined) {
        throw  new UserException("Missing or invalid parameter 'params'.");
    }

    return true;
}

function callContract(contract_name, method, params) {

    let contract = new web3js.eth.Contract(STORAGE[contract_name].abi, STORAGE[contract_name].address);

    return contract.methods[method](...params
    ).call({
        "from": my_address
    });
};

async function sendContract (contract_name, method, params) {
    let v = await web3js.eth.getTransactionCount(my_address);
    let contract = new web3js.eth.Contract(STORAGE[contract_name].abi, STORAGE[contract_name].address);
    let rawTransaction = {
        "from": my_address,
        "gasPrice": web3js.utils.toHex(20 * 1e9),
        "gasLimit": web3js.utils.toHex(4000000),
        "to": STORAGE[contract_name].address,
        "data": contract.methods[method](
            ...params
        ).encodeABI(),
        "nonce": web3js.utils.toHex(v)
    };

    let transaction = new Tx(rawTransaction);
    transaction.sign(private_key);

    return web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex')).once('transactionHash', function (hash) {
        return hash
    });

};


