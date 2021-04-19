"use strict";
const log = Utils.log;
const assert = Utils.assert;
const timeStamp = Chain.block.timestamp;
const sender = Chain.msg.sender;

// 初始化数据
let _minter = JSON.parse(Chain.load("minter"));
let _owners = JSON.parse(Chain.load("owners"));
let _balances = JSON.parse(Chain.load("balances"));
let _tokenApprovals = JSON.parse(Chain.load("tokenApprovals"));
let _operatorApprovals = JSON.parse(Chain.load("operatorApprovals"));
let _tokens = JSON.parse(Chain.load("tokens"));

function unkonwOperate(invoker, operation) {
  return log(`[ ${invoker} ] Unknown operating ${operation}`);
}

function reject(invoker, msg) {
  return JSON.stringify({
    error: 1000,
    message: `ERROR::[${invoker}] ${msg}`,
    data: null
  });
}

function resolve(invoker, data) {
  return JSON.stringify({
    error: 0,
    message: `SUCCESS::[${invoker}] success`,
    data: data
  });
}

function saveObj(key, value) {
  let _value = JSON.stringify(value);
  Chain.store(key, _value);
  log(`Set key(${key}), value( ${_value} ) in metadata succeed.`);
}

// @notice 返回所有者
// @dev NFT 不能分配给零地址，查询零地址抛出异常
// @param _tokenId NFT 的id
// @return 返回所有者地址
function ownerOf({ tokenId }) {
  const owner = _owners[tokenId];

  assert(
    owner !== undefined,
    reject("ownerOf", "owner query for nonexistent token.")
  );

  return owner;
}

// 判断当前的所有者（或授权者、操作员）是否拥有该 `tokenId`
function _exists(tokenId) {
  if(_owners[tokenId] === undefined) {
    return false;
  } else {
    return true;
  }
}

// @notice 查询一个地址是否是另一个地址的授权操作员
// @param _owner 所有者
// @param _operator 代表所有者的授权操作员
function isApprovedForAll({ owner, operator }) {
  const _owner = _operatorApprovals[owner];

  assert(
    _owner !== undefined,
    reject("isApprovedForAll", "owner query for nonexistent token.")
  );

  const _operator = _owner[operator];

  assert(
    _operator !== undefined,
    reject("isApprovedForAll", "operator query for nonexistent token.")
  );

  return _operator;
}

// @notice 获取单个 NFT 的授权地址
// @dev 如果 `_tokenId` 无效，抛出异常。
// @param _tokenId ：  token id
// @return 返回授权地址， 零地址表示没有。
function getApproved({ tokenId }) {
  assert(
    _exists(tokenId),
    reject("getApproved", "approved query for nonexistent token.")
  );
  
  const tokenApprovals = _tokenApprovals[tokenId];

  assert(
    tokenApprovals !== undefined,
    reject("getApproved", "approved query for nonexistent token.")
  );

  return tokenApprovals;
}

// 判断 `msg.sender` 是不是当前的所有者（或授权者、操作员）
function _isApprovedOrOwner(spender, tokenId) {
    assert(
      _exists(tokenId),
      reject("_isApprovedOrOwner", "operator query for nonexistent token.")
    );

    const owner = ownerOf({ tokenId });

    // return spender === owner;
    return (
      spender === owner ||
      getApproved({ tokenId }) === spender ||
      isApprovedForAll(owner, spender)
    );
}

function _mint(to, tokenId) {
  if (_balances[to] === undefined) {
    _balances[to] = 1;
  } else {
    _balances[to] += 1;
  }
  
  _owners[tokenId] = to;

  _tokens.push(tokenId);

  saveObj("balances", _balances);
  saveObj("owners", _owners);
  saveObj("tokens", _tokens);
}

function mint({to}) {
  const index = _tokens.length;

  // 约定：token 格式为 [代号.索引]，如 X.4，第一个 token 为 X.0，后续发行 token 索引自增
  const newToken = `XuejinXuejinGoog.${index}`;

  // 接受 token 的地址不能为空
  assert(to !== "", reject("_mint", "mint to the zero address."));

  // 判断 token 是否已经存在
  assert(_exists(newToken) === false, reject("_mint", "token already minted."));

  // 只有创世账号才可以发行 token
  assert(
    sender === _minter,
    reject("_mint", "minter has no permission")
  );

  _mint(to, newToken);
}

// 查询已经发行的 token
function queryTokens() {
  return _tokens;
}

// 当任何 NFT 的所有权更改时（不管哪种方式），就会触发此事件。
// 包括在创建时（`from` == 0）和销毁时(`to` == 0), 合约创建时除外。
function _transfer(from, to, tokenId) {
    assert(to !== "", reject("_transfer", "transfer to the zero address."));
    assert(
      ownerOf({ tokenId }) === from,
      reject("_transfer", "transfer of token that is not own.")
    );
    // Clear approvals from the previous owner ?
    // _approve(address(0), tokenId);

    _balances[from] -= 1;
    
    if (_balances[to] === undefined) {
      _balances[to] = 1;
    } else {
      _balances[to] += 1;
    }
    _owners[tokenId] = to;

    saveObj("balances", _balances);
    saveObj("owners", _owners);
}

// @notice 将NFT的所有权从一个地址转移到另一个地址
// 如果`msg.sender` 不是当前的所有者（或授权者）抛出异常
// 如果 `_from` 不是所有者、`_to` 是零地址、`_tokenId` 不是有效id 均抛出异常。
// 当转移完成时，函数检查  `_to` 是否是合约，如果是，调用 `_to`的 `onERC721Received` 并且检查返回值是否是 `0x150b7a02` (即：`bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`)  如果不是抛出异常。
// @param _from ：当前的所有者
// @param _to ：新的所有者
// @param _tokenId ：要转移的token id.
// @param data : 附加额外的参数（没有指定格式），传递给接收者。
function safeTransferFrom(from, to, tokenId, data = "") {
    assert(
      _isApprovedOrOwner(sender, tokenId),
      reject("safeTransferFrom", "transfer caller is not owner nor approved.")
    );

    _transfer(from, to, tokenId);
}

// 当更改或确认 NFT 的授权地址时触发
// 零地址表示没有授权的地址
// 发生 `Transfer` 事件时，同样表示该 NFT 的授权地址（如果有）被重置为“无”（零地址）。
function _approve(to, tokenId) {
    const owner = ownerOf({ tokenId });

    _tokenApprovals[tokenId] = to;
    _owners[tokenId] = owner;
    
    saveObj("owners", _owners);
    saveObj("tokenApprovals", _tokenApprovals);
}

function approve({ to, tokenId }) {
  const owner = ownerOf({ tokenId });

  assert(to !== owner, reject("approve", "approval to current owner."));

  assert(
    sender === owner ||
      isApprovedForAll({ owner, operator: sender }),
    reject("approve", "approve caller is not owner nor approved for all.")
  );

  _approve(to, tokenId);
}

// @notice 启用或禁用第三方（操作员）管理 `msg.sender` 所有资产
// @dev 触发 ApprovalForAll 事件，合约必须允许每个所有者可以有多个操作员。
// @param _operator 要添加到授权操作员列表中的地址
// @param _approved True 表示授权, false 表示撤销]
function setApprovalForAll({ operator, approved }) {
  let approvedObj = {};

  approvedObj[operator] = approved;

  assert(
    operator !== sender,
    reject("setApprovalForAll", "approve is caller.")
  );

  _operatorApprovals[sender] = approvedObj;

  saveObj("operatorApprovals", _operatorApprovals);
}

// @notice 统计所持有的NFTs数量
// @dev NFT 不能分配给零地址，查询零地址同样会异常
// @param _owner ： 待查地址
// @return 返回数量，也许是0
function balanceOf({ owner }) {
  assert(
    owner !== "",
    reject("balanceOf", "balance query for the zero address.")
  );

  return _balances[owner];
}

// transferFrom
// 转移所有权 -- 调用者负责确认`_to`是否有能力接收NFTs，否则可能永久丢失。
// 如果`msg.sender` 不是当前的所有者（或授权者、操作员）抛出异常
// 如果 `_from` 不是所有者、`_to` 是零地址、`_tokenId` 不是有效id 均抛出异常。
function transferFrom({ from, to, tokenId }) {
  assert(to !== "", reject("transferFrom", "transfer to the zero address."));
  assert(
    _isApprovedOrOwner(sender, tokenId),
    reject("transferFrom", "transfer caller is not owner nor approved.")
  );

  _transfer(from, to, tokenId);
}

const QUERY_INTERFACE_MAP = new Map([
  ["balanceOf", balanceOf],
  ["ownerOf", ownerOf],
  ["getApproved", getApproved],
  ["queryTokens", queryTokens],
  ["isApprovedForAll", isApprovedForAll]
]);

const MAIN_INTERFACE_MAP = new Map([
  ["transferFrom", transferFrom],
  ["safeTransferFrom", safeTransferFrom],
  ["approve", approve],
  ["setApprovalForAll", setApprovalForAll],
  ["mint", mint]
]);

// 约定：只有创世账号可以发行和查询 token
function init() {
  saveObj("minter", "ulpi3r6xjCqtMfFr4Vf6v7v9e5ke3q6QaAHEjh");
  saveObj("tokens", []);
  saveObj("owners", {});
  saveObj("balances", {});
  saveObj("tokenApprovals", {});
  saveObj("operatorApprovals", {});
}

function query(input_str) {
  let inputObj = JSON.parse(input_str);
  let method = inputObj.method;
  let params = inputObj.params;
  let result = {};

  if (!QUERY_INTERFACE_MAP.has(method)) {
    throw unkonwOperate("query", method);
  }

  log("######      query      ######");

  result = QUERY_INTERFACE_MAP.get(method)(params);

  return JSON.stringify(result);
}

function main(input_str) {
  let inputObj = JSON.parse(input_str);
  let method = inputObj.method;
  let params = inputObj.params;
  
  if (!MAIN_INTERFACE_MAP.has(method)) {
    throw unkonwOperate("main", method);
  }

  log("######      main      ######");

  MAIN_INTERFACE_MAP.get(method)(params);
  
}
