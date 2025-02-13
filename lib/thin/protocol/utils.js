// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const constants = require('./constants');
const crypto = require('crypto');

class OutOfPacketsError extends Error { }

function _convertBase64(result, value, size, offset) {
  for (let i = 0;i < size;i++) {
    result[offset + size - i - 1] = constants.TNS_BASE64_ALPHABET_ARRAY[value & 0x3f];
    value = value >> 6;
  }
  return offset + size;
}

function encodeRowID(rowID) {
  let offset = 0;
  if (rowID.rba !== 0 || rowID.partitionID !== 0 || rowID.blockNum !== 0 || rowID.slotNum != 0) {
    const result = Buffer.alloc(constants.TNS_MAX_ROWID_LENGTH);
    offset = _convertBase64(result, rowID.rba, 6, offset);
    offset = _convertBase64(result, rowID.partitionID, 3, offset);
    offset = _convertBase64(result, rowID.blockNum, 6, offset);
    _convertBase64(result, rowID.slotNum, 3, offset);
    return result.toString('utf8');
  }
}

// obfuscate value and clear memory for Buffers as they are from Buffer pool
// and are possible to stay longer
function setObfuscatedValue(value) {
  const buf = crypto.randomBytes(Buffer.byteLength(value));
  const bytes = Buffer.from(value, 'utf8');
  const len = Buffer.byteLength(value);

  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(buf[i] ^ bytes[i]);
  }
  bytes.fill(0);
  return {obfuscatedValue : buf, value : arr};
}

// returns the Deobfuscated value, after removing the obfuscation
// and clear memory of temporary Buffers coming from Buffer pool
function getDeobfuscatedValue(value, obfuscatedValue) {
  const arr = [];
  for (let i = 0; i < value.length; i++) {
    arr.push(value[i] ^ obfuscatedValue[i]);
  }
  const buf = Buffer.from(arr);
  arr.fill(0);
  const retVal = buf.toString();
  buf.fill(0);
  return retVal;
}

module.exports = {
  encodeRowID,
  getDeobfuscatedValue,
  OutOfPacketsError,
  setObfuscatedValue
};
