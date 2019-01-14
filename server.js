const web3 = require('web3');
const express = require('express');
const Tx = require('ethereumjs-tx');
const bodyParser = require("body-parser");
const winston = require("winston");

const app = express();
const config = require('./config-local');

//Infura HttpProvider Endpoint
web3js = new web3(new web3.providers.HttpProvider("https://rinkeby.infura.io/v3/" + config.infura_key));

let my_address = config.my_address;
let private_key = Buffer.from(config.private_key, 'hex');

const STORAGE = config.storage;

REQUEST_TYPE_CALL_CONTRACT = 'call-contract';
REQUEST_TYPE_SEND_CONTRACT = 'send-contract';
REQUEST_TYPE_CALL_WEB3_CUSTOM = 'call-web3-custom';

const REQUEST_TYPE = [
    REQUEST_TYPE_CALL_CONTRACT,
    REQUEST_TYPE_SEND_CONTRACT,
    REQUEST_TYPE_CALL_WEB3_CUSTOM,
];

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({filename: 'combined.log'})
    ]
});

app.listen(3000, () => console.log('Ethereum backend listening on port 3000!'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.post('/', async (req, res) => {

    logger.info({time: Date(), input: req.body});

    let response;
    let output;
    try {
        checkBody(req.body);


        if (req.body.type === REQUEST_TYPE_CALL_CONTRACT) {
            response = await callContract(req.body.contract_name, req.body.method, req.body.params);
        }
        if (req.body.type === REQUEST_TYPE_SEND_CONTRACT) {
            response = await sendContract(req.body.contract_name, req.body.method, req.body.params);
        }
        if (req.body.type === REQUEST_TYPE_CALL_WEB3_CUSTOM) {
            response = await callWeb3Custom(req.body.method, req.body.params);
        }

        output = {
            result: true,
            data: response
        };

        res.send(output);
        logger.info({time: Date(), output: output});
    } catch (err) {

        output = {
            result: false,
            error: {
                name: err.name,
                message: err.message
            },
        };

        res.send(output)
        logger.error({time: Date(), output: output});
    }


});

function UserException(message) {
    this.message = message;
    this.name = "UserException";
}

function checkBody(body) {
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

function callWeb3Custom(method, params) {
    let context = web3;
    var namespaces = method.split(".");
    for(var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }
    return context(...params);
}

function isContractDefine(contract_name) {
    if (contract_name === undefined || STORAGE[contract_name] === undefined) {
        return false;
    }
    return true;
}

function callContract(contract_name, method, params) {
    if (!isContractDefine(contract_name)) {
        throw new UserException("Missing or invalid parameter 'contract_name'.");
    }

    let contract = new web3js.eth.Contract(STORAGE[contract_name].abi, STORAGE[contract_name].address);

    return contract.methods[method](...params
    ).call({
        "from": my_address
    });
};

async function sendContract (contract_name, method, params) {
    if (!isContractDefine(contract_name)) {
        throw new UserException("Missing or invalid parameter 'contract_name'.");
    }

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


