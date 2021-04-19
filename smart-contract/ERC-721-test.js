// erc721 合约测试
const type = process.env.TYPE;
const project = process.env.PROJECT;

const {
  invokeContractByPayAsset,
  callContract,
  checkTransaction,
  createAccount,
  activateAccount,
  sendOperation,
} = require("./operation");


const loadContractAddress = require("../utils/loadContractAddress");

const { 
    CODE, 
    ISSUER
 } = require("../config/chain.config");

const {
  addressOne,
  privateKeyOne,
  addressTwo,
  privateKeyTwo,
  addressThree,
  privateKeyThree,
  addressFour,
  privateKeyFour,
  addressFive,
  privateKeyFive,
} = require("../config/accountAddress.config");

const contractAddress = loadContractAddress(project)[type];

async function callContractQuery(_input) {
  // optType  0: init, 1: main, 2: query
  const {
    result: { query_rets },
  } = await callContract({
    contractAddress,
    CODE,
    _input,
    optType: 2,
    addressOne,
  });

  if (query_rets && query_rets.length > 0) {
    const {
	  error,
      result,
    } = query_rets[0];

	if (error) {
		const { exception } = error.data;
		console.log(JSON.parse(exception));
		return;
	}
	if (result) {
		const tokens = JSON.parse(result.value);
		console.log(tokens);
		return;
	}
  }
}

async function queryByHash(hash) {
  const {
    result: { transactions },
  } = await checkTransaction(hash);
  const {
    error_desc,
    transaction: { operations },
  } = transactions[0];

  if (error_desc === "") {
    const {
      pay_asset: { dest_address },
    } = operations[0];
    console.log(`dest_address: ${dest_address} operations success`);
  } else {
    const exception = JSON.parse(error_desc).exception;

    if (Object.prototype.toString.call(exception) === "[object Object]") {
      const { error, message, data } = JSON.parse(
        JSON.parse(error_desc).exception
      );
      if (error !== 0) {
        console.log(message);
      } else {
        console.log(data);
      }
    } else {
      console.log(exception);
    }
  }
}

async function callContractMain(input, sourceAddress, privateKey) {
  const hash = await invokeContractByPayAsset({
    contractAddress,
    CODE,
    ISSUER,
    input,
    sourceAddress,
    privateKey,
  });

  queryByHash(hash);
}

// ----------------------------------------------- 智能合约接口 begin ---------------------------------

async function balanceOf() {
	
    const _input = JSON.stringify({
      method: "balanceOf",
      params: {
        owner: addressTwo,
      },
    });

	await callContractQuery(_input);
}
// balanceOf()


async function ownerOf() {
    const _input = JSON.stringify({
      method: "ownerOf",
      params: {
        tokenId: "XuejinXuejinGoog.0",
      },
    });

    await callContractQuery(_input);
}
// ownerOf()


async function getApproved() {
  // 查询 XuejinXuejinGoog.2 授权给哪个账户了
  const _input = JSON.stringify({
    method: "getApproved",
    params: {
      tokenId: "XuejinXuejinGoog.2",
    },
  });

  await callContractQuery(_input);
}
// getApproved()


async function approve() {
  // 授权之前
  // 可通过 queryAllToken 查询所有的 tokens
  // 把 XuejinXuejinGoog.2 授权给账户 addressThree
  const _input = JSON.stringify({
    method: "approve",
    params: {
      tokenId: "XuejinXuejinGoog.0",
      to: addressFour,
    },
  });

  await callContractMain(_input, addressTwo, privateKeyTwo);
}
// approve()


async function setApprovalForAll() {
  // 授权 addressThree 管理 addressTwo 的所有资产
    const _input = JSON.stringify({
      method: "setApprovalForAll",
      params: {
        operator: addressFour,
        approved: true,
      },
    });
    await callContractMain(_input, addressTwo, privateKeyTwo);

  // 禁用 addressThree 管理权
//   const _input = JSON.stringify({
//     method: "setApprovalForAll",
//     params: {
//       operator: addressThree,
//       approved: false,
//     },
//   });
//   await callContractMain(_input, addressTwo, privateKeyTwo);
}
// setApprovalForAll()


async function isApprovedForAll() {
  // 查询账户 addressThree 有没有通过账户 addressTwo 的授权
  const _input = JSON.stringify({
    method: "isApprovedForAll",
    params: {
      owner: addressTwo,
      operator: addressThree,
    },
  });

  await callContractQuery(_input);
}
// isApprovedForAll()


async function transferFrom() {
  // 交易之前
  // 可通过 queryAllToken 查询所有的 tokens
  // 可通过 ownerOf 查询转出地址有没有 token 所有权
  const _input = JSON.stringify({
    method: "transferFrom",
    params: {
      tokenId: "XuejinXuejinGoog.0",
      from: addressFive,
      to: addressThree,
    },
  });

  await callContractMain(_input, addressFive, privateKeyFive);
}
// transferFrom();


async function mint() {
	const _input = JSON.stringify({
    method: "mint",
    params: {
      to: addressTwo,
    },
  });

    await callContractMain(_input, addressOne, privateKeyOne);
}
// mint()

async function queryAllToken() {
    const _input = JSON.stringify({
      method: "queryTokens",
      params: {}
    });

	await callContractQuery(_input);
}
// queryAllToken();
