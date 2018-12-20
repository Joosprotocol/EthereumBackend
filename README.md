# Ethereum backend

## Setup

Set params in config.js

Example:

```
{
    "my_address": '0x4de99a49F80a90f78102E734DCb45b74aa0A3f06',
    "private_key": '1f0e551ef98def26b6f6136e23dfd758193abf1675e69563b83affdfc4d576a8',

    "infura_key" : '685f26153fae4f2189fdcbfb0cfb6a88',

    "storage": {
        "JoosLoanManager": {
            "address": "0xF932388468217FaD36da1E7F9A8F364589c6eb65",
            "abi": JSON.parse('[{"constant": true,"inputs": [{"name": "_id","type": "uint256"}]...')
        },
        "ContractName...": {
            "address": "0x...",
            "abi": JSON.parse('[...]')
        }
    }
}

```

## Running server

Run:

```
$ npx nodemon server.js 

```
