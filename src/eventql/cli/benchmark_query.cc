/**
 * Copyright (c) 2016 DeepCortex GmbH <legal@eventql.io>
 * Authors:
 *   - Paul Asmuth <paul@eventql.io>
 *   - Laura Schlimmer <laura@eventql.io>
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License ("the license") as
 * published by the Free Software Foundation, either version 3 of the License,
 * or any later version.
 *
 * In accordance with Section 7(e) of the license, the licensing of the Program
 * under the license does not imply a trademark license. Therefore any rights,
 * title and interest in our trademarks remain entirely with us.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the license for more details.
 *
 * You can be released from the requirements of the license by purchasing a
 * commercial license. Buying such a license is mandatory as soon as you develop
 * commercial activities involving this program without disclosing the source
 * code of your own applications
 */
#include "eventql/eventql.h"
#include "eventql/cli/benchmark.h"
#include "eventql/transport/native/frames/query.h"
#include "eventql/transport/native/frames/error.h"

namespace eventql {
namespace cli {

ReturnCode benchmark_query(
    native_transport::TCPClient* conn,
    uint64_t sequence,
    const std::string& database,
    const std::string& payload) {
  auto query = payload;
  StringUtil::replaceAll(&query, "{{seq}}", StringUtil::toString(sequence));

  native_transport::QueryFrame q_frame;
  q_frame.setDatabase(database);
  q_frame.setQuery(query);

  auto rc = conn->sendFrame(&q_frame, 0);
  if (!rc.isSuccess()) {
    return rc;
  }

  uint16_t ret_opcode = 0;
  uint16_t ret_flags;
  std::string ret_payload;
  bool ret_done = false;
  while (!ret_done) {
    rc = conn->recvFrame(
        &ret_opcode,
        &ret_flags,
        &ret_payload,
        kMicrosPerSecond * 10); // FIXME

    if (!rc.isSuccess()) {
      return rc;
    }

    switch (ret_opcode) {
      case EVQL_OP_HEARTBEAT:
        continue;
      case EVQL_OP_QUERY_RESULT: {
        if (ret_flags & EVQL_ENDOFREQUEST) {
          ret_done = true;
        } else {
          auto rc = conn->sendFrame(EVQL_OP_QUERY_DISCARD, 0, nullptr, 0);
          if (!rc.isSuccess()) {
            return rc;
          }
        }

        continue;
      }
      case EVQL_OP_ERROR: {
        native_transport::ErrorFrame eframe;
        eframe.parseFrom(ret_payload.data(), ret_payload.size());
        return ReturnCode::error("ERUNTIME", eframe.getError());
      }
      default:
        return ReturnCode::error("ERUNTIME", "unexpected opcode");
    }
  }

  return ReturnCode::success();
  return ReturnCode::success();
}

} //cli
} //eventql

